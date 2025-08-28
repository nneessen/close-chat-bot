FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies without cache to avoid EBUSY error
RUN npm ci --no-cache

# Copy source code
COPY . .

# Generate Prisma client and build
RUN npx prisma generate
RUN SKIP_ENV_VALIDATION=true npm run build:next

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]