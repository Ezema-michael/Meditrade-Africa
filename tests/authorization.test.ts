import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../server';

describe('Authorization & Identity Security Tests', () => {

  beforeAll(() => {
    process.env.ENABLE_DEV_AUTH_BYPASS = 'true';
    process.env.NODE_ENV = 'development';
  });

  describe('Registration & Account Status Enforcements', () => {
    it('should reject unauthenticated registration requests', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'hacker@example.com',
          role: 'admin',
          business_name: 'Evil Admin Corp'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
    });

    it('should prevent pending_registration users from creating equipment listings', async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', 'Bearer dev-pending-token')
        .send({
          title: 'Ultrasound Scanner PRO',
          category_id: 'cat-1',
          condition: 'new',
          price: 12000000,
          state: 'Lagos'
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('ACCOUNT_REGISTRATION_REQUIRED');
    });

    it('should reject file upload requests without authenticated authorization headers', async () => {
      const res = await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from('dummy file content'), 'test.pdf');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
      expect(res.body.message).toContain('Authentication required');
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('should block non-admin users (buyers & sellers) from admin endpoints', async () => {
      const buyerRes = await request(app)
        .get('/api/admin/vendors')
        .set('Authorization', 'Bearer dev-buyer-token');

      expect(buyerRes.status).toBe(403);
      expect(buyerRes.body.error).toBe('FORBIDDEN');

      const sellerRes = await request(app)
        .get('/api/admin/vendors')
        .set('Authorization', 'Bearer dev-seller1-token');

      expect(sellerRes.status).toBe(403);
      expect(sellerRes.body.error).toBe('FORBIDDEN');
    });

    it('should allow verified admin users to access admin vendor management', async () => {
      const res = await request(app)
        .get('/api/admin/vendors')
        .set('Authorization', 'Bearer dev-admin-token');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Resource & Entity Ownership Protection', () => {
    it('should block unauthenticated PATCH requests to listings', async () => {
      const res = await request(app)
        .patch('/api/listings/list-1')
        .send({
          title: 'Hacked Title'
        });

      expect(res.status).toBe(401);
    });

    it('should block unauthenticated DELETE requests to listings', async () => {
      const res = await request(app)
        .delete('/api/listings/list-1');

      expect(res.status).toBe(401);
    });

    it('should block seller 2 from editing listing owned by seller 1', async () => {
      const res = await request(app)
        .patch('/api/listings/list-1')
        .set('Authorization', 'Bearer dev-seller2-token')
        .send({
          title: 'Unauthorized Modification Attempt'
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });

    it('should allow listing owner (seller 1) to edit their listing', async () => {
      const res = await request(app)
        .patch('/api/listings/list-1')
        .set('Authorization', 'Bearer dev-seller1-token')
        .send({
          title: 'Updated Clinical Ultrasound Machine'
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Clinical Ultrasound Machine');
    });

    it('should reject file upload with unknown entity_type', async () => {
      const res = await request(app)
        .post('/api/upload')
        .set('Authorization', 'Bearer dev-seller1-token')
        .field('entity_type', 'invalid_unrecognized_type')
        .field('entity_id', 'list-1')
        .attach('file', Buffer.from('%PDF-1.4 test document'), 'spec.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      expect(res.body.message).toContain('Unsupported entity_type');
    });

    it('should reject file upload missing entity_id for entity requiring an ID', async () => {
      const res = await request(app)
        .post('/api/upload')
        .set('Authorization', 'Bearer dev-seller1-token')
        .field('entity_type', 'listing')
        .attach('file', Buffer.from('%PDF-1.4 test document'), 'spec.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      expect(res.body.message).toContain('Parameter \'entity_id\' is required');
    });

    it('should reject file upload for an entity owned by another user', async () => {
      const res = await request(app)
        .post('/api/upload')
        .set('Authorization', 'Bearer dev-seller2-token')
        .field('entity_type', 'listing')
        .field('entity_id', 'list-1')
        .attach('file', Buffer.from('%PDF-1.4 test document'), 'spec.pdf');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
      expect(res.body.message).toContain('do not own this equipment listing');
    });

    let uploadedFileId = '';
    let uploadedFileKey = '';

    it('should allow file upload for an entity owned by the requesting user and persist metadata', async () => {
      const res = await request(app)
        .post('/api/upload')
        .set('Authorization', 'Bearer dev-seller1-token')
        .field('entity_type', 'seller')
        .field('entity_id', 'sel-1')
        .attach('file', Buffer.from('%PDF-1.4 test document'), 'spec.pdf');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.id).toBeDefined();
      uploadedFileId = res.body.id;
      uploadedFileKey = res.body.objectKey;
    });

    it('should protect private file downloads from unauthenticated access', async () => {
      const targetId = uploadedFileId || 'file-private-1';
      const res = await request(app)
        .get(`/api/files/${targetId}/download`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
    });

    it('should block unauthorized user (seller 2) from downloading private file uploaded for seller 1 listing', async () => {
      if (!uploadedFileId) return;
      const res = await request(app)
        .get(`/api/files/${uploadedFileId}/download`)
        .set('Authorization', 'Bearer dev-seller2-token');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });

    it('should allow authorized owner (seller 1) to download their private file', async () => {
      if (!uploadedFileId) return;
      const res = await request(app)
        .get(`/api/files/${uploadedFileId}/download`)
        .set('Authorization', 'Bearer dev-seller1-token');

      expect(res.status).toBe(200);
    });
  });

});
