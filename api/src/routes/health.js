
export async function healthRoutes(app) {
  app.get("/health", async () => {
    return { ok: true };
  });

  app.get("/ready", async () => {
    return { ok: true };
  });
}