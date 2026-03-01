

import { z } from "zod";

export const SummariesRequestSchema = z.object({
  tenantId: z.string().min(1),
  requestId: z.string().optional(),
  note: z.object({
    raw: z.string().min(1).max(20000) // padded allowance
  }),
  options: z
    .object({
      soap: z.boolean().default(true),
      plainLanguage: z.boolean().default(true),
      temperature: z.number().min(0).max(1).optional()
    })
    .optional()
});

export const SoapSummarySchema = z.object({
  subjective: z.string(),
  objective: z.string(),
  assessment: z.string(),
  plan: z.string()
});