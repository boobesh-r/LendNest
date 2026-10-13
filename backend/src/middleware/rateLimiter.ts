import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipRecords = new Map<string, RateLimitRecord>();

// Clean up stale records periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRecords.entries()) {
    if (now > record.resetTime) {
      ipRecords.delete(ip);
    }
  }
}, 60 * 1000);

export function authRateLimiter(
  maxRequests: number = 15,
  windowMs: number = 15 * 60 * 1000
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // In test environment, bypass rate limiter
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const now = Date.now();
    const record = ipRecords.get(ip);

    if (!record || now > record.resetTime) {
      ipRecords.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (record.count >= maxRequests) {
      const remainingMinutes = Math.ceil((record.resetTime - now) / 60000);
      return res.status(429).json({
        success: false,
        message: `Too many login/registration attempts. Please wait ${remainingMinutes} minute(s) before trying again.`,
      });
    }

    record.count++;
    next();
  };
}
