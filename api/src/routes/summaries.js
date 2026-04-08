
import { getConfig } from "../config.js";
import { makeLLMProvider } from "../providers/index.js";
import { SOAP_JSON_SYSTEM_PROMPT, DAP_JSON_SYSTEM_PROMPT, PLAIN_SYSTEM_PROMPT } from "../prompts/system.js";
import { SummariesRequestSchema, SoapSummarySchema, DapSummarySchema } from "../schemas/summaries.schema.js";


export async function summariesRoutes(app) {


  app.post("/v1/summaries", async (req, reply) => {
    const config = getConfig();

    // available formats, can be extended in the future with additional structured formats
    const SUMMARY_FORMATS = {
      soap: {
        prompt: SOAP_JSON_SYSTEM_PROMPT,
        schema: SoapSummarySchema,
        maxTokens: config.generation.soapMaxTokens
      },
      dap: {
        prompt: DAP_JSON_SYSTEM_PROMPT,
        schema: DapSummarySchema,
        maxTokens: config.generation.dapMaxTokens ?? config.generation.soapMaxTokens
      }
    };

    let llm;
    try {
      llm = makeLLMProvider(config);
    } catch (e) {
      return reply.code(503).send({
        requestId: req.id,
        error: {
          code: "LLM_NOT_CONFIGURED",
          message: String(e?.message || e)
        }
      });
    }

    const t0 = Date.now(); //start timer for latency
    const requestId = req.id;

    const parsed = SummariesRequestSchema.safeParse(req.body);
    if (!parsed.success) {

      //check if raw note it too long
      const tooLarge = parsed.error.issues.some(
        (i) => i.path?.join(".") === "note.raw" && i.code === "too_big"
      );
      if (tooLarge) {
        return reply.code(413).send({
          requestId,
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: "note.raw exceeds maximum allowed length"
          }
        });
      }

      //catch all other errors
      return reply.code(400).send({
        requestId,
        error: {
          code: "BAD_REQUEST",
          message: "Invalid request body",
          details: parsed.error.issues
        }
      });
    }

    const { tenantId: tenantIdFromBody, note, options } = parsed.data;
    const format = options?.format ?? "soap"; //soap, dap, or additional formats in the future
    const selectedFormat = SUMMARY_FORMATS[format];


    const tenantId = req.tenant?.tenantId; // derived from API key
    if (!tenantId) {
      // if auth hook failed to stop the request this will catch it.  we
      // expect the plugin to have already returned 401, but 500 was showing
      // up because the handler executed with no tenant attached.
      return reply.code(401).send({
        requestId,
        error: { code: "UNAUTHORIZED", message: "Missing or invalid API key" }
      });
    }

    // allow tenantId in body for debugging, but enforce match if present
    if (tenantIdFromBody && tenantIdFromBody !== tenantId) {
      return reply.code(403).send({
        requestId,
        error: { code: "FORBIDDEN", message: "tenantId does not match API key" }
      });
    }

    // Hard enforce low temperature server-side
    const temperature = Math.min(options?.temperature ?? 0.2, 0.2);

    // build the prompt using the raw note and system prompt/instruction
    const messages = [
      { role: "system", content: selectedFormat.prompt },
      { role: "user", content: note.raw }
    ];


    // call the LLM to get the clinical summary in JSON format
    let clinicalJsonText = "";
    let usage = null;
    try {
      const result = await llm.chatComplete({
        messages,
        temperature,
        maxTokens: selectedFormat.maxTokens,
        timeoutMs: config.llmRuntime.timeoutMs,
        maxRetries: config.llmRuntime.maxRetries
      });

      clinicalJsonText = result.content;
      usage = result.usage;
    } catch (e) {
      return reply.code(502).send({
        requestId,
        error: { code: "LLM_UPSTREAM_ERROR", message: String(e?.message || e) }
      });
    }

    // attempt to parse the JSON output from the model
    let clinicalObj;
    try {
      clinicalObj = JSON.parse(clinicalJsonText);
    } catch {
      return reply.code(502).send({
        requestId,
        error: {
          code: "LLM_BAD_OUTPUT",
          message: "Model did not return valid JSON",
          raw: clinicalJsonText.slice(0, 500)
        }
      });
    }

    // validate the JSON output against our expected schema
    let clinicalValidated;
    try {
      clinicalValidated = selectedFormat.schema.parse(clinicalObj);
    } catch (e) {
      return reply.code(502).send({
        requestId,
        error: {
          code: "LLM_BAD_OUTPUT",
          message: "Model JSON did not match expected schema"
        }
      });
    }

    // OPTIONAL: call the LLM to get the plain language summary in TEXT format
    let plainText = null;
    let usagePlain = null;

    if (options?.plainLanguage !== false) {
      const plainMessages = [
        { role: "system", content: PLAIN_SYSTEM_PROMPT },
        { role: "user", content: note.raw }
      ];

      try {
        const resultPlain = await llm.chatComplete({
          messages: plainMessages,
          temperature,
          maxTokens: config.generation.plainMaxTokens,
          timeoutMs: config.llmRuntime.timeoutMs,
          maxRetries: config.llmRuntime.maxRetries
        });

        plainText = resultPlain.content;
        usagePlain = resultPlain.usage;
      } catch (e) {
        return reply.code(502).send({
          requestId,
          error: { code: "LLM_UPSTREAM_ERROR", message: `Plain summary failed: ${String(e?.message || e)}` }
        });
      }
    }


    return {
      requestId,
      tenantId,
      outputs: {
        format,
        clinicalSummary: clinicalValidated,
        plainLanguageSummary: options?.plainLanguage === false ? null : plainText
      },
      metadata: {
        model: "azure",
        latencyMs: Date.now() - t0,
        usage: { clinical: usage, plain: usagePlain }
      }
    };
  });
}