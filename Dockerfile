# MCP server (stdio). Used by Glama and other registries to build and introspect the server.
FROM node:22-slim
# node-web-audio-api needs the ALSA runtime library
RUN apt-get update && apt-get install -y --no-install-recommends libasound2 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY . .
ENTRYPOINT ["node", "node/mcp.js"]
