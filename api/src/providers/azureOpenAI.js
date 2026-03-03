import OpenAI from "openai";
import { setTimeout as delay } from "node:timers/promises";

export function makeAzureOpenAIClient({ baseURL, apiKey }) {
  if (!baseURL) throw new Error("Missing AZURE_OPENAI_BASE_URL");
  if (!apiKey) throw new Error("Missing AZURE_OPENAI_API_KEY");
  return new OpenAI({ baseURL, apiKey });
}

export async function azureChatComplete({
  client,
  deploymentName,
  messages,
  temperature = 0.2,
  maxTokens = 800,
  timeoutMs = 25000,
  maxRetries = 2
}) {
  if (!deploymentName) throw new Error("Missing AZURE_DEPLOYMENT_NAME");

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const completion = await client.chat.completions.create(
        {
          model: deploymentName,
          messages,
          temperature,
          max_tokens: maxTokens
        },
        { signal: controller.signal }
      );

      const content = completion?.choices?.[0]?.message?.content ?? "";
      const usage = completion?.usage ?? null;
      return { content, usage, raw: completion };
    } catch (err) {
      const msg = String(err?.message || err);

      // Retry only on likely transient failures
      const isTimeout = msg.toLowerCase().includes("aborted") || msg.toLowerCase().includes("timeout");
      const isRateLimit = msg.includes("429");
      const isServiceUnavailable = msg.includes("503");

      if (attempt < maxRetries && (isTimeout || isRateLimit || isServiceUnavailable)) {
        await delay(400 * (attempt + 1));
        continue;
      }

      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}