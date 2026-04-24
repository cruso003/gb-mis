import { z } from 'zod';

export const RecordGrantSchema = z.object({
  grantCycle: z.string().min(1).max(50),
  amountLrd: z.number().positive(),
  amountUsd: z.number().positive(),
  disbursedAt: z.string().datetime(),
  partnerFintechTxnRef: z.string().max(200).optional(),
});

export type RecordGrantDto = z.infer<typeof RecordGrantSchema>;
