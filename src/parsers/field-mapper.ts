// src/parsers/field-mapper.ts

import {
  CanonicalField,
  FieldMapping,
  MappingInference,
  RawCSVRow,
} from "../types";
import {
  isValidSalesChannel,
  isValidCustomerSegment,
  isValidCountryCode,
  isValidVendorId,
} from "../types/dimensions";

/**
 * Common variations of column names vendors might use
 */
const FIELD_VARIATIONS: Record<CanonicalField, string[]> = {
  [CanonicalField.ORDER_ID]: [
    "order_id",
    "orderid",
    "order id",
    "id",
    "order_number",
    "order number",
    "ordernumber",
    "deal_id",
    "dealid",
    "deal id",
    "transaction_id",
    "ref",
    "reference",
    "order_ref",
    "application_id",
  ],

  [CanonicalField.ORDER_DATE]: [
    "order_date",
    "orderdate",
    "date",
    "order date",
    "created_date",
    "created",
    "application_date",
    "deal_date",
    "transaction_date",
    "timestamp",
    "order_time",
    "submitted_date",
  ],

  [CanonicalField.PRODUCT_NAME]: [
    "product_name",
    "productname",
    "product name",
    "product",
    "item",
    "item_name",
    "itemname",
    "item name",
    "description",
    "product_description",
    "asset",
    "asset_name",
    "equipment",
  ],

  [CanonicalField.PRODUCT_SKU]: [
    "product_sku",
    "productsku",
    "sku",
    "product sku",
    "item_sku",
    "product_code",
    "productcode",
    "item_code",
    "code",
    "model",
    "model_number",
    "part_number",
  ],

  [CanonicalField.PRODUCT_CATEGORY]: [
    "product_category",
    "productcategory",
    "category",
    "product category",
    "item_category",
    "type",
    "product_type",
    "asset_type",
    "equipment_type",
    "class",
    "product_class",
  ],

  [CanonicalField.ORDER_VALUE]: [
    "order_value",
    "ordervalue",
    "value",
    "order value",
    "amount",
    "order_amount",
    "total",
    "total_amount",
    "price",
    "cost",
    "sum",
    "finance_amount",
    "loan_amount",
    "asset_value",
    "deal_value",
  ],

  [CanonicalField.FINANCE_SELECTED]: [
    "finance_selected",
    "financeselected",
    "finance selected",
    "finance",
    "financed",
    "finance_option",
    "payment_method",
    "payment method",
    "finance_requested",
    "credit_requested",
  ],

  [CanonicalField.FINANCE_PROVIDER]: [
    "finance_provider",
    "financeprovider",
    "provider",
    "finance provider",
    "lender",
    "finance_partner",
    "partner",
    "funder",
    "finance_company",
  ],

  [CanonicalField.FINANCE_TERM_MONTHS]: [
    "finance_term_months",
    "term_months",
    "term",
    "finance_term",
    "term months",
    "finance term",
    "duration",
    "loan_term",
    "period",
    "months",
    "repayment_period",
    "contract_length",
  ],

  [CanonicalField.FINANCE_DECISION_STATUS]: [
    "finance_decision_status",
    "decision_status",
    "status",
    "finance_status",
    "decision",
    "approval_status",
    "application_status",
    "outcome",
    "result",
    "state",
    "finance_decision",
    "credit_decision",
  ],

  [CanonicalField.FINANCE_DECISION_DATE]: [
    "finance_decision_date",
    "decision_date",
    "approval_date",
    "status_date",
    "decision date",
    "approved_date",
    "completed_date",
    "resolved_date",
  ],

  [CanonicalField.CUSTOMER_ID]: [
    "customer_id",
    "customerid",
    "customer id",
    "client_id",
    "clientid",
    "account_id",
    "customer_number",
    "customer_ref",
    "buyer_id",
  ],

  [CanonicalField.CUSTOMER_SEGMENT]: [
    "customer_segment",
    "customersegment",
    "segment",
    "customer segment",
    "customer_type",
    "business_type",
    "industry",
    "sector",
    "category",
    "company_size",
    "business_size",
  ],

  // NEW: Multi-vendor field
  [CanonicalField.VENDOR_ID]: [
    "vendor_id",
    "vendorid",
    "vendor id",
    "vendor",
    "account_id",
    "accountid",
    "account",
    "company_id",
    "companyid",
    "partner_id",
  ],

  // NEW: Dimensional fields
  [CanonicalField.SALES_CHANNEL]: [
    "sales_channel",
    "saleschannel",
    "channel",
    "sales channel",
    "source",
    "purchase_method",
    "order_source",
    "sale_method",
    "platform",
  ],

  [CanonicalField.GEOGRAPHY_COUNTRY]: [
    "geography_country",
    "country",
    "country_code",
    "countrycode",
    "customer_country",
    "billing_country",
    "shipping_country",
    "region_country",
  ],

  [CanonicalField.GEOGRAPHY_REGION]: [
    "geography_region",
    "region",
    "state",
    "province",
    "geography_region",
    "customer_region",
    "billing_region",
    "shipping_region",
    "area",
  ],

  [CanonicalField.GEOGRAPHY_POSTAL_CODE]: [
    "geography_postal_code",
    "postal_code",
    "postalcode",
    "postcode",
    "zipcode",
    "zip",
    "zip_code",
    "customer_postcode",
    "billing_postcode",
  ],

  [CanonicalField.CURRENCY]: [
    "currency",
    "currency_code",
    "currencycode",
    "currency code",
    "transaction_currency",
    "order_currency",
    "payment_currency",
  ],
};

/**
 * Normalize a column name for matching
 */
function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[_\s-]+/g, "_") // Standardize separators to underscore
    .replace(/^_+|_+$/g, ""); // Remove leading/trailing underscores
}

/**
 * Calculate similarity score between two strings (0-1)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeColumnName(str1);
  const s2 = normalizeColumnName(str2);

  // Exact match
  if (s1 === s2) return 1.0;

  // Contains match
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  // Levenshtein distance (simplified)
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }

  return matches / longer.length;
}

/**
 * Infer field mapping from CSV headers
 */
export function inferMapping(headers: string[]): MappingInference {
  const mapping: FieldMapping = {};
  const matchedHeaders = new Set<string>();
  const confidenceScores: number[] = [];

  // For each canonical field, find the best matching header
  for (const [canonicalField, variations] of Object.entries(FIELD_VARIATIONS)) {
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const header of headers) {
      if (matchedHeaders.has(header)) continue; // Already mapped

      // Check against all variations
      for (const variation of variations) {
        const score = calculateSimilarity(header, variation);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = header;
        }
      }
    }

    // Only add mapping if confidence is reasonable (>0.5)
    if (bestMatch && bestScore > 0.5) {
      mapping[canonicalField as CanonicalField] = bestMatch;
      matchedHeaders.add(bestMatch);
      confidenceScores.push(bestScore);
    }
  }

  // Calculate overall confidence
  const overallConfidence =
    confidenceScores.length > 0
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
      : 0;

  // Identify unmapped fields
  const unmappedCanonicalFields = Object.values(CanonicalField).filter(
    (field) => !mapping[field],
  );

  const unmappedSourceColumns = headers.filter(
    (header) => !matchedHeaders.has(header),
  );

  return {
    suggested_mapping: mapping,
    confidence: overallConfidence,
    unmapped_canonical_fields: unmappedCanonicalFields,
    unmapped_source_columns: unmappedSourceColumns,
  };
}

/**
 * Validate a mapping has minimum required fields
 */
export function validateMapping(mapping: FieldMapping): {
  valid: boolean;
  missing: CanonicalField[];
} {
  // Minimum required fields for a valid record
  const requiredFields: CanonicalField[] = [
    CanonicalField.ORDER_ID,
    CanonicalField.ORDER_DATE,
  ];

  const missing = requiredFields.filter((field) => !mapping[field]);

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Create a manual mapping (for when inference fails or for testing)
 */
export function createManualMapping(
  sourceHeaders: string[],
  mappings: Array<{ canonical: CanonicalField; source: string }>,
): FieldMapping {
  const mapping: FieldMapping = {};

  for (const { canonical, source } of mappings) {
    // Validate source header exists
    const normalizedSource = normalizeColumnName(source);
    const matchingHeader = sourceHeaders.find(
      (h) => normalizeColumnName(h) === normalizedSource,
    );

    if (matchingHeader) {
      mapping[canonical] = matchingHeader;
    }
  }

  return mapping;
}
