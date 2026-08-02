/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { validateEnv } from '../src/server/config/env';

describe('Production Environment Validation Tests', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...origEnv };
    delete process.env.ENABLE_DEV_AUTH_BYPASS;
    delete process.env.ENABLE_DEV_DIAGNOSTICS;
    delete process.env.VITE_ENABLE_DEV_ADMIN;
  });

  it('should pass in development mode with defaults', () => {
    process.env.NODE_ENV = 'development';
    expect(() => validateEnv()).not.toThrow();
  });

  it('should throw when APP_URL is missing in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.APP_URL;
    process.env.ALLOWED_ORIGINS = 'https://app.meditradeafrica.org';
    process.env.FIREBASE_PROJECT_ID = 'test-project';

    expect(() => validateEnv()).toThrow(/APP_URL is required/);
  });

  it('should throw when ENABLE_DEV_AUTH_BYPASS is true in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_URL = 'https://meditradeafrica.org';
    process.env.ALLOWED_ORIGINS = 'https://meditradeafrica.org';
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.ENABLE_DEV_AUTH_BYPASS = 'true';

    expect(() => validateEnv()).toThrow(/ENABLE_DEV_AUTH_BYPASS cannot be set to 'true'/);
  });

  it('should throw when wildcard * origin is used in ALLOWED_ORIGINS in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_URL = 'https://meditradeafrica.org';
    process.env.ALLOWED_ORIGINS = '*';
    process.env.FIREBASE_PROJECT_ID = 'test-project';

    expect(() => validateEnv()).toThrow(/Wildcard origin '\*' is forbidden/);
  });

  it('should throw when MALWARE_SCANNER is clamav and host is missing', () => {
    process.env.NODE_ENV = 'development';
    process.env.MALWARE_SCANNER = 'clamav';
    delete process.env.CLAMAV_HOST;

    expect(() => validateEnv()).toThrow(/CLAMAV_HOST is required/);
  });

  it('should require durable storage in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_URL = 'https://meditradeafrica.org';
    process.env.ALLOWED_ORIGINS = 'https://meditradeafrica.org';
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.STORAGE_PROVIDER = 'local';
    process.env.MALWARE_SCANNER = 'clamav';
    process.env.CLAMAV_HOST = 'clamav.internal';
    process.env.CLAMAV_PORT = '3310';

    expect(() => validateEnv()).toThrow(/STORAGE_PROVIDER must be 'gcs'/);
  });

  it('should require ClamAV scanning in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_URL = 'https://meditradeafrica.org';
    process.env.ALLOWED_ORIGINS = 'https://meditradeafrica.org';
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.STORAGE_PROVIDER = 'gcs';
    process.env.GCS_BUCKET_NAME = 'private-bucket';
    process.env.MALWARE_SCANNER = 'basic';

    expect(() => validateEnv()).toThrow(/MALWARE_SCANNER must be 'clamav'/);
  });
});
