
export function getConfig() {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || "0.0.0.0";

  return { port, host };
}