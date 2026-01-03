// src/types/index.ts

/**
 * Canonical field names - your internal standard
 */
export enum CanonicalField {
    ORDER_ID = 'order_id',
    ORDER_DATE = 'order_date',
    PRODUCT_NAME = 'product_name',
    PRODUCT_SKU = 'product_sku',
    PRODUCT_CATEGORY = 'product_category',
    ORDER_VALUE = 'order_value',
    FINANCE_SELECTED = 'finance_selected',
    FINANCE_PROVIDER = 'finance_provider',
    FINANCE_TERM_MONTHS = 'finance_term_months',
    FINANCE_DECISION_STATUS = 'finance_decision_status',
    FINANCE_DECISION_DATE = 'finance_decision_date',
    CUSTOMER_ID = 'customer_id',
    CUSTOMER_SEGMENT = 'customer_segment',
  }
  
  /**
   * Normalized finance status enum
   */
  export enum FinanceStatus {
    APPROVED = 'approved',
    DECLINED = 'declined',
    PENDING = 'pending',
    CANCELLED = 'cancelled',
    OTHER = 'other',
  }
  
  /**
   * Raw CSV row (string keys, any values)
   */
  export type RawCSVRow = Record<string, string | number | null>;
  
  /**
   * Field mapping configuration per vendor
   */
  export type FieldMapping = Partial<Record<CanonicalField, string>>;
  
  /**
   * Normalized record after processing
   */
  export interface NormalizedRecord {
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
    customer_segment?: string | null;
  }
  
  /**
   * Global metrics aggregation
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
   * Term-level metrics
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
   * Complete analytics output
   */
  export interface AnalyticsReport {
    vendor_id: string;
    generated_at: Date;
    global_metrics: GlobalMetrics;
    product_metrics: ProductMetrics[];
    term_metrics: TermMetrics[];
    time_series: TimeSeriesPoint[];
    friction_hotspots: ProductMetrics[]; // High attachment, low approval
  }
  
  /**
   * Mapping inference result
   */
  export interface MappingInference {
    suggested_mapping: FieldMapping;
    confidence: number; // 0-1
    unmapped_canonical_fields: CanonicalField[];
    unmapped_source_columns: string[];
  }
  
  /**
   * Import result
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