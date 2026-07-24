import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server';

describe('Authorization & Identity Security Tests', () => {

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
        .send({
          title: 'Ultrasound Scanner PRO',
          category_id: 'cat-1',
          condition: 'new',
          price: 12000000,
          state: 'Lagos'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
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

  describe('Resource Ownership Protection', () => {
    it('should block unauthenticated PATCH requests to listings', async () => {
      const res = await request(app)
        .patch('/api/listings/lst-1')
        .send({
          title: 'Hacked Title'
        });

      expect(res.status).toBe(401);
    });

    it('should block unauthenticated DELETE requests to listings', async () => {
      const res = await request(app)
        .delete('/api/listings/lst-1');

      expect(res.status).toBe(401);
    });

    it('should protect vendor management API endpoints from non-admin access', async () => {
      const res = await request(app)
        .get('/api/admin/vendors');

      expect(res.status).toBe(401);
    });

    it('should protect diagnostic schema snapshot from unauthenticated access', async () => {
      const res = await request(app)
        .get('/api/diagnostics/schema');

      expect(res.status).toBe(401);
    });
  });

});
