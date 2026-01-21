import { Db, Collection } from "mongodb"
import type { DetectionTask, TaskStatus, DetectionResult } from "../types/detection.types"

interface DetectionTaskDocument {
  _id: string
  status: TaskStatus
  imagePath: string
  result: DetectionResult | null
  error: string | null
  createdAt: number
  updatedAt: number
}

export class DetectionRepository {
  private collection: Collection<DetectionTaskDocument>

  constructor(db: Db) {
    this.collection = db.collection<DetectionTaskDocument>("detection_tasks")
    this.initDatabase()
  }

  private async initDatabase(): Promise<void> {
    // Create index for faster queries on updatedAt
    await this.collection.createIndex({ updatedAt: 1 })
  }

  async save(task: DetectionTask): Promise<void> {
    const doc: DetectionTaskDocument = {
      _id: task.id,
      status: task.status,
      imagePath: task.imagePath,
      result: task.result,
      error: task.error,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }

    await this.collection.updateOne(
      { _id: task.id },
      { $set: doc },
      { upsert: true }
    )
  }

  async findById(id: string): Promise<DetectionTask | null> {
    const doc = await this.collection.findOne({ _id: id })
    if (!doc) return null

    return {
      id: doc._id,
      status: doc.status,
      imagePath: doc.imagePath,
      result: doc.result,
      error: doc.error,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
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
    await this.collection.deleteOne({ _id: id })
  }

  async cleanOldTasks(maxAge: number): Promise<DetectionTask[]> {
    const now = Date.now()
    const cutoff = now - maxAge

    // Get tasks to be deleted (to return their image paths)
    const docs = await this.collection
      .find({ updatedAt: { $lt: cutoff } })
      .toArray()

    // Delete old tasks
    await this.collection.deleteMany({ updatedAt: { $lt: cutoff } })

    // Return deleted tasks with their image paths
    return docs.map(doc => ({
      id: doc._id,
      status: doc.status,
      imagePath: doc.imagePath,
      result: doc.result,
      error: doc.error,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }))
  }
}
