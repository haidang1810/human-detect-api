# Human Detection API with Bun.js

AI-powered human detection API using TensorFlow.js and MediaPipe for real-time face detection and analysis.

## Features

- **Real-time Human Detection**: Face detection using TensorFlow.js and MediaPipe
- **Async Processing**: Queue-based image processing with BullMQ and Redis
- **Task Management**: Track detection tasks with status updates
- **API Documentation**: Interactive Swagger UI documentation
- **Type Safety**: Full TypeScript support
- **Layered Architecture**: Clean separation of concerns

## Tech Stack

- **Runtime**: Bun.js
- **AI/ML**: TensorFlow.js, MediaPipe Face Detection/Mesh, @vladmandic/human
- **Queue**: BullMQ with Redis
- **Database**: SQLite
- **API Docs**: Swagger UI

## Project Structure

```
src/
├── types/          # TypeScript type definitions
├── models/         # Data access layer (Repository pattern)
├── services/       # Business logic and AI model integration
├── controllers/    # HTTP request handlers
├── routes/         # Route definitions
├── middleware/     # Authentication middleware
└── swagger.ts      # API documentation config
```

## Architecture

### Layered Architecture

1. **Types** - TypeScript interfaces and types
2. **Models/Repository** - Data access, database operations
3. **Services** - Business logic, AI model orchestration, queue management
4. **Controllers** - HTTP request/response handling
5. **Routes** - URL routing configuration
6. **Middleware** - Authentication and request validation

### Design Patterns

- **Repository Pattern**: Data access abstraction
- **Dependency Injection**: Loose coupling between layers
- **Queue Pattern**: Async task processing with BullMQ
- **Separation of Concerns**: Each layer has a single responsibility

## Installation

```bash
bun install
```

## Environment Variables

Create a `.env` file in the root directory:

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# API Security
API_KEY=your-secret-api-key

# Environment
NODE_ENV=development
```

## Run

```bash
# Development mode with hot reload
bun run dev

# Production mode
bun run start
```

## Build

```bash
# Bundle to JS
bun run build

# Compile to executable
bun run build:compile
```

## Run Tests

```bash
bun test
```

## API Endpoints

### API Documentation
```bash
# Swagger UI
open http://localhost:3000/api-docs
```

### Health Check
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-21T10:00:00.000Z",
  "service": "Human Detection API",
  "redis": "connected"
}
```

### Upload Image for Detection
```bash
curl -X POST http://localhost:3000/api/detect/upload \
  -H "X-API-Key: your-secret-api-key" \
  -F "image=@/path/to/image.jpg"
```

Response:
```json
{
  "taskId": "task_abc123",
  "status": "pending",
  "message": "Image uploaded successfully. Processing started."
}
```

### Check Detection Status
```bash
curl http://localhost:3000/api/detect/status/task_abc123 \
  -H "X-API-Key: your-secret-api-key"
```

Response (Processing):
```json
{
  "taskId": "task_abc123",
  "status": "processing",
  "progress": 50
}
```

Response (Completed):
```json
{
  "taskId": "task_abc123",
  "status": "completed",
  "result": {
    "detected": true,
    "faces": 2,
    "confidence": 0.95,
    "details": { ... }
  },
  "processingTime": 1234
}
```

## Authentication

All API endpoints (except `/health` and `/api-docs`) require API key authentication.

Include the API key in the request header:
```
X-API-Key: your-secret-api-key
```

## Processing Flow

1. Client uploads image via `/api/detect/upload`
2. API validates request and creates a task
3. Task is queued in BullMQ for async processing
4. Worker processes the image using AI models
5. Results are stored in SQLite
6. Client polls `/api/detect/status/:taskId` for results

## Task Lifecycle

- **pending**: Task created, waiting in queue
- **processing**: AI model is analyzing the image
- **completed**: Detection finished, results available
- **failed**: Error occurred during processing

Old tasks (>24 hours) are automatically cleaned up every hour.

## Benefits

1. **Async Processing**: Non-blocking image analysis with queue system
2. **Scalable**: Queue-based architecture allows horizontal scaling
3. **Type Safe**: Full TypeScript support
4. **Well Documented**: Interactive Swagger API documentation
5. **Clean Architecture**: Easy to maintain and extend
6. **Production Ready**: Built with Bun.js for optimal performance
