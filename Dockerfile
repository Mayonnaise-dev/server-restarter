FROM node:20-alpine

WORKDIR /app

RUN npm init -y && \
    npm install gamedig dotenv dockerode

# Copy the script
COPY restarter.mjs .

# Run the script
CMD ["node", "restarter.mjs"]