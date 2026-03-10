# Use the official lightweight Node.js 20 image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package dependencies
COPY package.json package-lock.json ./

# Install dependencies strictly from lockfile for consistency
RUN npm ci --only=production

# Copy application code
COPY src ./src

# Expose the correct port
EXPOSE 3000

# Specify environment variable fallback
ENV PORT=3000
ENV LOG_LEVEL=info

# Start the server
CMD ["npm", "start"]
