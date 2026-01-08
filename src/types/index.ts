// src/types/index.ts

import {
  SalesChannel,
  CustomerSegment,
  DealSizeBand,
  GeographyData,
  Currency,
  VendorIdentifier,
  calculateDealSizeBand,
  isValidSalesChannel,
  isValidCustomerSegment,
  isValidDealSizeBand,
  isValidCurrency,
  isValidCountryCode,
  isValidVendorId,
  SalesChannelLabels,
  CustomerSegmentLabels,
  DealSizeBandLabels,
  CurrencyLabels,
  getAllSalesChannels,
  getAllCustomerSegments,
  getAllDealSizeBands,
  getAllCurrencies,
} from "./dimensions";

// Re-export dimensional types and functions
export {
  SalesChannel,
  CustomerSegment,
  DealSizeBand,
  GeographyData,
  Currency,
  VendorIdentifier,
  calculateDealSizeBand,
  isValidSalesChannel,
  isValidCustomerSegment,
  isValidDealSizeBand,
  isValidCurrency,
  isValidCountryCode,
  isValidVendorId,
  SalesChannelLabels,
  CustomerSegmentLabels,
  DealSizeBandLabels,
  CurrencyLabels,
  getAllSalesChannels,
  getAllCustomerSegments,
  getAllDealSizeBands,
  getAllCurrencies,
};

/**
 * Canonical field names - your internal standard
 * Extended to include multi-vendor and dimensional fields
 */
export enum CanonicalField {
  // CORE TRANSACTION FIELDS (existing)
  ORDER_ID = "order_id",
  ORDER_DATE = "order_date",
  PRODUCT_NAME = "product_name",
  PRODUCT_SKU = "product_sku",
  PRODUCT_CATEGORY = "product_category",
  ORDER_VALUE = "order_value",
  FINANCE_SELECTED = "finance_selected",
  FINANCE_PROVIDER = "finance_provider",
  FINANCE_TERM_MONTHS = "finance_term_months",
  FINANCE_DECISION_STATUS = "finance_decision_status",
  FINANCE_DECISION_DATE = "finance_decision_date",
  CUSTOMER_ID = "customer_id",

  // MULTI-VENDOR FIELD (NEW - required for multi-vendor isolation)
  VENDOR_ID = "vendor_id",

  // DIMENSIONAL FIELDS (NEW - Week 1 additions)
  SALES_CHANNEL = "sales_channel",
  CUSTOMER_SEGMENT = "customer_segment",
  GEOGRAPHY_COUNTRY = "geography_country",
  GEOGRAPHY_REGION = "geography_region",
  GEOGRAPHY_POSTAL_CODE = "geography_postal_code",
  CURRENCY = "currency",
}

/**
 * Normalized finance status enum
 */
export enum FinanceStatus {
  APPROVED = "approved",
  DECLINED = "declined",
  PENDING = "pending",
  CANCELLED = "cancelled",
  OTHER = "other",
}

/**
 * Raw CSV row (string keys, any values)
 */
export type RawCSVRow = Record<string, string | number | null>;

/**
 * Field mapping configuration per vendor
 * Maps source CSV columns to canonical field names
 */
export type FieldMapping = Partial<Record<CanonicalField, string>>;

/**
 * Vendor profile metadata
 * Stores configuration and metadata per vendor in multi-vendor system
 */
export interface VendorProfile {
  vendor_id: string; // Unique identifier (e.g., 'acme-tech')
  name: string; // Display name (e.g., 'Acme Tech Distributors')
  created_at: Date; // When vendor was onboarded
  field_mapping?: FieldMapping; // Saved field mappings for this vendor's CSV format
  config?: Record<string, any>; // Custom configuration per vendor
}

/**
 * Normalized record after processing
 * Extended to include multi-vendor ID and dimensional fields
 *
 * IMPORTANT:
 * - vendor_id is REQUIRED - every record must belong to a vendor
 * - Dimensional fields (sales_channel, geography, currency, deal_size_band) are OPTIONAL
 * - deal_size_band is COMPUTED from order_value (never mapped from CSV)
 * - Old records without dimensional data are still valid (backward compatible)
 */
export interface NormalizedRecord {
  // CORE TRANSACTION FIELDS (existing - required/mostly required)
  order_id: string;
  order_date: Date;
  product_name: string;
  product_sku?: string | null;
  product_category?: string | null;
  order_value?: number | null;
  finance_selected: boolean;
  finance_provider?: string | null;
  finance_term_months?: number | null;
  finance_decision_status: FinanceStatus;
  finance_decision_date?: Date | null;
  customer_id?: string | null;

  // MULTI-VENDOR FIELD (NEW - REQUIRED)
  // Every record must know which vendor it belongs to for data isolation
  vendor_id: string;

  // DIMENSIONAL FIELDS (NEW - all optional but recommended)
  // These enable powerful cohort and comparative analysis
  sales_channel?: SalesChannel | null; // How transaction was made
  customer_segment?: CustomerSegment | null; // Customer business size/type
  geography?: GeographyData | null; // Location data (country, region, postal code)
  currency?: Currency | null; // Transaction currency
  deal_size_band?: DealSizeBand | null; // Computed from order_value automatically
}

/**
 * Global metrics aggregation
 * Metrics across all transactions for a vendor/period
 */
export interface GlobalMetrics {
  total_orders: number;
  financed_orders: number;
  attachment_rate: number | null;
  approved_applications: number;
  approval_rate: number | null;
  cash_orders: number;
  avg_order_value_overall: number | null;
  avg_order_value_finance: number | null;
  avg_order_value_cash: number | null;
  date_range: {
    from: Date;
    to: Date;
  };
}

/**
 * Product-level metrics
 */
export interface ProductMetrics {
  product_name: string;
  total_orders: number;
  financed_orders: number;
  attachment_rate: number | null;
  approved_applications: number;
  approval_rate: number | null;
  total_value: number;
  avg_order_value: number | null;
}

/**
 * Term-level metrics (finance term duration)
 */
export interface TermMetrics {
  term_months: number;
  applications: number;
  approved: number;
  approval_rate: number | null;
  total_value: number;
  avg_order_value: number | null;
}

/**
 * Time series data point
 */
export interface TimeSeriesPoint {
  period: string; // ISO date string for the period start
  total_orders: number;
  financed_orders: number;
  attachment_rate: number | null;
  approval_rate: number | null;
}

/**
 * Sales channel metrics (Week 4)
 * Breakdown of performance by sales channel (web, in-store, telesales, etc.)
 */
export interface ChannelMetrics {
  sales_channel: SalesChannel;
  total_orders: number;
  financed_orders: number;
  attachment_rate: number | null;
  approved_applications: number;
  approval_rate: number | null;
  total_value: number;
  avg_order_value: number | null;
}

/**
 * Customer segment metrics (Week 4)
 * Breakdown of performance by customer segment (SME-Small, SME-Medium, Enterprise, Startup)
 */
export interface SegmentMetrics {
  customer_segment: CustomerSegment;
  total_orders: number;
  financed_orders: number;
  attachment_rate: number | null;
  approved_applications: number;
  approval_rate: number | null;
  total_value: number;
  avg_order_value: number | null;
}

/**
 * Geography metrics (Week 4)
 * Breakdown of performance by country and region
 */
export interface GeographyMetrics {
  country: string; // ISO country code (e.g., "GB", "US", "EU")
  region?: string | null; // Region/state (optional)
  total_orders: number;
  financed_orders: number;
  attachment_rate: number | null;
  approved_applications: number;
  approval_rate: number | null;
  total_value: number;
  avg_order_value: number | null;
  currency_summary?: {
    currency: Currency;
    total_value: number;
    order_count: number;
  }[];
}

/**
 * Deal size band metrics (Week 4)
 * Breakdown of performance by order value bands
 */
export interface DealSizeMetrics {
  deal_size_band: DealSizeBand;
  total_orders: number;
  financed_orders: number;
  attachment_rate: number | null;
  approved_applications: number;
  approval_rate: number | null;
  total_value: number;
  avg_order_value: number | null;
  min_value: number;
  max_value: number;
}

/**
 * Complete analytics output
 * Extended to include vendor_id for multi-vendor tracking
 * Extended to include dimensional metrics (Week 4)
 */
export interface AnalyticsReport {
  // MULTI-VENDOR IDENTIFIER (NEW - required)
  vendor_id: string;

  generated_at: Date;
  global_metrics: GlobalMetrics;
  product_metrics: ProductMetrics[];
  term_metrics: TermMetrics[];
  time_series: TimeSeriesPoint[];
  friction_hotspots: ProductMetrics[]; // High attachment, low approval

  // DIMENSIONAL METRICS (Week 4)
  channel_metrics?: ChannelMetrics[]; // Performance by sales channel
  segment_metrics?: SegmentMetrics[]; // Performance by customer segment
  geography_metrics?: GeographyMetrics[]; // Performance by geography
  deal_size_metrics?: DealSizeMetrics[]; // Performance by deal size band
}

/**
 * Mapping inference result
 * Returned when analyzing CSV headers to auto-detect field mappings
 */
export interface MappingInference {
  suggested_mapping: FieldMapping;
  confidence: number; // 0-1
  unmapped_canonical_fields: CanonicalField[];
  unmapped_source_columns: string[];
}

/**
 * Import result
 * Summary of CSV import including success count, errors, and normalized records
 */
export interface ImportResult {
  total_rows: number;
  successfully_normalized: number;
  failed_rows: number;
  errors: Array<{
    row_number: number;
    error: string;
  }>;
  records: NormalizedRecord[];
}
