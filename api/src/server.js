import "dotenv/config";
import Fastify from "fastify";
import { getConfig } from "./config.js";
import { healthRoutes } from "./routes/health.js";
import { summariesRoutes } from "./routes/summaries.js";
import { authPlugin } from "./middleware/auth.js";
import rateLimit from "@fastify/rate-limit";
import cors from "@fastify/cors";
import { randomUUID } from "node:crypto";

async function buildServer(config) {

  // if request came with a request id use that, otherwise generate a new one.
  const app = Fastify({
    logger: true,
    genReqId: (req) => {
      const incoming = req.headers["x-request-id"] || req.headers["x-correlation-id"];
      const id = (Array.isArray(incoming) ? incoming[0] : incoming);
      return id || randomUUID();
    }
  });

  // global error handler to catch unhandled errors and prevent leaking sensitive info
  app.setErrorHandler((error, req, reply) => {
    req.log.error(
      { err: { name: error?.name, message: error?.message }, requestId: req.id, tenantId: req.tenant?.tenantId },
      "unhandled error"
    );
    reply.code(500).send({
      requestId: req.id,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" }
    });
  });

  // add request id to response header
  app.addHook("onSend", async (req, reply) => {
    reply.header("x-request-id", req.id);
  });

  // allow browser clients (React dev server) to call this API.
  await app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-request-id", "x-correlation-id"]
  });

  // then authenticate the request
  await app.register(authPlugin, {
    tenantKeys: config.tenantKeys,
    allowPublicSummaries: config.auth.allowPublicSummaries,
    publicTenantId: config.auth.publicTenantId
  }); // register auth plugin with tenant keys and auth mode from config

  // next is rate limit
  await app.register(rateLimit, {
    max: config.rateLimit.max, //set in env, default 30
    timeWindow: config.rateLimit.timeWindow, //set in env, default "1 minute"
    keyGenerator: (req) => req.tenant?.tenantId || req.ip, 
    skip: (req) => req.url === "/health" || req.url === "/ready" // don't rate limit health checks
  });

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
    app.log.error({ err: { message: err?.message, name: err?.name } }, "server failed to start"); //specify fiend to avoid logging sensitive info that might be in the error object
    process.exit(1);
  }
}

start();