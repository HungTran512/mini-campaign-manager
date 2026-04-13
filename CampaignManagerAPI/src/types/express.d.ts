declare global {
  namespace Express {
    interface Request {
      /** Set by JWT middleware after successful verification. */
      user?: { id: string };
    }
  }
}

export {};
