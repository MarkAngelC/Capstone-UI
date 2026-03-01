import { getConfig } from "../config.js";

export function authPlugin(app, _opts, done) {
  const { tenantKeys } = getConfig();

  // Build reverse lookup: apiKey -> tenantId
  const keyToTenant = new Map();
  for (const [tenantId, keys] of Object.entries(tenantKeys)) {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const k of list) keyToTenant.set(k, tenantId);
  }

  app.addHook("preHandler", async (req, reply) => {
    app.log.info({ url: req.url, hasAuth: Boolean(req.headers.authorization) }, "auth preHandler");
    
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

    // Attach resolved tenant to request
    req.tenant = { tenantId };
  });

  done();
}