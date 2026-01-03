// src/normalizers/status-normalizer.ts

import { FinanceStatus } from '../types';

/**
 * Status keyword mappings
 */
const STATUS_MAPPINGS: Record<string, FinanceStatus> = {
  // Approved variants
  'approved': FinanceStatus.APPROVED,
  'funded': FinanceStatus.APPROVED,
  'accepted': FinanceStatus.APPROVED,
  'complete': FinanceStatus.APPROVED,
  'success': FinanceStatus.APPROVED,
  'ok': FinanceStatus.APPROVED,
  'yes': FinanceStatus.APPROVED,
  'paid': FinanceStatus.APPROVED,
  
  // Declined variants
  'declined': FinanceStatus.DECLINED,
  'rejected': FinanceStatus.DECLINED,
  'failed': FinanceStatus.DECLINED,
  'deny': FinanceStatus.DECLINED,
  'denied': FinanceStatus.DECLINED,
  'no': FinanceStatus.DECLINED,
  'refused': FinanceStatus.DECLINED,
  
  // Pending variants
  'pending': FinanceStatus.PENDING,
  'in review': FinanceStatus.PENDING,
  'under review': FinanceStatus.PENDING,
  'review': FinanceStatus.PENDING,
  'processing': FinanceStatus.PENDING,
  'submitted': FinanceStatus.PENDING,
  
  // Cancelled variants
  'cancelled': FinanceStatus.CANCELLED,
  'canceled': FinanceStatus.CANCELLED,
  'withdrawn': FinanceStatus.CANCELLED,
  'void': FinanceStatus.CANCELLED,
};

export function normalizeStatus(value: any): FinanceStatus {
  if (!value) return FinanceStatus.OTHER;
  
  const normalized = String(value)
    .toLowerCase()
    .trim()
    .replace(/[_-]/g, ' '); // Handle underscores and hyphens
  
  // Direct match
  if (STATUS_MAPPINGS[normalized]) {
    return STATUS_MAPPINGS[normalized];
  }
  
  // Partial match (contains keyword)
  for (const [keyword, status] of Object.entries(STATUS_MAPPINGS)) {
    if (normalized.includes(keyword)) {
      return status;
    }
  }
  
  return FinanceStatus.OTHER;
}
