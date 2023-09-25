# Official node runtime as base image
FROM node:20 AS builder
WORKDIR /app

# Install app dependencies
COPY ./package*.json ./
RUN npm install

# Copy app code and prune dev dependencies
COPY ./src ./src
RUN rm -rf /app/src/tests
RUN npm prune --production

# Final image
FROM node:20
WORKDIR /app

# Copy build artifacts from builder stage
COPY --from=builder /app /app

# Copy .env file during developmet
# COMMENT OUT FOR PROD or VERSION CONTROL!
COPY ./.env ./.env

# Start service
CMD [ "node", "./src/server.js" ]