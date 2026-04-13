import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wraps async route handlers so rejected promises reach Express error middleware
 * (avoids duplicate try/catch in every route).
 */
export function asyncRoute(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}
