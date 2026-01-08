// src/aggregators/geography-metrics.ts

import { NormalizedRecord, GeographyMetrics, Currency } from "../types";

/**
 * Geography Metrics Aggregator
 * Analyzes transaction performance broken down by geographic location
 * (country and region)
 *
 * Why it matters:
 * - Identify geographic markets with highest finance attachment
 * - Track approval rates by country/region
 * - Find regional friction points
 * - Optimize regional pricing and terms
 * - Support multi-currency and multi-country operations
 */
export class GeographyMetricsAggregator {
  /**
   * Aggregate metrics by geography (country level)
   */
  static aggregateByCountry(records: NormalizedRecord[]): GeographyMetrics[] {
    // Group records by country
    const grouped = new Map<string, NormalizedRecord[]>();

    for (const record of records) {
      if (!record.geography?.country) {
        continue; // Skip records without country
      }

      const country = record.geography.country;
      if (!grouped.has(country)) {
        grouped.set(country, []);
      }
      grouped.get(country)!.push(record);
    }

    // Calculate metrics for each country
    const metrics: GeographyMetrics[] = [];

    for (const [country, countryRecords] of grouped.entries()) {
      const metric = this.calculateGeographyMetrics(country, undefined, countryRecords);
      metrics.push(metric);
    }

    // Sort by total orders descending
    return metrics.sort((a, b) => b.total_orders - a.total_orders);
  }

  /**
   * Aggregate metrics by geography (country + region level)
   */
  static aggregateByRegion(records: NormalizedRecord[]): GeographyMetrics[] {
    // Group records by country + region
    const grouped = new Map<string, NormalizedRecord[]>();

    for (const record of records) {
      if (!record.geography?.country) {
        continue; // Skip records without country
      }

      const key = `${record.geography.country}|${record.geography.region || ""}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(record);
    }

    // Calculate metrics for each country-region combination
    const metrics: GeographyMetrics[] = [];

    for (const [key, regionRecords] of grouped.entries()) {
      const [country, region] = key.split("|");
      const metric = this.calculateGeographyMetrics(
        country,
        region || undefined,
        regionRecords
      );
      metrics.push(metric);
    }

    // Sort by total orders descending
    return metrics.sort((a, b) => b.total_orders - a.total_orders);
  }

  /**
   * Calculate metrics for a single geography
   */
  private static calculateGeographyMetrics(
    country: string,
    region: string | undefined,
    records: NormalizedRecord[]
  ): GeographyMetrics {
    const totalOrders = records.length;

    // Count financed orders
    const financedOrders = records.filter((r) => r.finance_selected).length;
    const attachmentRate =
      totalOrders > 0 ? (financedOrders / totalOrders) * 100 : null;

    // Count approved applications
    const approvedApplications = records.filter(
      (r) => r.finance_selected && r.finance_decision_status === "approved"
    ).length;
    const approvalRate =
      financedOrders > 0 ? (approvedApplications / financedOrders) * 100 : null;

    // Calculate total and average order value
    const totalValue = records.reduce((sum, r) => sum + (r.order_value || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalValue / totalOrders : null;

    // Build currency summary
    const currencyMap = new Map<Currency, { total_value: number; order_count: number }>();
    for (const record of records) {
      if (record.currency) {
        if (!currencyMap.has(record.currency)) {
          currencyMap.set(record.currency, { total_value: 0, order_count: 0 });
        }
        const curr = currencyMap.get(record.currency)!;
        curr.total_value += record.order_value || 0;
        curr.order_count += 1;
      }
    }

    const currencySummary = Array.from(currencyMap.entries()).map(([currency, data]) => ({
      currency,
      ...data,
    }));

    return {
      country,
      region,
      total_orders: totalOrders,
      financed_orders: financedOrders,
      attachment_rate: attachmentRate,
      approved_applications: approvedApplications,
      approval_rate: approvalRate,
      total_value: totalValue,
      avg_order_value: avgOrderValue,
      currency_summary: currencySummary.length > 0 ? currencySummary : undefined,
    };
  }

  /**
   * Get metrics for a specific country
   */
  static getCountryMetrics(
    records: NormalizedRecord[],
    country: string
  ): GeographyMetrics | null {
    const countryRecords = records.filter((r) => r.geography?.country === country);
    if (countryRecords.length === 0) {
      return null;
    }
    return this.calculateGeographyMetrics(country, undefined, countryRecords);
  }

  /**
   * Get metrics for a specific region within a country
   */
  static getRegionMetrics(
    records: NormalizedRecord[],
    country: string,
    region: string
  ): GeographyMetrics | null {
    const regionRecords = records.filter(
      (r) => r.geography?.country === country && r.geography?.region === region
    );
    if (regionRecords.length === 0) {
      return null;
    }
    return this.calculateGeographyMetrics(country, region, regionRecords);
  }

  /**
   * Rank geographies by performance metric
   */
  static rankGeographies(
    metrics: GeographyMetrics[],
    sortBy: "approval_rate" | "attachment_rate" | "total_value" | "total_orders" = "approval_rate"
  ): GeographyMetrics[] {
    const sorted = [...metrics];

    switch (sortBy) {
      case "approval_rate":
        return sorted.sort((a, b) => {
          const aRate = a.approval_rate ?? 0;
          const bRate = b.approval_rate ?? 0;
          return bRate - aRate;
        });

      case "attachment_rate":
        return sorted.sort((a, b) => {
          const aRate = a.attachment_rate ?? 0;
          const bRate = b.attachment_rate ?? 0;
          return bRate - aRate;
        });

      case "total_value":
        return sorted.sort((a, b) => b.total_value - a.total_value);

      case "total_orders":
        return sorted.sort((a, b) => b.total_orders - a.total_orders);

      default:
        return sorted;
    }
  }

  /**
   * Get geography performance summary
   */
  static getSummary(metrics: GeographyMetrics[]): {
    best_geography_by_approval: GeographyMetrics | null;
    best_geography_by_attachment: GeographyMetrics | null;
    highest_value_geography: GeographyMetrics | null;
    largest_geography_by_volume: GeographyMetrics | null;
    total_countries: number;
  } {
    const sortedByApproval = this.rankGeographies(metrics, "approval_rate");
    const sortedByAttachment = this.rankGeographies(metrics, "attachment_rate");
    const sortedByValue = this.rankGeographies(metrics, "total_value");
    const sortedByVolume = this.rankGeographies(metrics, "total_orders");

    // Count unique countries (metrics with no region)
    const uniqueCountries = new Set(
      metrics.filter((m) => !m.region).map((m) => m.country)
    ).size;

    return {
      best_geography_by_approval: sortedByApproval[0] || null,
      best_geography_by_attachment: sortedByAttachment[0] || null,
      highest_value_geography: sortedByValue[0] || null,
      largest_geography_by_volume: sortedByVolume[0] || null,
      total_countries: uniqueCountries,
    };
  }

  /**
   * Compare two countries' performance
   */
  static compareCountries(
    records: NormalizedRecord[],
    country1: string,
    country2: string
  ): {
    country1: GeographyMetrics | null;
    country2: GeographyMetrics | null;
    approval_rate_diff: number | null;
    attachment_rate_diff: number | null;
    value_diff: number | null;
  } {
    const m1 = this.getCountryMetrics(records, country1);
    const m2 = this.getCountryMetrics(records, country2);

    const approval_rate_diff =
      m1?.approval_rate != null && m2?.approval_rate != null
        ? m1.approval_rate - m2.approval_rate
        : null;

    const attachment_rate_diff =
      m1?.attachment_rate != null && m2?.attachment_rate != null
        ? m1.attachment_rate - m2.attachment_rate
        : null;

    const value_diff =
      m1?.total_value != null && m2?.total_value != null
        ? m1.total_value - m2.total_value
        : null;

    return {
      country1: m1,
      country2: m2,
      approval_rate_diff,
      attachment_rate_diff,
      value_diff,
    };
  }

  /**
   * Get all regions for a country
   */
  static getRegionsInCountry(
    records: NormalizedRecord[],
    country: string
  ): GeographyMetrics[] {
    const countryRecords = records.filter((r) => r.geography?.country === country);
    if (countryRecords.length === 0) {
      return [];
    }

    // Group by region
    const grouped = new Map<string, NormalizedRecord[]>();
    for (const record of countryRecords) {
      const region = record.geography?.region || "_no_region";
      if (!grouped.has(region)) {
        grouped.set(region, []);
      }
      grouped.get(region)!.push(record);
    }

    // Calculate metrics for each region
    const metrics: GeographyMetrics[] = [];
    for (const [region, regionRecords] of grouped.entries()) {
      const actualRegion = region === "_no_region" ? undefined : region;
      const metric = this.calculateGeographyMetrics(country, actualRegion, regionRecords);
      metrics.push(metric);
    }

    return metrics.sort((a, b) => b.total_orders - a.total_orders);
  }

  /**
   * Get multi-currency summary for a geography
   */
  static getCurrencySummary(metric: GeographyMetrics): {
    primary_currency: Currency | null;
    total_currencies: number;
    currency_distribution: Array<{ currency: Currency; percentage: number }>;
  } {
    if (!metric.currency_summary || metric.currency_summary.length === 0) {
      return {
        primary_currency: null,
        total_currencies: 0,
        currency_distribution: [],
      };
    }

    const sorted = [...metric.currency_summary].sort((a, b) => b.order_count - a.order_count);
    const total = metric.currency_summary.reduce((sum, c) => sum + c.order_count, 0);

    const distribution = sorted.map((c) => ({
      currency: c.currency,
      percentage: (c.order_count / total) * 100,
    }));

    return {
      primary_currency: sorted[0]?.currency || null,
      total_currencies: metric.currency_summary.length,
      currency_distribution: distribution,
    };
  }
}

export default GeographyMetricsAggregator;
