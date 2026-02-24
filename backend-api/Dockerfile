FROM oven/bun:latest as base
WORKDIR /app

# Install dependencies
COPY backend-api/package.json ./
RUN bun install

# Copy source
COPY backend-api/ .

# Generate Prisma Client
RUN bun prisma generate

# Build the application
RUN bun run build

# Expose port (Internal 3001)
EXPOSE 3001

# Run the app
CMD ["bun", "run", "start:prod"]
