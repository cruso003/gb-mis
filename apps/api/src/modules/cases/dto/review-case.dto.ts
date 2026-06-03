import { z } from 'zod';

/**
 * Supervisor approval payload. Notes are optional — a supervisor who
 * approves with no concerns doesn't need to fill in a comment.
 */
export const ApproveCaseSchema = z.object({
  notes: z.string().trim().max(2000).optional(),
});
export type ApproveCaseDto = z.infer<typeof ApproveCaseSchema>;

/**
 * Supervisor return-for-revision payload. Notes are required and
 * non-empty so the case worker has something concrete to address;
 * an empty return is the worst kind of feedback.
 */
export const ReturnCaseSchema = z.object({
  notes: z.string().trim().min(1, 'Notes are required when returning a case for revision').max(2000),
});
export type ReturnCaseDto = z.infer<typeof ReturnCaseSchema>;
