# Use official Bun image (based on Debian with modern CPU support)
FROM oven/bun:1.1-debian

# Install system dependencies for TensorFlow
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --production

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p public/uploads

# Expose port
EXPOSE 3041

# Start the application
CMD ["bun", "run", "start"]
