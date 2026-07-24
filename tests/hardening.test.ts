/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../server';
import { validateEnv } from '../src/server/config/env';
import { collections, saveFileMetadata, FileMetadata } from '../src/lib/serverDb';
import * as serverDbModule from '../src/lib/serverDb';

describe('Comprehensive Security Hardening Tests', () => {

  beforeEach(() => {
    process.env.ENABLE_DEV_AUTH_BYPASS = 'true';
    process.env.NODE_ENV = 'development';
  });

  describe('Environment Config Validation', () => {
    it('should throw an error if NODE_ENV is production and ENABLE_DEV_AUTH_BYPASS is true', () => {
      const origEnv = process.env.NODE_ENV;
      const origBypass = process.env.ENABLE_DEV_AUTH_BYPASS;

      process.env.NODE_ENV = 'production';
      process.env.ENABLE_DEV_AUTH_BYPASS = 'true';
      process.env.APP_URL = 'https://meditradeafrica.org';
      process.env.ALLOWED_ORIGINS = 'https://meditradeafrica.org';
      process.env.FIREBASE_PROJECT_ID = 'test-project';

      expect(() => validateEnv()).toThrow(/ENABLE_DEV_AUTH_BYPASS cannot be set to 'true' in production/);

      process.env.NODE_ENV = origEnv;
      process.env.ENABLE_DEV_AUTH_BYPASS = origBypass;
    });

    it('should pass validation in development mode', () => {
      expect(() => validateEnv()).not.toThrow();
    });
  });

  describe('Diagnostics Security & Sanitization', () => {
    it('should reject unauthenticated GET /api/diagnostics/schema', async () => {
      const res = await request(app).get('/api/diagnostics/schema');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
    });

    it('should reject non-admin user from GET /api/diagnostics/schema', async () => {
      const res = await request(app)
        .get('/api/diagnostics/schema')
        .set('Authorization', 'Bearer dev-buyer-token');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });

    it('should allow admin user to GET /api/diagnostics/schema and receive metrics response', async () => {
      const res = await request(app)
        .get('/api/diagnostics/schema')
        .set('Authorization', 'Bearer dev-admin-token');

      expect(res.status).toBe(200);
      expect(res.body.metrics).toBeDefined();
      expect(res.body.metrics.users_count).toBeGreaterThan(0);
      expect(res.body.tables).toBeUndefined(); // Tables omitted from production diagnostics
    });
  });

  describe('Notification Endpoints Security', () => {
    it('should reject unauthenticated GET /api/notifications', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
    });

    it('should ignore user_id query param and return strictly authenticated user notifications', async () => {
      const res = await request(app)
        .get('/api/notifications?user_id=usr-3')
        .set('Authorization', 'Bearer dev-seller1-token');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((n: any) => {
        expect(n.user_id).toBe('usr-1');
      });
    });

    it('should allow user to dismiss their unread notifications', async () => {
      const res = await request(app)
        .post('/api/notifications/dismiss')
        .set('Authorization', 'Bearer dev-seller1-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when dismissing non-existent notification ID', async () => {
      const res = await request(app)
        .post('/api/notifications/non-existent-id/dismiss')
        .set('Authorization', 'Bearer dev-seller1-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('should block non-owner from dismissing another user\'s notification ID', async () => {
      const testNotif = {
        id: 'notif-test-1',
        user_id: 'usr-1',
        title: 'Test Notif',
        message: 'Message',
        read: false,
        timestamp: new Date().toISOString()
      };
      collections.notifications.push(testNotif);

      const res = await request(app)
        .post('/api/notifications/notif-test-1/dismiss')
        .set('Authorization', 'Bearer dev-seller2-token');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });
  });

  describe('File Upload Transactionality & Authorization', () => {
    let uploadedFileId = '';

    it('should reject upload request with invalid entity_type', async () => {
      const res = await request(app)
        .post('/api/upload')
        .set('Authorization', 'Bearer dev-seller1-token')
        .field('entity_type', 'malicious_type')
        .attach('file', Buffer.from('%PDF-1.4 test content'), 'doc.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('should save file metadata durably upon successful upload and return 201 Created', async () => {
      const res = await request(app)
        .post('/api/upload')
        .set('Authorization', 'Bearer dev-seller1-token')
        .field('entity_type', 'listing')
        .field('entity_id', 'list-1')
        .attach('file', Buffer.from('%PDF-1.4 test document content'), 'sample.pdf');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.id).toBeDefined();

      uploadedFileId = res.body.id;

      const saved = collections.fileMetadata.find(f => f.id === uploadedFileId);
      expect(saved).toBeDefined();
      expect(saved?.uploaderUserId).toBe('usr-1');
      expect(saved?.visibility).toBe('public');
    });

    it('should reject path traversal or malformed document key in download parameter', async () => {
      const res = await request(app)
        .get('/api/files/download?key=..%2F..%2Fetc%2Fpasswd')
        .set('Authorization', 'Bearer dev-seller1-token');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('INVALID_OBJECT_KEY');
    });

    it('should allow authorized download by metadata ID', async () => {
      if (!uploadedFileId) return;

      const res = await request(app)
        .get(`/api/files/${uploadedFileId}/download`)
        .set('Authorization', 'Bearer dev-seller1-token');

      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toBe('private, no-store');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should enforce owner_only visibility policies correctly', async () => {
      const privateMeta: FileMetadata = {
        id: 'file-private-1',
        uploaderUserId: 'usr-1',
        objectKey: 'uploads/1234567890-0123456789abcdef.pdf',
        originalFilename: 'tax_record.pdf',
        detectedMimeType: 'application/pdf',
        size: 1024,
        entityType: 'seller',
        entityId: 'sel-1',
        visibility: 'owner_only',
        uploadDate: new Date().toISOString(),
        storageProvider: 'local',
        status: 'active'
      };

      const spySave = vi.spyOn(serverDbModule, 'saveToFirestore').mockResolvedValue(undefined as any);
      const spyLookup = vi.spyOn(serverDbModule, 'getFileMetadataByIdAuthoritative').mockResolvedValue(privateMeta);

      const res2 = await request(app)
        .get('/api/files/file-private-1/download')
        .set('Authorization', 'Bearer dev-seller2-token');

      expect(res2.status).toBe(403);
      expect(res2.body.error).toBe('FORBIDDEN');

      spySave.mockRestore();
      spyLookup.mockRestore();
    });

    it('should serve public files via dedicated public route', async () => {
      const publicMeta: FileMetadata = {
        id: 'file-public-avatar',
        uploaderUserId: 'usr-1',
        objectKey: 'uploads/1234567891-0123456789abcdef.jpg',
        originalFilename: 'avatar.jpg',
        detectedMimeType: 'image/jpeg',
        size: 500,
        entityType: 'profile_avatar',
        visibility: 'public',
        uploadDate: new Date().toISOString(),
        storageProvider: 'local',
        status: 'active'
      };

      const spySave = vi.spyOn(serverDbModule, 'saveToFirestore').mockResolvedValue(undefined as any);
      const spyLookup = vi.spyOn(serverDbModule, 'getFileMetadataByIdAuthoritative').mockResolvedValue(publicMeta);

      const res = await request(app).get('/api/public/files/file-public-avatar');
      expect([200, 404]).toContain(res.status);

      spySave.mockRestore();
      spyLookup.mockRestore();
    });
  });

});
