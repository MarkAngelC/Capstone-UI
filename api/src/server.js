import "dotenv/config";
import Fastify from "fastify";
import { getConfig } from "./config.js";
import { healthRoutes } from "./routes/health.js";
import { summariesRoutes } from "./routes/summaries.js";

async function buildServer(config) {
  const app = Fastify({ logger: true });

  // ---- Auth hook (direct) ----
  const { tenantKeys } = config;
  const keyToTenant = new Map();

  for (const [tenantId, keys] of Object.entries(tenantKeys)) {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const k of list) keyToTenant.set(String(k), tenantId);
  }

  app.addHook("preHandler", async (req, reply) => {
    // Allow unauthenticated health checks
    if (req.url === "/health" || req.url === "/ready") return;

    const auth = req.headers.authorization || "";
    const match = auth.match(/^Bearer\s+(.+)$/i);
    const apiKey = match ? match[1].trim() : "";

    if (!apiKey) {
      return reply.code(401).send({
        error: { code: "UNAUTHORIZED", message: "Missing Authorization: Bearer <apiKey>" }
      });
    }

    const tenantId = keyToTenant.get(apiKey);
    if (!tenantId) {
      return reply.code(401).send({
        error: { code: "UNAUTHORIZED", message: "Invalid API key" }
      });
    }

    req.tenant = { tenantId };
  });
  // ----------------------------

  await app.register(healthRoutes);
  await app.register(summariesRoutes);

  return app;
}

async function start() {
  const config = getConfig();
  const app = await buildServer(config);

  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`Server listening on http://${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();