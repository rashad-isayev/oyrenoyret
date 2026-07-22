/**
 * Environment Configuration
 * 
 * Validates and exports environment variables.
 * All environment variables should be accessed through this module.
 * 
 * Security: Never expose sensitive values to the client.
 */

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url().optional(),
  /** Required in production for cron endpoints. */
  CRON_SECRET: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 32, 'CRON_SECRET must be at least 32 characters when set'),
  /** Optional secret for registration tokens (falls back to NEXTAUTH_SECRET when unset). */
  REGISTRATION_TOKEN_SECRET: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 32, 'REGISTRATION_TOKEN_SECRET must be at least 32 characters when set'),
  GUARDIAN_VERIFICATION_SECRET: z.string().min(32).optional(),
  RESEND_API_KEY: z.string().min(16).optional(),
  EMAIL_FROM: z
    .string()
    .email()
    .max(254)
    .refine((val) => !/[\r\n]/.test(val), 'EMAIL_FROM contains invalid characters')
    .optional(),
  R2_ACCOUNT_ID: z.string().regex(/^[a-f0-9]{32}$/i).optional(),
  R2_ACCESS_KEY_ID: z.string().min(16).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(24).optional(),
  R2_PRIVATE_BUCKET: z.string().min(3).optional(),
  R2_ENDPOINT: z.string().url().optional(),
  R2_DISCUSSIONS_PREFIX: z.string().optional(),
  R2_ANNOUNCEMENTS_PREFIX: z.string().optional(),
  R2_SPRINT_SUBMISSIONS_PREFIX: z.string().optional(),
  /** Upstash Redis REST endpoint for distributed rate limiting. */
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  /** Upstash Redis REST token for distributed rate limiting (recommended in production). */
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
}).refine(
  (env) => {
    const hasUrl = Boolean(env.UPSTASH_REDIS_REST_URL);
    const hasToken = Boolean(env.UPSTASH_REDIS_REST_TOKEN);
    return (hasUrl && hasToken) || (!hasUrl && !hasToken);
  },
  {
    message: 'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set together',
    path: ['UPSTASH_REDIS_REST_URL'],
  }
).superRefine((env, ctx) => {
  if (env.NODE_ENV !== 'production') return;
  const required: Array<keyof typeof env> = [
    'NEXTAUTH_URL',
    'REGISTRATION_TOKEN_SECRET',
    'GUARDIAN_VERIFICATION_SECRET',
    'CRON_SECRET',
    'RESEND_API_KEY',
    'EMAIL_FROM',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_PRIVATE_BUCKET',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
  ];
  for (const key of required) {
    if (!env[key]) ctx.addIssue({ code: 'custom', path: [key], message: `${key} is required in production` });
  }
  if (env.NEXTAUTH_URL) {
    const url = new URL(env.NEXTAUTH_URL);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      ctx.addIssue({ code: 'custom', path: ['NEXTAUTH_URL'], message: 'NEXTAUTH_URL must be an HTTPS origin in production' });
    }
  }
});

export type Env = z.infer<typeof envSchema>;

function getEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Invalid environment variables: ${issues}`);
    }
    throw error;
  }
}

export const env = getEnv();
