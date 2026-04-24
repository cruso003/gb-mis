import { z } from 'zod';

export const TriggerLisgisIngestSchema = z.object({
  fileKey: z.string().min(1),
  year: z.number().int().min(1990).max(2100),
  dataType: z.enum(['POPULATION', 'HIES', 'LABOUR_FORCE', 'DHS_TABULATION']),
  methodology: z.string().optional(),
  documentationObjectKey: z.string().optional(),
  replaceDatasetId: z.string().uuid().optional(),
});

export type TriggerLisgisIngestDto = z.infer<typeof TriggerLisgisIngestSchema>;

export const TriggerDhsIngestSchema = z.object({
  fileKey: z.string().min(1),
  surveyYear: z.number().int().min(1990).max(2100),
  indicatorMappingVersion: z.enum(['2019', '2013']),
  methodology: z.string().optional(),
  replaceDatasetId: z.string().uuid().optional(),
});

export type TriggerDhsIngestDto = z.infer<typeof TriggerDhsIngestSchema>;
