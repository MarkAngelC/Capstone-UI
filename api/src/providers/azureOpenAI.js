import OpenAI from "openai";

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
  maxTokens = 800
}) {
  if (!deploymentName) throw new Error("Missing AZURE_DEPLOYMENT_NAME");

  const completion = await client.chat.completions.create({
    model: deploymentName,
    messages,
    temperature,
    max_tokens: maxTokens
  });

  const content = completion?.choices?.[0]?.message?.content ?? "";
  const usage = completion?.usage ?? null;

  return { content, usage, raw: completion };
}