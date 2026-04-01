FROM node:20 as builder
WORKDIR /app

# Install Bun
RUN npm install -g bun

# Install dependencies
COPY vttech-dashboard/package.json ./
RUN bun install

# Copy source
COPY vttech-dashboard/ .

# Inject Prisma Schema (since it's a symlink on host)
COPY backend-api/prisma/ ./prisma/

# Generate Prisma Client
RUN bun prisma generate

# Build Next.js app
ENV NODE_ENV=production
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/db
RUN bun run build

# Stage 2: Run with Bun
FROM oven/bun:latest
WORKDIR /app

# Copy all from builder
COPY --from=builder /app ./

# Expose port (Internal 5000)
EXPOSE 5000

# Start the app
CMD ["bun", "run", "start"]
