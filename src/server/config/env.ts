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
  MALWARE_SCANNER: z.enum(["basic", "clamav"]).default("basic"),
  CLAMAV_HOST: z.string().optional(),
  CLAMAV_PORT: z.string().optional(),
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

  // Format validation when present
  if (env.APP_URL) {
    try {
      new URL(env.APP_URL);
    } catch {
      throw new Error(`CRITICAL_CONFIGURATION_FATAL: APP_URL '${env.APP_URL}' is not a valid URL!`);
    }
  }

  if (env.ALLOWED_ORIGINS) {
    const origins = env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
    for (const origin of origins) {
      if (origin !== '*') {
        try {
          new URL(origin);
        } catch {
          throw new Error(`CRITICAL_CONFIGURATION_FATAL: ALLOWED_ORIGINS entry '${origin}' is not a valid origin URL!`);
        }
      }
    }
  }

  if (env.MALWARE_SCANNER === 'clamav') {
    if (!env.CLAMAV_HOST) {
      throw new Error("CRITICAL_CONFIGURATION_FATAL: CLAMAV_HOST is required when MALWARE_SCANNER is 'clamav'!");
    }
    if (!env.CLAMAV_PORT) {
      throw new Error("CRITICAL_CONFIGURATION_FATAL: CLAMAV_PORT is required when MALWARE_SCANNER is 'clamav'!");
    }
  }

  // Strict production security guards
  if (env.NODE_ENV === "production") {
    if (!env.APP_URL) {
      throw new Error("CRITICAL_SECURITY_FATAL: APP_URL is required in production environment!");
    }
    if (!env.ALLOWED_ORIGINS) {
      throw new Error("CRITICAL_SECURITY_FATAL: ALLOWED_ORIGINS is required in production environment!");
    }

    const origins = env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
    if (origins.includes('*')) {
      throw new Error("CRITICAL_SECURITY_FATAL: Wildcard origin '*' is forbidden in ALLOWED_ORIGINS in production when credentials are supported!");
    }

    if (!env.FIREBASE_PROJECT_ID) {
      throw new Error("CRITICAL_SECURITY_FATAL: FIREBASE_PROJECT_ID is required in production environment!");
    }

    if (env.ENABLE_DEV_AUTH_BYPASS === "true") {
      throw new Error(
        "CRITICAL_SECURITY_FATAL: ENABLE_DEV_AUTH_BYPASS cannot be set to 'true' in production environment!"
      );
    }
    if (env.ENABLE_DEV_DIAGNOSTICS === "true") {
      throw new Error(
        "CRITICAL_SECURITY_FATAL: ENABLE_DEV_DIAGNOSTICS cannot be set to 'true' in production environment!"
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
