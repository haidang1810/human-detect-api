import type { DetectionController } from "../controllers/detection.controller"

export function setupDetectionRoutes(controller: DetectionController) {
  return {
    "/api/detect/upload": {
      POST: (req: Request) => controller.uploadImage(req),
    },
    "/api/detect/status/:taskId": {
      GET: (req: Request) => controller.getStatus(req),
    },
  }
}
