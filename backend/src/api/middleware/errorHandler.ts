import { Request, Response, NextFunction } from 'express';

/**
 * Structured application error.
 * statusCode:   HTTP status to send to the client.
 * userMessage:  Safe message for the client — must NOT contain internal details.
 * code:         Machine-readable error code for clients to handle.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly userMessage: string,
    public readonly code?: string
  ) {
    super(userMessage);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Log full details server-side only
  // Never log request body — may contain image data or credentials
  if (!(err instanceof AppError) || err.statusCode >= 500) {
    console.error('[ERROR]', {
      path: req.path,
      method: req.method,
      name: err.name,
      message: err.message,
    });
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.userMessage,
      ...(err.code ? { code: err.code } : {}),
    });
    return;
  }

  // Generic 500 — do not expose stack trace, internal message, or infrastructure details
  res.status(500).json({
    error: 'An unexpected error occurred. Please try again later.',
  });
}
