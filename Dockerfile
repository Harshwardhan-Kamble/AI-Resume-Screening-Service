# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

# Install system dependencies for node-gyp and ONNX runtime
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Stage 2: Production
FROM node:20-slim AS runner

WORKDIR /app

# Install libgomp1 for ONNX runtime in the runner stage
RUN apt-get update && apt-get install -y \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy only production necessities
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prompts ./prompts

# Create uploads directory
RUN mkdir -p uploads

# The entrypoint will be defined in docker-compose
EXPOSE 3000

ENV NODE_ENV=production
