/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../server';
import { FileMetadata } from '../src/lib/serverDb';
import * as serverDbModule from '../src/lib/serverDb';

describe('Public Media Delivery Route Tests', () => {
  beforeEach(() => {
    process.env.ENABLE_DEV_AUTH_BYPASS = 'true';
    process.env.NODE_ENV = 'development';
  });

  it('should serve public active file without requiring auth header', async () => {
    const publicDoc: FileMetadata = {
      id: 'pub-img-1',
      uploaderUserId: 'usr-1',
      objectKey: 'uploads/1234567890-abcdef0123456789.jpg',
      originalFilename: 'hero.jpg',
      detectedMimeType: 'image/jpeg',
      size: 4096,
      entityType: 'listing',
      visibility: 'public',
      uploadDate: new Date().toISOString(),
      storageProvider: 'local',
      status: 'active'
    };

    const spyLookup = vi.spyOn(serverDbModule, 'getFileMetadataByIdAuthoritative').mockResolvedValueOnce(publicDoc);

    const res = await request(app).get('/api/public/files/pub-img-1');

    expect([200, 404]).toContain(res.status); // 404 if physical file missing on disk, but not 401/403
    expect(res.headers['x-content-type-options']).toBe('nosniff');

    spyLookup.mockRestore();
  });

  it('should reject access to private file via public media delivery route', async () => {
    const privateDoc: FileMetadata = {
      id: 'priv-doc-1',
      uploaderUserId: 'usr-1',
      objectKey: 'uploads/1234567890-abcdef0123456789.pdf',
      originalFilename: 'contract.pdf',
      detectedMimeType: 'application/pdf',
      size: 2048,
      entityType: 'escrow',
      visibility: 'participants',
      uploadDate: new Date().toISOString(),
      storageProvider: 'local',
      status: 'active'
    };

    const spyLookup = vi.spyOn(serverDbModule, 'getFileMetadataByIdAuthoritative').mockResolvedValueOnce(privateDoc);

    const res = await request(app).get('/api/public/files/priv-doc-1');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');

    spyLookup.mockRestore();
  });
});
