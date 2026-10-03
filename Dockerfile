# Production Dockerfile for Autonomous Playwright Framework
FROM mcr.microsoft.com/playwright:v1.48.0-noble

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
COPY tsconfig*.json ./

# Install npm dependencies
RUN npm ci

# Copy source code and config
COPY . .

# Build TypeScript code
RUN npm run build

# Default entry point
ENTRYPOINT ["node", "dist/src/cli.js"]
CMD ["run", "--spec", "scenarios/purchase_flow.md"]
