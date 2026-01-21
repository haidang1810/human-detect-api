import Redis from "ioredis"

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  message?: string
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  message: "Too many requests, please try again later",
}

export class RateLimiter {
  private redis: Redis
  private config: RateLimitConfig

  constructor(redis: Redis, config: Partial<RateLimitConfig> = {}) {
    this.redis = redis
    this.config = { ...defaultConfig, ...config }
  }

  async checkLimit(identifier: string): Promise<Response | null> {
    const key = `ratelimit:${identifier}`
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    try {
      // Remove old entries outside the time window
      await this.redis.zremrangebyscore(key, 0, windowStart)

      // Count requests in current window
      const requestCount = await this.redis.zcard(key)

      if (requestCount >= this.config.maxRequests) {
        // Get the oldest request timestamp to calculate reset time
        const oldestRequest: any = await this.redis.zrange(key, 0, 0, "WITHSCORES")
        const resetTime = oldestRequest.length > 1
          ? parseInt(oldestRequest[1]) + this.config.windowMs
          : now + this.config.windowMs

        const retryAfter = Math.ceil((resetTime - now) / 1000)

        return new Response(
          JSON.stringify({
            error: this.config.message,
            code: "RATE_LIMIT_EXCEEDED",
            retryAfter,
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": retryAfter.toString(),
              "X-RateLimit-Limit": this.config.maxRequests.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": resetTime.toString(),
            },
          }
        )
      }

      // Add current request
      await this.redis.zadd(key, now, `${now}-${Math.random()}`)

      // Set expiry on the key
      await this.redis.expire(key, Math.ceil(this.config.windowMs / 1000))

      // Rate limit not exceeded, add headers but allow request
      const remaining = this.config.maxRequests - requestCount - 1

      return null // null means request is allowed
    } catch (error) {
      console.error("Rate limiter error:", error)
      // On Redis error, allow the request (fail open)
      return null
    }
  }

  // Helper to add rate limit headers to successful responses
  getRateLimitHeaders(identifier: string): Promise<Record<string, string>> {
    return this.redis
      .zcard(`ratelimit:${identifier}`)
      .then((count) => {
        const remaining = Math.max(0, this.config.maxRequests - count)
        const resetTime = Date.now() + this.config.windowMs

        return {
          "X-RateLimit-Limit": this.config.maxRequests.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": resetTime.toString(),
        }
      })
      .catch(() => ({})) // Return empty object on error
  }
}

export function createRateLimiter(redis: Redis, config?: Partial<RateLimitConfig>): RateLimiter {
  return new RateLimiter(redis, config)
}
