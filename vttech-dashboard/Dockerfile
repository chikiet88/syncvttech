FROM node:20-alpine as builder
WORKDIR /app

# Install dependencies
COPY vttech-dashboard/package.json vttech-dashboard/package-lock.json* ./
RUN npm install

# Copy source
COPY vttech-dashboard/ .

# Inject Prisma Schema
COPY backend-api/prisma/ ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js app
ENV NODE_ENV=production
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/db
ENV NEXT_PUBLIC_API_URL=https://apivttech.tazagroup.net
RUN npm run build

# Stage 2: Run with Bun
FROM oven/bun:latest
WORKDIR /app

# Copy all from builder
COPY --from=builder /app ./

# Expose port (Internal 5000)
EXPOSE 5000

# Start the app
CMD ["bun", "run", "start"]
