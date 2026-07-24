/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../server';
import { saveFileMetadata, FileMetadata, MetadataUnavailableError } from '../src/lib/serverDb';
import * as serverDbModule from '../src/lib/serverDb';

describe('Download Security & Authorization Tests', () => {
  beforeEach(() => {
    process.env.ENABLE_DEV_AUTH_BYPASS = 'true';
    process.env.NODE_ENV = 'development';
  });

  it('should reject unauthenticated request to GET /api/files/:fileId/download', async () => {
    const res = await request(app).get('/api/files/file-123/download');
    expect(res.status).toBe(401);
  });

  it('should return 404 for non-existent file ID', async () => {
    const res = await request(app)
      .get('/api/files/non-existent-id/download')
      .set('Authorization', 'Bearer dev-seller1-token');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });

  it('should return 503 when metadata service is unavailable during download authorization', async () => {
    const spy = vi.spyOn(serverDbModule, 'getFileMetadataByIdAuthoritative').mockRejectedValueOnce(
      new MetadataUnavailableError('Firestore offline')
    );

    const res = await request(app)
      .get('/api/files/any-id/download')
      .set('Authorization', 'Bearer dev-seller1-token');

    expect(res.status).toBe(503);
    expect(res.body.error).toBe('STORAGE_METADATA_UNAVAILABLE');

    spy.mockRestore();
  });

  it('should enforce owner_only access policy and reject unauthorized user', async () => {
    const privateDoc: FileMetadata = {
      id: 'doc-private-100',
      uploaderUserId: 'usr-1', // seller 1
      objectKey: 'uploads/1234567890-abcdef0123456789.pdf',
      originalFilename: 'private_financials.pdf',
      detectedMimeType: 'application/pdf',
      size: 2048,
      entityType: 'seller',
      entityId: 'sel-1',
      visibility: 'owner_only',
      uploadDate: new Date().toISOString(),
      storageProvider: 'local',
      status: 'active'
    };

    const spySave = vi.spyOn(serverDbModule, 'saveToFirestore').mockResolvedValue(undefined as any);
    const spyLookup = vi.spyOn(serverDbModule, 'getFileMetadataByIdAuthoritative').mockResolvedValue(privateDoc);

    // Seller 2 attempts access
    const res = await request(app)
      .get('/api/files/doc-private-100/download')
      .set('Authorization', 'Bearer dev-seller2-token');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');

    spySave.mockRestore();
    spyLookup.mockRestore();
  });

  it('should include Deprecation header on raw object key download route', async () => {
    const res = await request(app)
      .get('/api/files/download?key=uploads/1234567890-abcdef0123456789.pdf')
      .set('Authorization', 'Bearer dev-seller1-token');

    expect(res.headers['deprecation']).toBe('true');
  });

  it('should reject illegal path traversal characters in object key query parameter', async () => {
    const res = await request(app)
      .get('/api/files/download?key=..%2F..%2Fetc%2Fpasswd')
      .set('Authorization', 'Bearer dev-seller1-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_OBJECT_KEY');
  });
});
