import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../server';
import { collections, FileMetadata } from '../src/lib/serverDb';
import { EscrowDeal } from '../src/types';

const dealId = 'esc-bank-payment-test';
const proofId = 'file-bank-payment-test';

describe('Bank payment proof and confirmation', () => {
  beforeEach(() => {
    process.env.ENABLE_DEV_AUTH_BYPASS = 'true';
    process.env.NODE_ENV = 'development';

    collections.escrowDeals = collections.escrowDeals.filter(deal => deal.id !== dealId);
    collections.fileMetadata = collections.fileMetadata.filter(file => file.id !== proofId);
    collections.engineers = collections.engineers.filter(engineer => engineer.id !== 'eng-payment-test');

    const deal: EscrowDeal = {
      id: dealId,
      listing_id: 'list-1',
      listing_title: 'Payment Test Equipment',
      buyer_id: 'usr-5',
      buyer_name: 'Test Hospital',
      buyer_email: 'buyer@riversidememorial.org',
      seller_id: 'sel-1',
      seller_name: 'MedLink Diagnostics Ltd',
      amount: 1_000_000,
      currency: 'NGN',
      escrow_fee: 20_000,
      status: 'initiated',
      assigned_engineer_id: 'eng-payment-test',
      assigned_engineer_name: 'Assigned Test Engineer',
      engineer_requested: true,
      payment_reference: 'ESC-BANK-TEST',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    collections.escrowDeals.push(deal);

    const proof: FileMetadata = {
      id: proofId,
      uploaderUserId: 'usr-5',
      objectKey: 'uploads/1234567890-abcdef0123456789.pdf',
      originalFilename: 'receipt.pdf',
      detectedMimeType: 'application/pdf',
      size: 1024,
      entityType: 'escrow',
      entityId: dealId,
      visibility: 'participants',
      uploadDate: new Date().toISOString(),
      storageProvider: 'local',
      status: 'active'
    };
    collections.fileMetadata.push(proof);
    collections.engineers.push({
      id: 'eng-payment-test',
      user_id: 'usr-engineer-test',
      name: 'Assigned Test Engineer',
      email: 'engineer@example.com',
      phone: '+2348000000000',
      specialty: 'Biomedical Equipment',
      experience_years: 5,
      state: 'Lagos',
      city: 'Lagos',
      bio: 'Test engineer',
      avatar_url: '',
      verified_status: 'verified',
      average_rating: 5,
      services_offered: [],
      created_at: new Date().toISOString()
    });
  });

  afterEach(() => {
    collections.escrowDeals = collections.escrowDeals.filter(deal => deal.id !== dealId);
    collections.fileMetadata = collections.fileMetadata.filter(file => file.id !== proofId);
    collections.engineers = collections.engineers.filter(engineer => engineer.id !== 'eng-payment-test');
  });

  async function submitProof() {
    return request(app)
      .post(`/api/escrow/${dealId}/bank-payment-proof`)
      .set('Authorization', 'Bearer dev-buyer-token')
      .send({
        proof_file_id: proofId,
        bank_name: 'Access Bank',
        transaction_reference: 'TRX-123456'
      });
  }

  it('keeps funds unconfirmed after the buyer submits proof', async () => {
    const response = await submitProof();

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('initiated');
    expect(response.body.bank_payment_status).toBe('proof_pending');
  });

  it('allows the deal seller to confirm pending proof', async () => {
    await submitProof();
    const response = await request(app)
      .patch(`/api/escrow/${dealId}/bank-payment-confirm`)
      .set('Authorization', 'Bearer dev-seller1-token')
      .send({ notes: 'Receipt matched the escrow account statement.' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('funds_deposited');
    expect(response.body.bank_payment_status).toBe('confirmed');
    expect(response.body.bank_payment_confirmed_by_role).toBe('seller');
  });

  it('rejects a seller who is not party to the deal', async () => {
    await submitProof();
    const response = await request(app)
      .patch(`/api/escrow/${dealId}/bank-payment-confirm`)
      .set('Authorization', 'Bearer dev-seller2-token')
      .send({});

    expect(response.status).toBe(403);
  });

  it('allows the specifically requested engineer to confirm pending proof', async () => {
    await submitProof();
    const response = await request(app)
      .patch(`/api/escrow/${dealId}/bank-payment-confirm`)
      .set('Authorization', 'Bearer dev-engineer-token')
      .send({ notes: 'Transfer receipt verified for the requested inspection.' });

    expect(response.status).toBe(200);
    expect(response.body.bank_payment_confirmed_by_role).toBe('engineer');
  });
});
