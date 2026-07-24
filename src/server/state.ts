/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collections, saveToFirestore, deleteFromFirestore, initializeFirestore } from "../lib/serverDb";
import { ChatMessage } from "../types";

export { collections, saveToFirestore, deleteFromFirestore, initializeFirestore };

export const searchLogsCollection = collections.searchLogs;
export const activityLogsCollection = collections.activityLogs;
export const inspectionRequestsCollection = collections.inspections;

export const interactionLogsCollection: any[] = [
  { id: 'int-1', action_type: 'whatsapp_click', listing_id: 'list-1', listing_title: 'Mindray uMec 12 Patient Monitor', seller_id: 'sel-1', seller_name: 'MedLink Diagnostics Ltd', user_info: 'Riverside Memorial Hospital (Dr. Kalu)', timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'int-2', action_type: 'call_click', listing_id: 'list-2', listing_title: 'GE Voluson P8 3D/4D Ultrasound Machine', seller_id: 'sel-2', seller_name: 'West Africa Medical Systems', user_info: 'St. Nicholas Hospital Purchaser', timestamp: new Date(Date.now() - 3600000 * 4).toISOString() }
];

export const chatMessagesCollection: ChatMessage[] = [
  {
    id: 'msg-1',
    lead_id: 'lead-1',
    sender_id: 'usr-1',
    sender_name: 'MedLink Diagnostics Ltd (Chidi Obi)',
    message: 'Hello, we noticed your sourcing request for patient monitors. We have 3 units of extremely clean, US-used Mindray patient monitors ready for delivery inside Abuja tomorrow. We can discount slightly if you pack all three.',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString()
  }
];

export const financingPartnersCollection: any[] = [
  {
    id: 'fin-partner-1',
    name: 'Access Bank MedPay Asset Finance',
    logo_url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=120',
    interest_rate_annual: 18.0,
    max_tenure_months: 36,
    min_down_payment_pct: 10,
    description: 'Specialized healthcare equipment leasing program for registered clinics, diagnostic centers, and private hospitals.',
    badge: 'Preferred Commercial Partner'
  },
  {
    id: 'fin-partner-2',
    name: 'Sterling Bank HealthCare Lease',
    logo_url: 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=120',
    interest_rate_annual: 16.5,
    max_tenure_months: 36,
    min_down_payment_pct: 15,
    description: 'Low interest medical equipment financing with rapid 48-hour credit pre-qualification for verified CAC entities.',
    badge: 'Fast 48hr Approval'
  }
];
