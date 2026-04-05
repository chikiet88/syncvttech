FROM oven/bun:latest as base
WORKDIR /app

# Copy package files
COPY backend-api/package.json ./
RUN bun install

# Copy source
COPY backend-api/ .

# Generate Prisma Client
RUN bun prisma generate

# Build the application
RUN bun run build

# Expose port (Internal 5001)
EXPOSE 5001

# Run the app
CMD ["bun", "run", "start:prod"]
