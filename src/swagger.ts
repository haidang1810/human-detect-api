export const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Human Detection API",
    version: "1.0.0",
    description: "API for detecting humans in images using face detection",
    contact: {
      name: "API Support",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-API-KEY",
        description: "API key for authentication",
      },
    },
    schemas: {
      DetectedPerson: {
        type: "object",
        properties: {
          age: {
            type: "number",
            description: "Estimated age of the person",
            example: 25,
          },
          gender: {
            type: "string",
            enum: ["male", "female"],
            description: "Detected gender",
            example: "male",
          },
          confidence: {
            type: "number",
            description: "Confidence score (0-1)",
            example: 0.95,
          },
        },
      },
      DetectionResult: {
        type: "object",
        properties: {
          count: {
            type: "number",
            description: "Number of persons detected",
            example: 2,
          },
          persons: {
            type: "array",
            items: {
              $ref: "#/components/schemas/DetectedPerson",
            },
          },
        },
      },
      TaskResponse: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            format: "uuid",
            description: "Unique task identifier",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          status: {
            type: "string",
            enum: ["pending", "processing", "completed", "failed"],
            description: "Current task status",
            example: "pending",
          },
        },
      },
      TaskStatus: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            format: "uuid",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          status: {
            type: "string",
            enum: ["pending", "processing", "completed", "failed"],
            example: "completed",
          },
          createdAt: {
            type: "number",
            description: "Unix timestamp (ms)",
            example: 1704067200000,
          },
          updatedAt: {
            type: "number",
            description: "Unix timestamp (ms)",
            example: 1704067205000,
          },
          result: {
            $ref: "#/components/schemas/DetectionResult",
            nullable: true,
          },
          error: {
            type: "string",
            nullable: true,
            example: null,
          },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: {
            type: "string",
            description: "Error message",
          },
          code: {
            type: "string",
            description: "Error code",
          },
        },
      },
    },
  },
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
  paths: {
    "/health": {
      get: {
        summary: "Health check endpoint",
        description: "Check if the API is running and healthy",
        security: [],
        tags: ["Health"],
        responses: {
          "200": {
            description: "API is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "string",
                      example: "ok",
                    },
                    timestamp: {
                      type: "string",
                      format: "date-time",
                    },
                    service: {
                      type: "string",
                      example: "Human Detection API",
                    },
                    redis: {
                      type: "string",
                      enum: ["connected", "disconnected"],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/detect/upload": {
      post: {
        summary: "Upload image for human detection",
        description: "Upload an image file to detect humans. Returns a task ID for tracking progress.",
        tags: ["Detection"],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  image: {
                    type: "string",
                    format: "binary",
                    description: "Image file (JPEG, PNG, etc.)",
                  },
                },
                required: ["image"],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Task created successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TaskResponse",
                },
              },
            },
          },
          "400": {
            description: "Bad request (no image or invalid file type)",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
                examples: {
                  noImage: {
                    value: {
                      error: "No image file provided",
                      code: "NO_IMAGE",
                    },
                  },
                  invalidType: {
                    value: {
                      error: "Invalid file type",
                      code: "INVALID_FILE_TYPE",
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Missing API key",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
                example: {
                  error: "Missing API key",
                  code: "MISSING_API_KEY",
                  message: "Please provide X-API-KEY header",
                },
              },
            },
          },
          "403": {
            description: "Invalid API key",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
                example: {
                  error: "Invalid API key",
                  code: "INVALID_API_KEY",
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/api/detect/status/{taskId}": {
      get: {
        summary: "Get detection task status",
        description: "Retrieve the current status and results of a detection task",
        tags: ["Detection"],
        parameters: [
          {
            name: "taskId",
            in: "path",
            required: true,
            description: "Task ID returned from upload endpoint",
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          "200": {
            description: "Task status retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TaskStatus",
                },
              },
            },
          },
          "400": {
            description: "Missing task ID",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "401": {
            description: "Missing API key",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "403": {
            description: "Invalid API key",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "404": {
            description: "Task not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
                example: {
                  error: "Task not found",
                  code: "TASK_NOT_FOUND",
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
  },
}
