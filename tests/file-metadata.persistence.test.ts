/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  collections,
  saveFileMetadata,
  getFileMetadataByIdAuthoritative,
  getFileMetadataByObjectKeyAuthoritative,
  removeFileMetadataFromCache,
  updateFileMetadataCache,
  MetadataUnavailableError,
  FileMetadata
} from '../src/lib/serverDb';
import * as serverDbModule from '../src/lib/serverDb';

describe('File Metadata Persistence & Cache Consistency', () => {
  beforeEach(() => {
    process.env.ENABLE_DEV_AUTH_BYPASS = 'true';
    process.env.NODE_ENV = 'test';
    collections.fileMetadata = [];
  });

  it('should persist file metadata and update in-memory cache', async () => {
    const sample: FileMetadata = {
      id: 'meta-test-1',
      uploaderUserId: 'usr-1',
      objectKey: 'uploads/1234567890-abcdef0123456789.pdf',
      originalFilename: 'test.pdf',
      detectedMimeType: 'application/pdf',
      size: 1024,
      entityType: 'listing',
      entityId: 'list-1',
      visibility: 'public',
      uploadDate: new Date().toISOString(),
      storageProvider: 'local',
      status: 'active'
    };

    await saveFileMetadata(sample);

    const cached = collections.fileMetadata.find(f => f.id === sample.id);
    expect(cached).toBeDefined();
    expect(cached?.originalFilename).toBe('test.pdf');
  });

  it('should NOT leave a ghost record in cache if defensive cleanup is triggered', async () => {
    const sample: FileMetadata = {
      id: 'meta-test-fail',
      uploaderUserId: 'usr-1',
      objectKey: 'uploads/1234567890-fail0123456789ab.pdf',
      originalFilename: 'fail.pdf',
      detectedMimeType: 'application/pdf',
      size: 1024,
      entityType: 'listing',
      entityId: 'list-1',
      visibility: 'public',
      uploadDate: new Date().toISOString(),
      storageProvider: 'local',
      status: 'active'
    };

    updateFileMetadataCache(sample);
    expect(collections.fileMetadata.find(f => f.id === sample.id)).toBeDefined();

    removeFileMetadataFromCache(sample.id, sample.objectKey);
    const cached = collections.fileMetadata.find(f => f.id === sample.id);
    expect(cached).toBeUndefined();
  });

  it('should remove stale cache when authoritative lookup confirms document is absent', async () => {
    const stale: FileMetadata = {
      id: 'meta-stale-1',
      uploaderUserId: 'usr-1',
      objectKey: 'uploads/1234567890-stale0123456789a.pdf',
      originalFilename: 'stale.pdf',
      detectedMimeType: 'application/pdf',
      size: 500,
      entityType: 'listing',
      visibility: 'public',
      uploadDate: new Date().toISOString(),
      storageProvider: 'local',
      status: 'active'
    };
    collections.fileMetadata.push(stale);

    const spyGet = vi.spyOn(serverDbModule, 'getFileMetadataByIdAuthoritative').mockImplementationOnce(async (id: string) => {
      removeFileMetadataFromCache(id);
      return null;
    });

    const result = await getFileMetadataByIdAuthoritative('meta-stale-1');
    expect(result).toBeNull();
    const cached = collections.fileMetadata.find(f => f.id === 'meta-stale-1');
    expect(cached).toBeUndefined();

    spyGet.mockRestore();
  });

  it('should throw MetadataUnavailableError on Firestore service failure during authoritative lookup', async () => {
    const spyGet = vi.spyOn(serverDbModule, 'getFileMetadataByIdAuthoritative').mockRejectedValueOnce(
      new MetadataUnavailableError('Firestore database offline')
    );

    await expect(getFileMetadataByIdAuthoritative('meta-any')).rejects.toThrow(MetadataUnavailableError);

    spyGet.mockRestore();
  });
});
