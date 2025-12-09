const config = {
  http: {
    port: parseInt(process.env.MCP_HTTP_PORT || "3000"),
    path: "/mcp",
  },
  build: {
    install: "npm ci",
    build: "npm run build",
    outputDir: "dist",
  },
  runtime: {
    start: "node dist/index.js",
  },
};

export default config;

