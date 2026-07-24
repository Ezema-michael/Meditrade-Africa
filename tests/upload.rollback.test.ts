/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../server';
import { collections } from '../src/lib/serverDb';
import { storageService } from '../src/server/services/storageService';

describe('Transactional Batch Upload & Rollback Tests', () => {
  beforeEach(() => {
    process.env.ENABLE_DEV_AUTH_BYPASS = 'true';
    process.env.NODE_ENV = 'development';
  });

  it('should return 201 Created and correct response structure on single file upload', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', 'Bearer dev-seller1-token')
      .field('entity_type', 'listing')
      .field('entity_id', 'list-1')
      .attach('file', Buffer.from('%PDF-1.4 sample PDF content'), 'catalog.pdf');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.id).toBeDefined();
    expect(res.body.downloadUrl).toBe(`/api/files/${res.body.id}/download`);
    expect(res.body.filename).toBe('catalog.pdf');
  });

  it('should roll back previous uploads if a subsequent file in a batch fails malware scan or validation', async () => {
    const deleteSpy = vi.spyOn(storageService, 'deleteFile');

    // Attach 2 files: 1st clean, 2nd contains EICAR test string
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', 'Bearer dev-seller1-token')
      .field('entity_type', 'listing')
      .field('entity_id', 'list-1')
      .attach('file', Buffer.from('%PDF-1.4 valid file 1'), 'clean.pdf')
      .attach('file', Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'), 'eicar.pdf');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('MALWARE_DETECTED');

    // Verify compensating cleanup deleted the 1st uploaded file
    expect(deleteSpy).toHaveBeenCalled();

    deleteSpy.mockRestore();
  });

  it('should reject batch request exceeding MAX_FILES_PER_UPLOAD limit', async () => {
    const req = request(app)
      .post('/api/upload')
      .set('Authorization', 'Bearer dev-seller1-token')
      .field('entity_type', 'listing')
      .field('entity_id', 'list-1');

    for (let i = 0; i < 11; i++) {
      req.attach('file', Buffer.from(`%PDF-1.4 file ${i}`), `doc_${i}.pdf`);
    }

    const res = await req;
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});
