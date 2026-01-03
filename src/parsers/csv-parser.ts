// src/parsers/csv-parser.ts

import {
  RawCSVRow,
  FieldMapping,
  NormalizedRecord,
  ImportResult,
  CanonicalField,
} from '../types';
import { normalizeDate } from '../normalizers/date-normalizer';
import { normalizeStatus } from '../normalizers/status-normalizer';
import {
  normalizeBoolean,
  normalizeNumber,
  normalizeInteger,
  normalizeString,
} from '../normalizers/value-normalizer';

interface ParseOptions {
  assumeFinanceSelected?: boolean; // If true, all rows are assumed financed
  skipValidation?: boolean; // Skip strict validation (useful for messy data)
}

/**
 * Parse and normalize a single CSV row
 */
function normalizeRow(
  rawRow: RawCSVRow,
  mapping: FieldMapping,
  options: ParseOptions = {}
): NormalizedRecord | null {
  try {
    // Extract mapped values
    const orderId = mapping[CanonicalField.ORDER_ID]
      ? rawRow[mapping[CanonicalField.ORDER_ID]]
      : null;
    
    const orderDateRaw = mapping[CanonicalField.ORDER_DATE]
      ? rawRow[mapping[CanonicalField.ORDER_DATE]]
      : null;
    
    // Required fields validation
    if (!orderId || !orderDateRaw) {
      return null;
    }
    
    const orderDate = normalizeDate(orderDateRaw);
    if (!orderDate) {
      return null;
    }
    
    // Extract and normalize all other fields
    const productName = normalizeString(
      mapping[CanonicalField.PRODUCT_NAME]
        ? rawRow[mapping[CanonicalField.PRODUCT_NAME]]
        : null
    ) || 'Unknown';
    
    const productSku = normalizeString(
      mapping[CanonicalField.PRODUCT_SKU]
        ? rawRow[mapping[CanonicalField.PRODUCT_SKU]]
        : null
    );
    
    const productCategory = normalizeString(
      mapping[CanonicalField.PRODUCT_CATEGORY]
        ? rawRow[mapping[CanonicalField.PRODUCT_CATEGORY]]
        : null
    );
    
    const orderValue = normalizeNumber(
      mapping[CanonicalField.ORDER_VALUE]
        ? rawRow[mapping[CanonicalField.ORDER_VALUE]]
        : null
    );
    
    // Finance selected - either from column or assume true
    let financeSelected = options.assumeFinanceSelected || false;
    if (mapping[CanonicalField.FINANCE_SELECTED]) {
      financeSelected = normalizeBoolean(
        rawRow[mapping[CanonicalField.FINANCE_SELECTED]]
      );
    }
    
    const financeProvider = normalizeString(
      mapping[CanonicalField.FINANCE_PROVIDER]
        ? rawRow[mapping[CanonicalField.FINANCE_PROVIDER]]
        : null
    );
    
    const financeTermMonths = normalizeInteger(
      mapping[CanonicalField.FINANCE_TERM_MONTHS]
        ? rawRow[mapping[CanonicalField.FINANCE_TERM_MONTHS]]
        : null
    );
    
    const financeDecisionStatus = normalizeStatus(
      mapping[CanonicalField.FINANCE_DECISION_STATUS]
        ? rawRow[mapping[CanonicalField.FINANCE_DECISION_STATUS]]
        : null
    );
    
    const financeDecisionDate = normalizeDate(
      mapping[CanonicalField.FINANCE_DECISION_DATE]
        ? rawRow[mapping[CanonicalField.FINANCE_DECISION_DATE]]
        : null
    );
    
    const customerId = normalizeString(
      mapping[CanonicalField.CUSTOMER_ID]
        ? rawRow[mapping[CanonicalField.CUSTOMER_ID]]
        : null
    );
    
    const customerSegment = normalizeString(
      mapping[CanonicalField.CUSTOMER_SEGMENT]
        ? rawRow[mapping[CanonicalField.CUSTOMER_SEGMENT]]
        : null
    );
    
    return {
      order_id: String(orderId),
      order_date: orderDate,
      product_name: productName,
      product_sku: productSku,
      product_category: productCategory,
      order_value: orderValue,
      finance_selected: financeSelected,
      finance_provider: financeProvider,
      finance_term_months: financeTermMonths,
      finance_decision_status: financeDecisionStatus,
      finance_decision_date: financeDecisionDate,
      customer_id: customerId,
      customer_segment: customerSegment,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Parse CSV data into normalized records
 */
export function parseCSV(
  rawRows: RawCSVRow[],
  mapping: FieldMapping,
  options: ParseOptions = {}
): ImportResult {
  const records: NormalizedRecord[] = [];
  const errors: Array<{ row_number: number; error: string }> = [];
  
  for (let i = 0; i < rawRows.length; i++) {
    const rawRow = rawRows[i];
    const normalized = normalizeRow(rawRow, mapping, options);
    
    if (normalized) {
      records.push(normalized);
    } else {
      errors.push({
        row_number: i + 2, // +2 because 1-indexed and skip header
        error: 'Failed to normalize row - missing required fields or invalid data',
      });
    }
  }
  
  return {
    total_rows: rawRows.length,
    successfully_normalized: records.length,
    failed_rows: errors.length,
    errors: errors,
    records: records,
  };
}

/**
 * Parse CSV string (using a simple parser or you can use PapaParse)
 */
export function parseCSVString(csvContent: string): RawCSVRow[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];
  
  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  // Parse rows
  const rows: RawCSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: RawCSVRow = {};
    
    headers.forEach((header, idx) => {
      row[header] = values[idx] || null;
    });
    
    rows.push(row);
  }
  
  return rows;
}

/**
 * Get headers from raw CSV rows
 */
export function getHeaders(rawRows: RawCSVRow[]): string[] {
  if (rawRows.length === 0) return [];
  return Object.keys(rawRows[0]);
}