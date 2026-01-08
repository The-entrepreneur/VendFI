// src/filters/filter-types.ts

import { NormalizedRecord, SalesChannel, CustomerSegment, DealSizeBand, Currency } from "../types";

/**
 * Filter operator types for comparison operations
 */
export enum FilterOperator {
  // Equality
  EQUALS = "equals",
  NOT_EQUALS = "not_equals",

  // Comparison (for numbers and dates)
  GREATER_THAN = "greater_than",
  GREATER_THAN_OR_EQUAL = "greater_than_or_equal",
  LESS_THAN = "less_than",
  LESS_THAN_OR_EQUAL = "less_than_or_equal",

  // Range
  BETWEEN = "between",
  NOT_BETWEEN = "not_between",

  // Array/Set operations
  IN = "in",
  NOT_IN = "not_in",
  CONTAINS = "contains",
  NOT_CONTAINS = "not_contains",

  // Special
  IS_NULL = "is_null",
  IS_NOT_NULL = "is_not_null",
}

/**
 * Filter value types
 */
export type FilterValue = string | number | boolean | Date | (string | number | Date)[];

/**
 * Composite filter logic
 */
export enum FilterLogic {
  AND = "AND",
  OR = "OR",
}

/**
 * Single filter criterion
 */
export interface FilterCriterion {
  field: string; // Field name (e.g., "sales_channel", "order_value", "order_date")
  operator: FilterOperator;
  value: FilterValue;
}

/**
 * Composite filter with AND/OR logic
 */
export interface CompositeFilter {
  logic: FilterLogic;
  criteria: (FilterCriterion | CompositeFilter)[];
}

/**
 * Filter expression - can be single or composite
 */
export type FilterExpression = FilterCriterion | CompositeFilter;

/**
 * Predefined date range types
 */
export enum DateRangeType {
  LAST_7_DAYS = "last-7-days",
  LAST_30_DAYS = "last-30-days",
  LAST_90_DAYS = "last-90-days",
  LAST_12_MONTHS = "last-12-months",
  CURRENT_MONTH = "current-month",
  PREVIOUS_MONTH = "previous-month",
  CURRENT_YEAR = "current-year",
  CUSTOM = "custom",
}

/**
 * Date range specification
 */
export interface DateRange {
  type: DateRangeType;
  start_date?: Date; // For custom ranges
  end_date?: Date; // For custom ranges
}

/**
 * Dimension filter options
 */
export interface DimensionFilters {
  sales_channels?: SalesChannel[]; // Filter by sales channels
  customer_segments?: CustomerSegment[]; // Filter by segments
  countries?: string[]; // Filter by country codes (ISO)
  currencies?: Currency[]; // Filter by currencies
  deal_size_bands?: DealSizeBand[]; // Filter by deal size bands
}

/**
 * Complete filter set for records
 */
export interface FilterSet {
  date_range?: DateRange; // Date filtering
  dimensions?: DimensionFilters; // Dimensional filtering
  custom?: FilterExpression; // Custom filter expressions
  vendor_id?: string; // Vendor-scoped filtering (for multi-vendor systems)
}

/**
 * Filter result with metadata
 */
export interface FilterResult {
  total_records: number;
  filtered_records: number;
  filter_applied: FilterExpression | null;
  records: NormalizedRecord[];
}

/**
 * Preset filter configuration (named filters for reuse)
 */
export interface FilterPreset {
  name: string; // e.g., "SME Web Sales"
  description?: string;
  filter_set: FilterSet;
}
