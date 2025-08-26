# Use Node.js LTS as the base image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the project (uncomment if using a build step like React/Vue/Next/etc.)
# RUN npm run build

# Expose the port (change this if your app uses a different port)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]