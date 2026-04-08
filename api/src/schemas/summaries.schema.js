

import { z } from "zod";

export const SummariesRequestSchema = z.object({
  tenantId: z.string().min(1).optional(),
  requestId: z.string().optional(),
  note: z.object({
    raw: z.string().min(1).max(20000) // padded allowance
  }),
  options: z
    .object({
      format: z.enum(["soap", "dap"]).default("soap"),
      plainLanguage: z.boolean().default(true),
      temperature: z.number().min(0).max(1).optional()
    })
    .optional()
});

export const SoapSummarySchema = z.object({
  subjective: z.string(),
  objective: z.string(),
  assessment: z.string(),
  plan: z.array(z.string())
});

export const DapSummarySchema = z.object({
  data: z.string(),
  assessment: z.string(),
  plan: z.array(z.string())
});