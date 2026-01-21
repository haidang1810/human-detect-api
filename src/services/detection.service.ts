import * as tf from "@tensorflow/tfjs"
import Human from "@vladmandic/human"
import { Queue, Worker } from "bullmq"
import Redis from "ioredis"
import { Database } from "bun:sqlite"
import type { DetectionTask, DetectedPerson, DetectionResult } from "../types/detection.types"
import { DetectionRepository } from "../models/detection.repository"

tf.setBackend("cpu")

const MAX_CONCURRENT_TASKS = 5
const JOB_TIMEOUT = 5 * 60 * 1000 // 5 minutes

export class DetectionService {
  private human: any
  private repository: DetectionRepository
  private queue: Queue
  private worker: Worker
  private redis: Redis

  constructor(db: Database, redis: Redis) {
    this.repository = new DetectionRepository(db)
    this.redis = redis

    // Reuse the existing Redis connection for BullMQ
    const redisOptions = {
      host: redis.options.host,
      port: redis.options.port,
      password: redis.options.password,
      db: redis.options.db,
      maxRetriesPerRequest: null,
    }
    this.human = new Human({
      backend: "tensorflow",
      modelBasePath: "file://models/",
      filter: { enabled: true },
      face: {
        enabled: true,
        detector: {
          rotation: true,
          maxDetected: 20,
          minConfidence: 0.5,
          return: true,
        },
        mesh: {
          enabled: true,
        },
        iris: { enabled: false },
        description: {
          enabled: true,
          minConfidence: 0.1,
        },
        emotion: { enabled: false },
      },
      body: { enabled: false },
      hand: { enabled: false },
      object: { enabled: false },
      segmentation: { enabled: false },
      gesture: { enabled: false },
    })

    this.queue = new Queue("detection", {
      connection: redisOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    })

    this.worker = new Worker(
      "detection",
      async (job) => {
        return this.processTask(job.data.taskId)
      },
      {
        connection: redisOptions,
        concurrency: MAX_CONCURRENT_TASKS,
        lockDuration: JOB_TIMEOUT,
        stalledInterval: 30000,
        maxStalledCount: 1,
      },
    )

    this.worker.on("completed", (job) => {
      console.log(`✅ Task ${job.id} completed`)
    })

    this.worker.on("failed", (job, err) => {
      console.error(`❌ Task ${job?.id} failed:`, err)
      if (job) {
        this.repository.updateStatus(job.data.taskId, "failed", null, err.message)
      }
    })
  }

  async warmup(): Promise<void> {
    await this.human.load()
    await this.human.warmup()
  }

  async getTask(id: string): Promise<DetectionTask | null> {
    return await this.repository.findById(id)
  }

  async createTask(id: string, imagePath: string): Promise<DetectionTask> {
    const startTime = Date.now()

    const task: DetectionTask = {
      id,
      status: "pending",
      imagePath,
      result: null,
      error: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    await this.repository.save(task)

    await this.queue.add("process", { taskId: id })
    console.log(`⏱️  [Service] Queue add completed: ${Date.now() - startTime}ms`)

    return task
  }

  private async processTask(id: string): Promise<void> {
    const task = await this.repository.findById(id)
    if (!task) {
      throw new Error("Task not found")
    }

    try {
      await this.repository.updateStatus(id, "processing")

      // Read image from file
      const file = Bun.file(task.imagePath)
      const imageBuffer = await file.arrayBuffer()
      const imageData = new Uint8Array(imageBuffer)

      const result = await this.detectFaces(imageData)
      await this.repository.updateStatus(id, "completed", result)

      // Clean up image file after successful processing
      await this.cleanupImageFile(task.imagePath)
    } catch (error) {
      await this.repository.updateStatus(id, "failed", null, error instanceof Error ? error.message : "Unknown error")
      // Clean up image file even on failure
      await this.cleanupImageFile(task.imagePath)
      throw error
    }
  }

  private async cleanupImageFile(imagePath: string): Promise<void> {
    try {
      const fs = require("fs").promises
      await fs.unlink(imagePath)
      console.log(`🗑️  Cleaned up image file: ${imagePath}`)
    } catch (error) {
      console.warn(`⚠️  Failed to delete image file ${imagePath}:`, error)
    }
  }

  private async detectFaces(imageData: Uint8Array): Promise<DetectionResult> {
    const tensor = this.human.tf.tidy(() => {
      const decode = this.human.tf.node.decodeImage(imageData, 3)
      let expand
      if (decode.shape[2] === 4) {
        const channels = this.human.tf.split(decode, 4, 2)
        const rgb = this.human.tf.stack([channels[0], channels[1], channels[2]], 2)
        expand = this.human.tf.reshape(rgb, [1, decode.shape[0], decode.shape[1], 3])
      } else {
        expand = this.human.tf.expandDims(decode, 0)
      }
      const cast = this.human.tf.cast(expand, "float32")
      return cast
    })

    const result = await this.human.detect(tensor, { enableFace: true })
    this.human.tf.dispose(tensor)

    const persons: DetectedPerson[] = []
    const faces = result?.face || []

    for (const face of faces) {
      const age = face.age || 0
      const genderScore = face.genderScore || 0
      const gender = face.gender === "male" ? "male" : "female"
      persons.push({
        age,
        gender,
        confidence: genderScore,
      })
    }

    return {
      count: persons.length,
      persons,
    }
  }

  async cleanOldTasks(maxAge: number): Promise<void> {
    const deletedTasks = await this.repository.cleanOldTasks(maxAge)

    // Clean up image files for deleted tasks
    for (const task of deletedTasks) {
      await this.cleanupImageFile(task.imagePath)
    }

    if (deletedTasks.length > 0) {
      console.log(`🧹 Cleaned up ${deletedTasks.length} old tasks and their image files`)
    }
  }

  async close(): Promise<void> {
    await this.queue.close()
    await this.worker.close()
    await this.redis.quit()
  }
}
