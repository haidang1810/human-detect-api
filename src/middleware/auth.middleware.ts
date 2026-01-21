export function validateApiKey(req: Request): Response | null {
  const apiKey = req.headers.get("X-API-KEY")
  const expectedApiKey = process.env.API_KEY

  if (!expectedApiKey) {
    console.warn("⚠️  API_KEY not set in environment variables")
    return null // Skip validation if API_KEY is not configured
  }

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "Missing API key",
        code: "MISSING_API_KEY",
        message: "Please provide X-API-KEY header"
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    )
  }

  if (apiKey !== expectedApiKey) {
    return new Response(
      JSON.stringify({
        error: "Invalid API key",
        code: "INVALID_API_KEY"
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    )
  }

  return null // Valid API key
}
