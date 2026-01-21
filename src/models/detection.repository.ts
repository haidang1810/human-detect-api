import { Database } from "bun:sqlite"
import type { DetectionTask } from "../types/detection.types"

export class DetectionRepository {
  private db: Database

  constructor(db: Database) {
    this.db = db
    this.initDatabase()
  }

  private initDatabase(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS detection_tasks (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        image_path TEXT NOT NULL,
        result TEXT,
        error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)

    // Create index for faster queries
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_updated_at ON detection_tasks(updated_at)
    `)
  }

  async save(task: DetectionTask): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO detection_tasks
      (id, status, image_path, result, error, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      task.id,
      task.status,
      task.imagePath,
      task.result ? JSON.stringify(task.result) : null,
      task.error,
      task.createdAt,
      task.updatedAt
    )
  }

  async findById(id: string): Promise<DetectionTask | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM detection_tasks WHERE id = ?
    `)

    const row = stmt.get(id) as any
    if (!row) return null

    return {
      id: row.id,
      status: row.status,
      imagePath: row.image_path,
      result: row.result ? JSON.parse(row.result) : null,
      error: row.error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  async updateStatus(
    id: string,
    status: DetectionTask["status"],
    result: DetectionTask["result"] | null = null,
    error: DetectionTask["error"] | null = null
  ): Promise<void> {
    const task = await this.findById(id)
    if (task) {
      task.status = status
      task.updatedAt = Date.now()
      if (result !== null) task.result = result
      if (error !== null) task.error = error
      await this.save(task)
    }
  }

  async delete(id: string): Promise<void> {
    const stmt = this.db.prepare(`
      DELETE FROM detection_tasks WHERE id = ?
    `)
    stmt.run(id)
  }

  async cleanOldTasks(maxAge: number): Promise<void> {
    const now = Date.now()
    const cutoff = now - maxAge

    const stmt = this.db.prepare(`
      DELETE FROM detection_tasks WHERE updated_at < ?
    `)
    stmt.run(cutoff)
  }
}
