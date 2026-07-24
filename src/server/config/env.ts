/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_URL: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  STORAGE_PROVIDER: z.enum(["local", "gcs"]).default("local"),
  GCS_BUCKET_NAME: z.string().optional(),
  ENABLE_DEV_AUTH_BYPASS: z.string().optional(),
  ENABLE_DEV_DIAGNOSTICS: z.string().optional(),
  VITE_ENABLE_DEV_ADMIN: z.string().optional()
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Environment Validation Failed:", parsed.error.format());
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }

  const env = parsed.data;

  // Strict production security guards
  if (env.NODE_ENV === "production") {
    if (env.ENABLE_DEV_AUTH_BYPASS === "true") {
      throw new Error(
        "CRITICAL_SECURITY_FATAL: ENABLE_DEV_AUTH_BYPASS cannot be set to 'true' in production environment!"
      );
    }
    if (env.VITE_ENABLE_DEV_ADMIN === "true") {
      throw new Error(
        "CRITICAL_SECURITY_FATAL: VITE_ENABLE_DEV_ADMIN cannot be set to 'true' in production environment!"
      );
    }
    if (env.STORAGE_PROVIDER === "gcs" && !env.GCS_BUCKET_NAME) {
      throw new Error(
        "CRITICAL_CONFIGURATION_FATAL: GCS_BUCKET_NAME is required when STORAGE_PROVIDER is set to 'gcs'!"
      );
    }
  }

  return env;
}
