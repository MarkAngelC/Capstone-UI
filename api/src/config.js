
export function getConfig() {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || "0.0.0.0";

  const tenantKeysJson = process.env.TENANT_KEYS_JSON || "{}";
  let tenantKeys = {};

  try {
    tenantKeys = JSON.parse(tenantKeysJson);
  } catch {
    tenantKeys = {};
  }

  return { port, host, tenantKeys };
}