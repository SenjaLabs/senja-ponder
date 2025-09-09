FROM node:18-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build if needed
RUN pnpm run codegen

# Expose port
EXPOSE 42069

# Start the application
CMD ["pnpm", "start"]
