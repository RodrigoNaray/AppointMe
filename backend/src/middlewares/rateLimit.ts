import { Request, Response, NextFunction } from 'express';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import logger from '../utils/logger';

type Preset = 'strict' | 'normal' | 'lax';

interface PresetConfig {
  prefix: string;
  limit: number;
  window: string;
}

const PRESETS: Record<Preset, PresetConfig> = {
  strict: { prefix: 'rl:strict', limit: 5, window: '15 m' },
  normal: { prefix: 'rl:normal', limit: 20, window: '15 m' },
  lax: { prefix: 'rl:lax', limit: 60, window: '15 m' }
};

const buildLimiter = (preset: Preset): Ratelimit | null => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const disabled = process.env.RATE_LIMIT_DISABLED === 'true';
  const isDev = process.env.NODE_ENV === 'development';

  if (disabled || isDev || !url || !token) {
    return null;
  }

  const config = PRESETS[preset];
  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(config.limit, config.window as `${number} ${'s' | 'm' | 'h'}`),
    prefix: config.prefix,
    analytics: false
  });
};

const cachedLimiters: Partial<Record<Preset, Ratelimit | null>> = {};

const getLimiter = (preset: Preset): Ratelimit | null => {
  if (!(preset in cachedLimiters)) {
    cachedLimiters[preset] = buildLimiter(preset);
  }
  return cachedLimiters[preset] ?? null;
};

export const __resetRateLimiterCache = (): void => {
  for (const key of Object.keys(cachedLimiters) as Preset[]) {
    delete cachedLimiters[key];
  }
};

const buildKey = (req: Request): string => {
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  return `${ip}:${req.method}:${req.path}`;
};

export const rateLimit = (preset: Preset = 'normal') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const limiter = getLimiter(preset);

    if (!limiter) {
      return next();
    }

    try {
      const { success, limit, remaining, reset } = await limiter.limit(buildKey(req));

      res.setHeader('X-RateLimit-Limit', limit.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', reset.toString());

      if (!success) {
        const retryAfter = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
        res.setHeader('Retry-After', retryAfter.toString());
        res.status(429).json({
          success: false,
          message: 'Demasiadas solicitudes. Por favor, intenta más tarde.',
          code: 'RATE_LIMIT_EXCEEDED'
        });
        return;
      }

      next();
    } catch (error) {
      logger.error({ error, preset, path: req.path }, 'Rate limit check failed; allowing request (fail-open)');
      next();
    }
  };
};
