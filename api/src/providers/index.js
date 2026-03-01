import { makeAzureOpenAIClient, azureChatComplete } from "./azureOpenAI.js";

export function makeLLMProvider(config) {
  const provider = config.llm?.provider || "azure";

  if (provider === "azure") {
    const client = makeAzureOpenAIClient({
      baseURL: config.llm.azureOpenAI.baseURL,
      apiKey: config.llm.azureOpenAI.apiKey
    });

    return {
      name: "azure",
      async chatComplete({ messages, temperature, maxTokens }) {
        return azureChatComplete({
          client,
          deploymentName: config.llm.azureOpenAI.deploymentName,
          messages,
          temperature,
          maxTokens
        });
      }
    };
  }

  //if (provider === "something-else") {}

  throw new Error(`Unsupported LLM_PROVIDER: ${provider}`);
}