import type { Pool } from 'pg';

export type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: Date;
};

/** Port — persistence adapter can be swapped in tests (dependency inversion). */
export interface IAuthUserRepository {
  findByEmail(email: string): Promise<UserRow | null>;
  findById(id: string): Promise<UserRow | null>;
  createUser(input: { email: string; name: string; passwordHash: string }): Promise<UserRow>;
}

export class PgAuthUserRepository implements IAuthUserRepository {
  constructor(private readonly pool: Pool) {}

  async findByEmail(email: string): Promise<UserRow | null> {
    const res = await this.pool.query<UserRow>(
      `SELECT id, email::text AS email, name, password_hash, created_at
       FROM users WHERE email = lower(trim($1::text)) LIMIT 1`,
      [email],
    );
    return res.rows[0] ?? null;
  }

  async findById(id: string): Promise<UserRow | null> {
    const res = await this.pool.query<UserRow>(
      `SELECT id, email::text AS email, name, password_hash, created_at
       FROM users WHERE id = $1::uuid LIMIT 1`,
      [id],
    );
    return res.rows[0] ?? null;
  }

  async createUser(input: { email: string; name: string; passwordHash: string }): Promise<UserRow> {
    const res = await this.pool.query<UserRow>(
      `INSERT INTO users (email, name, password_hash)
       VALUES (lower(trim($1::text))::citext, $2, $3)
       RETURNING id, email::text AS email, name, password_hash, created_at`,
      [input.email, input.name, input.passwordHash],
    );
    const row = res.rows[0];
    if (!row) {
      throw new Error('Insert user returned no row');
    }
    return row;
  }
}
