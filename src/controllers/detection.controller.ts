import { DetectionService } from "../services/detection.service"

export class DetectionController {
  private service: DetectionService

  constructor(service: DetectionService) {
    this.service = service
  }

  async uploadImage(req: Request): Promise<Response> {
    const startTime = Date.now()
    try {

      // @ts-ignore - Bun supports formData, TypeScript warning can be ignored
      const formData = await req.formData()

      const file = formData.get("image") as File

      if (!file) {
        return new Response(JSON.stringify({ error: "No image file provided", code: "NO_IMAGE" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      }

      if (!file.type.startsWith("image/")) {
        return new Response(JSON.stringify({ error: "Invalid file type", code: "INVALID_FILE_TYPE" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      }


      const taskId = crypto.randomUUID()
      const fileExtension = file.name.split(".").pop() || "jpg"
      const fileName = `${taskId}.${fileExtension}`
      const filePath = `public/uploads/${fileName}`

      await Bun.write(filePath, file)

      const task = await this.service.createTask(taskId, filePath)

      return new Response(JSON.stringify({ taskId, status: task.status }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    } catch (error) {
      console.error(`❌ [Upload] Error after ${Date.now() - startTime}ms:`, error)
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : "Failed to upload image", code: "UPLOAD_FAILED" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }
  }

  async getStatus(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url)
      const taskId = url.pathname.split("/").pop()

      if (!taskId) {
        return new Response(JSON.stringify({ error: "Missing taskId", code: "MISSING_TASK_ID" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      }

      const task = await this.service.getTask(taskId)

      if (!task) {
        return new Response(JSON.stringify({ error: "Task not found", code: "TASK_NOT_FOUND" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }

      const response = {
        taskId: task.id,
        status: task.status,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        result: task.result,
        error: task.error,
      }

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : "Failed to get task status", code: "STATUS_FAILED" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }
  }
}
