import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { IAuthUserRepository } from './auth.repository.js';
import type { LoginBody, RegisterBody } from './auth.schemas.js';
import { ConflictError, UnauthorizedError } from '../../http/errors.js';

const BCRYPT_COST = 12;

export type AuthServiceConfig = {
  jwtSecret: string;
  jwtExpiresIn: string;
};

/** Application use-cases for authentication (single place for hashing + token rules). */
export class AuthService {
  constructor(
    private readonly users: IAuthUserRepository,
    private readonly config: AuthServiceConfig,
  ) {}

  async register(body: RegisterBody): Promise<{ id: string; email: string; name: string; created_at: string }> {
    const passwordHash = await bcrypt.hash(body.password, BCRYPT_COST);
    try {
      const row = await this.users.createUser({
        email: body.email,
        name: body.name,
        passwordHash,
      });
      return {
        id: row.id,
        email: row.email,
        name: row.name,
        created_at: row.created_at.toISOString(),
      };
    } catch (err: unknown) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictError('Email already registered');
      }
      throw err;
    }
  }

  /** Mint a JWT for an existing user (e.g. register → session cookie, same shape as login). */
  issueAccessToken(userId: string): string {
    const signOptions = {
      expiresIn: this.config.jwtExpiresIn as SignOptions['expiresIn'],
    } satisfies SignOptions;
    return jwt.sign({ sub: userId }, this.config.jwtSecret, signOptions);
  }

  async login(body: LoginBody): Promise<{ user: { id: string; email: string; name: string } }> {
    const row = await this.users.findByEmail(body.email);
    if (!row) {
      throw new UnauthorizedError('Invalid credentials');
    }
    const ok = await bcrypt.compare(body.password, row.password_hash);
    if (!ok) {
      throw new UnauthorizedError('Invalid credentials');
    }
    return {
      user: { id: row.id, email: row.email, name: row.name },
    };
  }

  /** Current user for `GET /auth/me` (JWT `sub` already verified by middleware when used on protected route — here called after optional verify). */
  async getUserById(userId: string): Promise<{ id: string; email: string; name: string } | null> {
    const row = await this.users.findById(userId);
    if (!row) {
      return null;
    }
    return { id: row.id, email: row.email, name: row.name };
  }

  private isUniqueViolation(err: unknown): boolean {
    return typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505';
  }
}
