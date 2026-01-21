export type TaskStatus = "pending" | "processing" | "completed" | "failed"

export type Gender = "male" | "female"

export interface DetectedPerson {
  age: number
  gender: Gender
  confidence: number
}

export interface DetectionResult {
  count: number
  persons: DetectedPerson[]
}

export interface DetectionTask {
  id: string
  status: TaskStatus
  imagePath: string
  result: DetectionResult | null
  error: string | null
  createdAt: number
  updatedAt: number
}
