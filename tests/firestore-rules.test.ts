/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Firestore Security Rules Verification', () => {
  const rulesPath = path.join(process.cwd(), 'firestore.rules');

  it('should exist and be configured for rules_version 2', () => {
    expect(fs.existsSync(rulesPath)).toBe(true);
    const content = fs.readFileSync(rulesPath, 'utf-8');
    expect(content).toContain("rules_version = '2'");
    expect(content).toContain('service cloud.firestore');
  });

  it('should enforce default-deny for direct client operations', () => {
    const content = fs.readFileSync(rulesPath, 'utf-8');
    expect(content).toContain('match /{document=**}');
    expect(content).toContain('allow read, write: if false;');
  });

  it('should restrict direct client writes to listings collection', () => {
    const content = fs.readFileSync(rulesPath, 'utf-8');
    expect(content).toContain('match /listings/{listingId}');
    expect(content).toContain('allow create, update, delete: if false;');
  });

  it('should allow public read for active published listings', () => {
    const content = fs.readFileSync(rulesPath, 'utf-8');
    expect(content).toContain('resource.data.status == "published"');
  });
});
