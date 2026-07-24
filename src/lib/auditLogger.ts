/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collections, saveToFirestore } from './serverDb';

export interface StructuredAuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  category: string;
  resource?: string;
  description: string;
  metadata?: Record<string, any>;
  ip?: string;
}

export function logAuditEvent(event: Omit<StructuredAuditEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): StructuredAuditEvent {
  const fullEvent: StructuredAuditEvent = {
    id: event.id || `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: event.timestamp || new Date().toISOString(),
    actor: event.actor || 'System',
    action: event.action,
    category: event.category,
    resource: event.resource,
    description: event.description,
    metadata: event.metadata,
    ip: event.ip
  };

  // 1. Output structured JSON to stdout for Cloud Logging / SIEM SIEM ingestion
  console.log(JSON.stringify({
    severity: 'INFO',
    type: 'AUDIT_EVENT',
    audit: fullEvent
  }));

  // 2. Store in memory and persist asynchronously to Firestore
  collections.activityLogs.unshift(fullEvent);
  saveToFirestore('activity_logs', fullEvent.id, fullEvent).catch(err => {
    console.error('Failed to persist audit log to Firestore:', err);
  });

  return fullEvent;
}

export function logActivity(actor: string, action: string, category: string, description: string): StructuredAuditEvent {
  return logAuditEvent({
    actor,
    action,
    category,
    description
  });
}
