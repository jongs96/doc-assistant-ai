# Base image with Node.js
FROM node:20-slim

# Install Python and pip (required for pyhwp)
RUN apt-get update && apt-get install -y python3 python3-pip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set Python encoding to UTF-8 to handle Korean filenames correctly
ENV PYTHONIOENCODING=utf-8

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Install Python dependencies (pyhwp)
# node:20-slim is based on Debian Bookworm, which requires --break-system-packages for pip
RUN pip3 install --no-cache-dir pyhwp six --break-system-packages

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Expose port
EXPOSE 3001

# Start server
CMD ["npm", "run", "server"]
