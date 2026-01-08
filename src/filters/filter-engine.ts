// src/filters/filter-engine.ts

import {
  NormalizedRecord,
  SalesChannel,
  CustomerSegment,
  DealSizeBand,
  Currency,
} from "../types";
import {
  FilterOperator,
  FilterValue,
  FilterLogic,
  FilterCriterion,
  CompositeFilter,
  FilterExpression,
  DateRange,
  DateRangeType,
  DimensionFilters,
  FilterSet,
  FilterResult,
} from "./filter-types";

/**
 * Core filter engine for applying filters to normalized records
 * Supports date range filtering, dimensional filtering, and custom expressions
 */
export class FilterEngine {
  /**
   * Apply a complete filter set to records
   */
  applyFilterSet(
    records: NormalizedRecord[],
    filterSet: FilterSet,
  ): FilterResult {
    let filtered = records;
    let appliedFilter: FilterExpression | null = null;

    // Apply vendor filter if specified
    if (filterSet.vendor_id) {
      filtered = filtered.filter((r) => r.vendor_id === filterSet.vendor_id);
    }

    // Apply date range filter
    if (filterSet.date_range) {
      const dateRange = this.resolveDateRange(filterSet.date_range);
      filtered = filtered.filter(
        (r) => r.order_date >= dateRange.start && r.order_date <= dateRange.end,
      );
      appliedFilter = {
        field: "order_date",
        operator: FilterOperator.BETWEEN,
        value: [dateRange.start, dateRange.end],
      };
    }

    // Apply dimensional filters
    if (filterSet.dimensions) {
      filtered = this.applyDimensionFilters(filtered, filterSet.dimensions);
    }

    // Apply custom filter expression
    if (filterSet.custom) {
      filtered = filtered.filter((r) =>
        this.evaluateFilter(r, filterSet.custom!),
      );
      appliedFilter = filterSet.custom;
    }

    return {
      total_records: records.length,
      filtered_records: filtered.length,
      filter_applied: appliedFilter,
      records: filtered,
    };
  }

  /**
   * Resolve a date range type to actual start/end dates
   */
  private resolveDateRange(dateRange: DateRange): { start: Date; end: Date } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    switch (dateRange.type) {
      case DateRangeType.LAST_7_DAYS: {
        const start = new Date(today);
        start.setDate(start.getDate() - 7);
        return { start, end: tomorrow };
      }

      case DateRangeType.LAST_30_DAYS: {
        const start = new Date(today);
        start.setDate(start.getDate() - 30);
        return { start, end: tomorrow };
      }

      case DateRangeType.LAST_90_DAYS: {
        const start = new Date(today);
        start.setDate(start.getDate() - 90);
        return { start, end: tomorrow };
      }

      case DateRangeType.LAST_12_MONTHS: {
        const start = new Date(today);
        start.setFullYear(start.getFullYear() - 1);
        return { start, end: tomorrow };
      }

      case DateRangeType.CURRENT_MONTH: {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        return { start, end };
      }

      case DateRangeType.PREVIOUS_MONTH: {
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const end = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start, end };
      }

      case DateRangeType.CURRENT_YEAR: {
        const start = new Date(today.getFullYear(), 0, 1);
        const end = new Date(today.getFullYear() + 1, 0, 1);
        return { start, end };
      }

      case DateRangeType.CUSTOM: {
        if (!dateRange.start_date || !dateRange.end_date) {
          throw new Error("Custom date range requires start_date and end_date");
        }
        return { start: dateRange.start_date, end: dateRange.end_date };
      }

      default:
        throw new Error(`Unknown date range type: ${dateRange.type}`);
    }
  }

  /**
   * Apply dimensional filters to records
   */
  private applyDimensionFilters(
    records: NormalizedRecord[],
    filters: DimensionFilters,
  ): NormalizedRecord[] {
    return records.filter((record) => {
      if (
        filters.sales_channels &&
        !filters.sales_channels.includes(record.sales_channel!)
      ) {
        return false;
      }
      if (
        filters.customer_segments &&
        !filters.customer_segments.includes(record.customer_segment!)
      ) {
        return false;
      }
      if (
        filters.countries &&
        record.geography &&
        !filters.countries.includes(record.geography.country)
      ) {
        return false;
      }
      if (
        filters.currencies &&
        !filters.currencies.includes(record.currency!)
      ) {
        return false;
      }
      if (
        filters.deal_size_bands &&
        !filters.deal_size_bands.includes(record.deal_size_band!)
      ) {
        return false;
      }
      return true;
    });
  }

  /**
   * Evaluate a filter expression against a record
   */
  private evaluateFilter(
    record: NormalizedRecord,
    expression: FilterExpression,
  ): boolean {
    // Handle composite filters
    if ("logic" in expression) {
      return this.evaluateCompositeFilter(record, expression);
    }

    // Handle single filter criterion
    return this.evaluateCriterion(record, expression);
  }

  /**
   * Evaluate a composite filter with AND/OR logic
   */
  private evaluateCompositeFilter(
    record: NormalizedRecord,
    filter: CompositeFilter,
  ): boolean {
    if (filter.logic === FilterLogic.AND) {
      return filter.criteria.every((c) => this.evaluateFilter(record, c));
    } else {
      return filter.criteria.some((c) => this.evaluateFilter(record, c));
    }
  }

  /**
   * Evaluate a single filter criterion
   */
  private evaluateCriterion(
    record: NormalizedRecord,
    criterion: FilterCriterion,
  ): boolean {
    const value = this.getFieldValue(record, criterion.field);

    switch (criterion.operator) {
      case FilterOperator.EQUALS:
        return value === criterion.value;

      case FilterOperator.NOT_EQUALS:
        return value !== criterion.value;

      case FilterOperator.GREATER_THAN:
        return (
          typeof value === "number" &&
          typeof criterion.value === "number" &&
          value > criterion.value
        );

      case FilterOperator.GREATER_THAN_OR_EQUAL:
        return (
          typeof value === "number" &&
          typeof criterion.value === "number" &&
          value >= criterion.value
        );

      case FilterOperator.LESS_THAN:
        return (
          typeof value === "number" &&
          typeof criterion.value === "number" &&
          value < criterion.value
        );

      case FilterOperator.LESS_THAN_OR_EQUAL:
        return (
          typeof value === "number" &&
          typeof criterion.value === "number" &&
          value <= criterion.value
        );

      case FilterOperator.BETWEEN: {
        const values = Array.isArray(criterion.value)
          ? criterion.value
          : [criterion.value];
        if (values.length !== 2 || typeof value !== "number") return false;
        const [min, max] = values as number[];
        return value >= min && value <= max;
      }

      case FilterOperator.NOT_BETWEEN: {
        const values = Array.isArray(criterion.value)
          ? criterion.value
          : [criterion.value];
        if (values.length !== 2 || typeof value !== "number") return false;
        const [min, max] = values as number[];
        return value < min || value > max;
      }

      case FilterOperator.IN: {
        const values = Array.isArray(criterion.value)
          ? criterion.value
          : [criterion.value];
        return values.includes(value);
      }

      case FilterOperator.NOT_IN: {
        const values = Array.isArray(criterion.value)
          ? criterion.value
          : [criterion.value];
        return !values.includes(value);
      }

      case FilterOperator.CONTAINS:
        return (
          typeof value === "string" &&
          typeof criterion.value === "string" &&
          value.toLowerCase().includes(criterion.value.toLowerCase())
        );

      case FilterOperator.NOT_CONTAINS:
        return (
          typeof value === "string" &&
          typeof criterion.value === "string" &&
          !value.toLowerCase().includes(criterion.value.toLowerCase())
        );

      case FilterOperator.IS_NULL:
        return value === null || value === undefined;

      case FilterOperator.IS_NOT_NULL:
        return value !== null && value !== undefined;

      default:
        return false;
    }
  }

  /**
   * Get value from record by field name (supports nested fields)
   */
  private getFieldValue(record: NormalizedRecord, field: string): any {
    // Handle nested fields like "geography.country"
    if (field.includes(".")) {
      const parts = field.split(".");
      let value: any = record;
      for (const part of parts) {
        value = value?.[part];
      }
      return value;
    }

    return (record as any)[field];
  }

  /**
   * Create a filter preset for reuse
   */
  static createPreset(
    name: string,
    filterSet: FilterSet,
    description?: string,
  ) {
    return {
      name,
      description,
      filter_set: filterSet,
    };
  }

  /**
   * Common preset filters
   */
  static PRESETS = {
    SME_WEB: FilterEngine.createPreset(
      "SME Web Sales",
      {
        dimensions: {
          sales_channels: [SalesChannel.WEB],
          customer_segments: [
            CustomerSegment.SME_SMALL,
            CustomerSegment.SME_MEDIUM,
          ],
        },
      },
      "All SME sales through web channel",
    ),

    ENTERPRISE_ALL_CHANNELS: FilterEngine.createPreset(
      "Enterprise Sales",
      {
        dimensions: {
          customer_segments: [CustomerSegment.ENTERPRISE],
        },
      },
      "All enterprise customer sales",
    ),

    HIGH_VALUE_DEALS: FilterEngine.createPreset(
      "High Value Deals",
      {
        dimensions: {
          deal_size_bands: [DealSizeBand.FROM_5K_TO_10K, DealSizeBand.OVER_10K],
        },
      },
      "Orders worth £5,000 or more",
    ),

    UK_SALES: FilterEngine.createPreset(
      "UK Sales Only",
      {
        dimensions: {
          countries: ["GB"],
        },
      },
      "Sales from UK customers only",
    ),

    GBP_TRANSACTIONS: FilterEngine.createPreset(
      "GBP Transactions",
      {
        dimensions: {
          currencies: [Currency.GBP],
        },
      },
      "All transactions in British Pounds",
    ),
  };
}
