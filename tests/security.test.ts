import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server';

describe('Security & Authentication API Tests', () => {

  describe('Unauthenticated Request Protection', () => {
    it('should reject POST /api/listings without Authorization header', async () => {
      const res = await request(app)
        .post('/api/listings')
        .send({
          title: 'Unauthenticated MRI Machine',
          category_id: 'cat-1',
          condition: 'new',
          price: 5000000,
          state: 'Lagos'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
      expect(res.body.message).toContain('Authentication required');
    });

    it('should reject GET /api/admin/dashboard without Authorization header', async () => {
      const res = await request(app).get('/api/admin/dashboard');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
      expect(res.body.message).toContain('Authentication required');
    });

    it('should reject POST /api/procurement-requests without Authorization header', async () => {
      const res = await request(app)
        .post('/api/procurement-requests')
        .send({
          title: 'Patient Monitors',
          category_id: 'cat-2',
          description: 'Need 10 patient monitors',
          buyer_contact: '+2348000000000'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
      expect(res.body.message).toContain('Authentication required');
    });

    it('should reject POST /api/escrow/create without Authorization header', async () => {
      const res = await request(app)
        .post('/api/escrow/create')
        .send({
          listing_id: 'lst-1',
          amount: 100000
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
      expect(res.body.message).toContain('Authentication required');
    });

    it('should reject POST /api/financing/apply without Authorization header', async () => {
      const res = await request(app)
        .post('/api/financing/apply')
        .send({
          equipment_id: 'lst-1',
          hospital_name: 'St. Mary Hospital',
          partner_bank_id: 'fin-partner-1'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
      expect(res.body.message).toContain('Authentication required');
    });

    it('should reject POST /api/offers without Authorization header', async () => {
      const res = await request(app)
        .post('/api/offers')
        .send({
          listing_id: 'lst-1',
          offer_amount: 500000
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
      expect(res.body.message).toContain('Authentication required');
    });
  });

  describe('Forged or Direct UID Token Protection', () => {
    it('should reject direct user ID in Bearer header (e.g. Bearer f-uid-3)', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', 'Bearer f-uid-3');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
      expect(res.body.message).toContain('Invalid or expired');
    });

    it('should reject fake JWT token without valid Firebase signature', async () => {
      const fakeJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmLXVpZC0zIiwicm9sZSI6ImFkbWluIn0.fakeSignature';
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${fakeJwt}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
      expect(res.body.message).toContain('Invalid or expired');
    });
  });

  describe('Input Validation & Zod Schema Enforcement', () => {
    it('should reject unauthenticated POST /api/auth/register', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email-format',
          role: 'buyer'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
    });

    it('should reject invalid condition enum in listings validation schema', async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          title: 'Ultrasound Scanner',
          category_id: 'cat-1',
          condition: 'invalid_condition_enum',
          price: 1000000,
          state: 'Lagos'
        });

      expect([401, 400]).toContain(res.status);
    });
  });

});
