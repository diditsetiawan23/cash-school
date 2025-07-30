# Development-focused Dockerfile using Vite dev server
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies for development
RUN apk add --no-cache curl

# Copy package files first (for better caching)
COPY package*.json ./

# Remove package-lock.json to avoid npm optional dependencies bug
RUN rm -f package-lock.json

# Install all dependencies including dev dependencies
RUN npm install

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Change ownership to non-root user
RUN chown -R nextjs:nodejs /app
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5173/ || exit 1

# Expose port 5173 (Vite dev server default)
EXPOSE 5173

# Start Vite dev server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
