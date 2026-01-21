import { MongoClient, Db } from "mongodb"

let client: MongoClient | null = null
let db: Db | null = null

export async function connectToMongoDB(): Promise<Db> {
  if (db) {
    return db
  }

  const uri = process.env.DB_URL
  if (!uri) {
    throw new Error("DB_URL environment variable is not set")
  }

  try {
    client = new MongoClient(uri)
    await client.connect()
    db = client.db()
    console.log("✅ MongoDB connected successfully")
    return db
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error)
    throw error
  }
}

export async function closeMongoDBConnection(): Promise<void> {
  if (client) {
    await client.close()
    client = null
    db = null
    console.log("MongoDB connection closed")
  }
}

export function getDB(): Db {
  if (!db) {
    throw new Error("Database not initialized. Call connectToMongoDB first.")
  }
  return db
}
