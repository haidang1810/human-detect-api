import Redis from "ioredis"
import { Database } from "bun:sqlite"
import { DetectionService } from "./services/detection.service"
import { DetectionController } from "./controllers/detection.controller"
import { setupDetectionRoutes } from "./routes/detection.routes"
import { validateApiKey } from "./middleware/auth.middleware"
import { createRateLimiter } from "./middleware/ratelimit.middleware"
import { swaggerSpec } from "./swagger"

// Initialize SQLite database
const db = new Database("detection.db", { create: true })
console.log("📦 SQLite database initialized")

// Initialize Redis for BullMQ
const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  db: 2
})

redis.on("error", (err) => {
  console.error("Redis connection error:", err)
})

redis.on("ready", () => {
  console.log("✅ Redis connected successfully")
})

const detectionService = new DetectionService(db, redis)
const detectionController = new DetectionController(detectionService)

// Rate limiter: 100 requests per minute per API key
const rateLimiter = createRateLimiter(redis, {
  windowMs: 60 * 1000,
  maxRequests: 100,
})

const MAX_TASK_AGE = 24 * 60 * 60 * 1000

process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down...")
  await detectionService.close()
  process.exit(0)
})

Bun.serve({
  port: process.env.PORT || 3000,
  development: process.env.NODE_ENV !== "production",
  fetch: async (req) => {
    const start = Date.now()

    try {
      const url = new URL(req.url)

      // Swagger UI
      if (url.pathname === "/api-docs" && req.method === "GET") {
        const html = await Bun.file("src/swagger-ui.html").text()
        return new Response(html, {
          headers: { "Content-Type": "text/html" },
        })
      }

      // Swagger JSON spec
      if (url.pathname === "/api-docs.json" && req.method === "GET") {
        return new Response(JSON.stringify(swaggerSpec), {
          headers: { "Content-Type": "application/json" },
        })
      }

      // Health check
      if (url.pathname === "/health" && req.method === "GET") {
        const duration = Date.now() - start
        console.log(`${req.method} ${url.pathname} 200 ${duration}ms`)
        return new Response(
          JSON.stringify({
            status: "ok",
            timestamp: new Date().toISOString(),
            service: "Human Detection API",
            redis: redis.status === "ready" ? "connected" : "disconnected",
          }),
          {
            headers: { "Content-Type": "application/json" },
          },
        )
      }

      const detectionRoutes = setupDetectionRoutes(detectionController)

      if (url.pathname === "/api/detect/upload" && req.method === "POST") {
        const authError = validateApiKey(req)
        if (authError) return authError

        // Rate limiting based on API key
        const apiKey = req.headers.get("x-api-key") || "anonymous"
        const rateLimitError = await rateLimiter.checkLimit(apiKey)
        if (rateLimitError) return rateLimitError

        const response = await detectionRoutes["/api/detect/upload"].POST(req)
        const duration = Date.now() - start
        console.log(`${req.method} ${url.pathname} ${response.status} ${duration}ms`)
        return response
      }

      if (url.pathname.startsWith("/api/detect/status/") && req.method === "GET") {
        const authError = validateApiKey(req)
        if (authError) return authError

        // Rate limiting based on API key
        const apiKey = req.headers.get("x-api-key") || "anonymous"
        const rateLimitError = await rateLimiter.checkLimit(apiKey)
        if (rateLimitError) return rateLimitError

        const response = await detectionRoutes["/api/detect/status/:taskId"].GET(req)
        const duration = Date.now() - start
        console.log(`${req.method} ${url.pathname} ${response.status} ${duration}ms`)
        return response
      }

      const duration = Date.now() - start
      console.log(`${req.method} ${url.pathname} 404 ${duration}ms`)
      return new Response(JSON.stringify({ error: "Not found", code: "NOT_FOUND" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    } catch (error) {
      const duration = Date.now() - start
      console.error(`${req.method} ${req.url} 500 ${duration}ms`, error)
      return new Response(JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }
  },
})

console.log("🚀 Starting Human Detection API...")
console.log("🔧 Warming up models...")

detectionService.warmup().then(() => {
  console.log("✅ Models loaded successfully")
  console.log(`📡 Human Detection API running on http://localhost:${process.env.PORT || 3000}`)
  console.log(`🏥 Health check: http://localhost:${process.env.PORT || 3000}/health`)
})

setInterval(() => {
  detectionService.cleanOldTasks(MAX_TASK_AGE)
}, 60 * 60 * 1000)
