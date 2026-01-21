# Use latest Bun image (based on Debian with modern CPU support)
FROM oven/bun:latest

# Install system dependencies for TensorFlow
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (without lockfile to avoid version conflicts)
RUN bun install --production

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p public/uploads

# Expose port
EXPOSE 3041

# Start the application
CMD ["bun", "run", "start"]
