FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Install 11ty and build dependencies
RUN npm install --save-dev @11ty/eleventy

# Copy application files
COPY . .

# Create presentations directory and copy default presentation
RUN mkdir -p /app/presentations
COPY presentations/default.* /app/presentations/
COPY presentations/README.md /app/presentations/

# Build the 11ty site
RUN npm run build

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Volume for presentations (persistent data)
VOLUME ["/app/presentations"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["npm", "start"]
