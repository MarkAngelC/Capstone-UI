
import Fastify from "fastify";
import { getConfig } from "./config.js";
import { healthRoutes } from "./routes/health.js";

import { summariesRoutes } from "./routes/summaries.js";


async function buildServer() {
  const app = Fastify({
    logger: true
  });

  await app.register(healthRoutes);
  await app.register(summariesRoutes);  

  return app;
}

async function start() {
  const { port, host } = getConfig();
  const app = await buildServer();

  try {
    await app.listen({ port, host });
    app.log.info(`Server listening on http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();