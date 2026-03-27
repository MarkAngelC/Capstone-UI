import fp from "fastify-plugin";

export const authPlugin = fp(async function authPlugin(app, opts) {
  const tenantKeys = opts?.tenantKeys || {};
  const allowPublicSummaries = Boolean(opts?.allowPublicSummaries);
  const configuredPublicTenantId = String(opts?.publicTenantId || "").trim();

  // Build reverse lookup: apiKey -> tenantId
  const keyToTenant = new Map();
  for (const [tenantId, keys] of Object.entries(tenantKeys)) {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const k of list) keyToTenant.set(String(k), tenantId);
  }

  //app.log.info({ tenants: Object.keys(tenantKeys), keysCount: keyToTenant.size }, "auth: plugin registered");

  app.addHook("preHandler", async (req, reply) => {
    // allow CORS preflight requests without auth
    if (req.method === "OPTIONS") return;

    // Allow unauthenticated health checks
    if (req.url === "/health" || req.url === "/ready") return;

    const auth = req.headers.authorization || "";
    const match = auth.match(/^Bearer\s+(.+)$/i);
    const apiKey = match ? match[1].trim() : "";

    if (!apiKey && allowPublicSummaries) {
      const fallbackTenantId =
        configuredPublicTenantId || Object.keys(tenantKeys)[0] || "";

      if (!fallbackTenantId) {
        reply.code(500).send({
          error: {
            code: "INTERNAL_ERROR",
            message: "Public summaries enabled but no tenant is configured"
          }
        });
        return;
      }

      req.tenant = { tenantId: fallbackTenantId };
      return;
    }

    if (!apiKey) {
      reply.code(401).send({
        error: { code: "UNAUTHORIZED", message: "Missing Authorization: Bearer <apiKey>" }
      });
      return;
    }

    const tenantId = keyToTenant.get(apiKey);
    if (!tenantId) {
      reply.code(401).send({
        error: { code: "UNAUTHORIZED", message: "Invalid API key" }
      });
      return;
    }

    req.tenant = { tenantId };
  });
});