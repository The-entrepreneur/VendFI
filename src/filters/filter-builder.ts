// src/filters/filter-builder.ts

import {
  FilterSet,
  FilterExpression,
  FilterCriterion,
  CompositeFilter,
  FilterOperator,
  FilterLogic,
  DateRange,
  DateRangeType,
  DimensionFilters,
} from "./filter-types";
import { SalesChannel, CustomerSegment, DealSizeBand, Currency } from "../types";

/**
 * Fluent builder API for constructing filter sets
 * Allows readable, chainable filter construction
 *
 * Example:
 * new FilterBuilder()
 *   .forVendor("acme-tech")
 *   .inLastDays(30)
 *   .withSalesChannels(["web"])
 *   .withSegments(["sme-medium"])
 *   .build()
 */
export class FilterBuilder {
  private filterSet: FilterSet = {};
  private customExpression: FilterExpression | null = null;

  /**
   * Set vendor_id for multi-vendor filtering
   */
  forVendor(vendorId: string): FilterBuilder {
    this.filterSet.vendor_id = vendorId;
    return this;
  }

  /**
   * Filter by last N days
   */
  inLastDays(days: number): FilterBuilder {
    this.filterSet.date_range = {
      type: DateRangeType.LAST_7_DAYS,
    };

    if (days === 7) {
      this.filterSet.date_range.type = DateRangeType.LAST_7_DAYS;
    } else if (days === 30) {
      this.filterSet.date_range.type = DateRangeType.LAST_30_DAYS;
    } else if (days === 90) {
      this.filterSet.date_range.type = DateRangeType.LAST_90_DAYS;
    } else if (days === 365) {
      this.filterSet.date_range.type = DateRangeType.LAST_12_MONTHS;
    } else {
      // Custom range
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);
      this.filterSet.date_range = {
        type: DateRangeType.CUSTOM,
        start_date: start,
        end_date: end,
      };
    }

    return this;
  }

  /**
   * Filter by current month
   */
  inCurrentMonth(): FilterBuilder {
    this.filterSet.date_range = {
      type: DateRangeType.CURRENT_MONTH,
    };
    return this;
  }

  /**
   * Filter by previous month
   */
  inPreviousMonth(): FilterBuilder {
    this.filterSet.date_range = {
      type: DateRangeType.PREVIOUS_MONTH,
    };
    return this;
  }

  /**
   * Filter by current year
   */
  inCurrentYear(): FilterBuilder {
    this.filterSet.date_range = {
      type: DateRangeType.CURRENT_YEAR,
    };
    return this;
  }

  /**
   * Filter by custom date range
   */
  betweenDates(startDate: Date, endDate: Date): FilterBuilder {
    this.filterSet.date_range = {
      type: DateRangeType.CUSTOM,
      start_date: startDate,
      end_date: endDate,
    };
    return this;
  }

  /**
   * Add sales channel filters
   */
  withSalesChannels(channels: SalesChannel[]): FilterBuilder {
    if (!this.filterSet.dimensions) {
      this.filterSet.dimensions = {};
    }
    this.filterSet.dimensions.sales_channels = channels;
    return this;
  }

  /**
   * Add customer segment filters
   */
  withSegments(segments: CustomerSegment[]): FilterBuilder {
    if (!this.filterSet.dimensions) {
      this.filterSet.dimensions = {};
    }
    this.filterSet.dimensions.customer_segments = segments;
    return this;
  }

  /**
   * Add country filters
   */
  inCountries(countries: string[]): FilterBuilder {
    if (!this.filterSet.dimensions) {
      this.filterSet.dimensions = {};
    }
    this.filterSet.dimensions.countries = countries;
    return this;
  }

  /**
   * Add currency filters
   */
  inCurrencies(currencies: Currency[]): FilterBuilder {
    if (!this.filterSet.dimensions) {
      this.filterSet.dimensions = {};
    }
    this.filterSet.dimensions.currencies = currencies;
    return this;
  }

  /**
   * Add deal size band filters
   */
  withDealSizeBands(bands: DealSizeBand[]): FilterBuilder {
    if (!this.filterSet.dimensions) {
      this.filterSet.dimensions = {};
    }
    this.filterSet.dimensions.deal_size_bands = bands;
    return this;
  }

  /**
   * Add a custom filter criterion
   */
  where(field: string, operator: FilterOperator, value: any): FilterBuilder {
    const criterion: FilterCriterion = { field, operator, value };
    this.customExpression = criterion;
    return this;
  }

  /**
   * AND another criterion to custom filter
   */
  and(field: string, operator: FilterOperator, value: any): FilterBuilder {
    const newCriterion: FilterCriterion = { field, operator, value };

    if (!this.customExpression) {
      this.customExpression = newCriterion;
    } else if ("logic" in this.customExpression) {
      // Already a composite filter, add to it
      const composite = this.customExpression as CompositeFilter;
      if (composite.logic === FilterLogic.AND) {
        composite.criteria.push(newCriterion);
      } else {
        // Different logic, wrap existing
        this.customExpression = {
          logic: FilterLogic.AND,
          criteria: [this.customExpression, newCriterion],
        };
      }
    } else {
      // Convert to composite AND
      this.customExpression = {
        logic: FilterLogic.AND,
        criteria: [this.customExpression, newCriterion],
      };
    }

    return this;
  }

  /**
   * OR another criterion to custom filter
   */
  or(field: string, operator: FilterOperator, value: any): FilterBuilder {
    const newCriterion: FilterCriterion = { field, operator, value };

    if (!this.customExpression) {
      this.customExpression = newCriterion;
    } else if ("logic" in this.customExpression) {
      // Already a composite filter, add to it
      const composite = this.customExpression as CompositeFilter;
      if (composite.logic === FilterLogic.OR) {
        composite.criteria.push(newCriterion);
      } else {
        // Different logic, wrap existing
        this.customExpression = {
          logic: FilterLogic.OR,
          criteria: [this.customExpression, newCriterion],
        };
      }
    } else {
      // Convert to composite OR
      this.customExpression = {
        logic: FilterLogic.OR,
        criteria: [this.customExpression, newCriterion],
      };
    }

    return this;
  }

  /**
   * Add high-value deal filter (over £5k)
   */
  highValueDealsOnly(): FilterBuilder {
    return this.where("order_value", FilterOperator.GREATER_THAN, 5000);
  }

  /**
   * Add financed orders filter
   */
  financedOnly(): FilterBuilder {
    return this.where("finance_selected", FilterOperator.EQUALS, true);
  }

  /**
   * Add approved applications filter
   */
  approvedOnly(): FilterBuilder {
    return this.where("finance_decision_status", FilterOperator.EQUALS, "approved");
  }

  /**
   * Build the final filter set
   */
  build(): FilterSet {
    if (this.customExpression) {
      this.filterSet.custom = this.customExpression;
    }
    return this.filterSet;
  }

  /**
   * Reset builder to default state
   */
  reset(): FilterBuilder {
    this.filterSet = {};
    this.customExpression = null;
    return this;
  }

  /**
   * Clone current builder state
   */
  clone(): FilterBuilder {
    const cloned = new FilterBuilder();
    cloned.filterSet = JSON.parse(JSON.stringify(this.filterSet));
    cloned.customExpression = this.customExpression
      ? JSON.parse(JSON.stringify(this.customExpression))
      : null;
    return cloned;
  }

  /**
   * Get current filter set without building
   */
  getFilterSet(): FilterSet {
    return { ...this.filterSet };
  }
}

/**
 * Helper functions for creating filters from CLI arguments
 */
export class FilterBuilderHelper {
  /**
   * Parse CLI-style filter arguments
   * Example: --channel web --segment sme-medium --date last-30-days
   */
  static fromCliArgs(args: Record<string, any>): FilterBuilder {
    const builder = new FilterBuilder();

    if (args.vendor) {
      builder.forVendor(args.vendor);
    }

    if (args.date) {
      this.applyDateFilter(builder, args.date);
    }

    if (args.channel || args.channels) {
      const channels = this.parseArray(args.channel || args.channels);
      builder.withSalesChannels(channels as SalesChannel[]);
    }

    if (args.segment || args.segments) {
      const segments = this.parseArray(args.segment || args.segments);
      builder.withSegments(segments as CustomerSegment[]);
    }

    if (args.country || args.countries) {
      const countries = this.parseArray(args.country || args.countries);
      builder.inCountries(countries);
    }

    if (args.currency || args.currencies) {
      const currencies = this.parseArray(args.currency || args.currencies);
      builder.inCurrencies(currencies as Currency[]);
    }

    if (args.minValue) {
      builder.where("order_value", FilterOperator.GREATER_THAN_OR_EQUAL, parseFloat(args.minValue));
    }

    if (args.maxValue) {
      builder.where("order_value", FilterOperator.LESS_THAN_OR_EQUAL, parseFloat(args.maxValue));
    }

    return builder;
  }

  /**
   * Parse date filter argument
   */
  private static applyDateFilter(builder: FilterBuilder, dateArg: string): void {
    switch (dateArg.toLowerCase()) {
      case "last-7-days":
      case "7days":
        builder.inLastDays(7);
        break;
      case "last-30-days":
      case "30days":
        builder.inLastDays(30);
        break;
      case "last-90-days":
      case "90days":
        builder.inLastDays(90);
        break;
      case "current-month":
      case "this-month":
        builder.inCurrentMonth();
        break;
      case "previous-month":
      case "last-month":
        builder.inPreviousMonth();
        break;
      case "current-year":
      case "this-year":
        builder.inCurrentYear();
        break;
      default:
        // Try to parse as ISO date range: "2024-01-01,2024-01-31"
        const parts = dateArg.split(",");
        if (parts.length === 2) {
          const start = new Date(parts[0].trim());
          const end = new Date(parts[1].trim());
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            builder.betweenDates(start, end);
          }
        }
    }
  }

  /**
   * Parse array arguments (comma-separated or multiple values)
   */
  private static parseArray(arg: string | string[]): string[] {
    if (Array.isArray(arg)) {
      return arg;
    }
    return arg.split(",").map((v) => v.trim());
  }
}

export default FilterBuilder;
