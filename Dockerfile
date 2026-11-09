# MCP server (stdio). Used by Glama and other registries to build and introspect the server.
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY . .
ENTRYPOINT ["node", "node/mcp.js"]
