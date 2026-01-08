// src/aggregators/deal-size-metrics.ts

import {
  NormalizedRecord,
  DealSizeMetrics,
  DealSizeBand,
  getAllDealSizeBands,
} from "../types";
import { getBandMinValue, getBandMaxValue } from "../utils/deal-size-bands";

/**
 * Deal Size Metrics Aggregator
 * Analyzes transaction performance broken down by deal size bands
 * (under-1k, 1k-5k, 5k-10k, over-10k)
 *
 * Why it matters:
 * - Identify which deal sizes drive the most finance attachment
 * - Track approval rates by deal size
 * - Find deal size-specific friction points
 * - Optimize terms and rates by deal band
 * - Understand customer purchasing patterns
 */
export class DealSizeMetricsAggregator {
  /**
   * Aggregate metrics by deal size band
   */
  static aggregate(records: NormalizedRecord[]): DealSizeMetrics[] {
    // Group records by deal size band
    const grouped = new Map<DealSizeBand, NormalizedRecord[]>();

    for (const record of records) {
      if (!record.deal_size_band) {
        continue; // Skip records without deal size band
      }

      if (!grouped.has(record.deal_size_band)) {
        grouped.set(record.deal_size_band, []);
      }
      grouped.get(record.deal_size_band)!.push(record);
    }

    // Calculate metrics for each deal size band
    const metrics: DealSizeMetrics[] = [];

    for (const [band, bandRecords] of grouped.entries()) {
      const metric = this.calculateBandMetrics(band, bandRecords);
      metrics.push(metric);
    }

    // Sort by deal size (ascending) - smallest deals first
    return metrics.sort((a, b) => {
      const aMin = getBandMinValue(a.deal_size_band) || 0;
      const bMin = getBandMinValue(b.deal_size_band) || 0;
      return aMin - bMin;
    });
  }

  /**
   * Calculate metrics for a single deal size band
   */
  private static calculateBandMetrics(
    band: DealSizeBand,
    records: NormalizedRecord[],
  ): DealSizeMetrics {
    const totalOrders = records.length;

    // Count financed orders
    const financedOrders = records.filter((r) => r.finance_selected).length;
    const attachmentRate =
      totalOrders > 0 ? (financedOrders / totalOrders) * 100 : null;

    // Count approved applications
    const approvedApplications = records.filter(
      (r) => r.finance_selected && r.finance_decision_status === "approved",
    ).length;
    const approvalRate =
      financedOrders > 0 ? (approvedApplications / financedOrders) * 100 : null;

    // Calculate total and average order value
    const totalValue = records.reduce(
      (sum, r) => sum + (r.order_value || 0),
      0,
    );
    const avgOrderValue = totalOrders > 0 ? totalValue / totalOrders : null;

    // Get band min/max values
    const minValue = getBandMinValue(band) || 0;
    const maxValue = getBandMaxValue(band) || Infinity;

    return {
      deal_size_band: band,
      total_orders: totalOrders,
      financed_orders: financedOrders,
      attachment_rate: attachmentRate,
      approved_applications: approvedApplications,
      approval_rate: approvalRate,
      total_value: totalValue,
      avg_order_value: avgOrderValue,
      min_value: minValue,
      max_value: maxValue === Infinity ? 999999999 : maxValue,
    };
  }

  /**
   * Get metrics for a specific deal size band
   */
  static getBandMetrics(
    records: NormalizedRecord[],
    band: DealSizeBand,
  ): DealSizeMetrics | null {
    const bandRecords = records.filter((r) => r.deal_size_band === band);
    if (bandRecords.length === 0) {
      return null;
    }
    return this.calculateBandMetrics(band, bandRecords);
  }

  /**
   * Rank deal size bands by performance metric
   */
  static rankBands(
    metrics: DealSizeMetrics[],
    sortBy:
      | "approval_rate"
      | "attachment_rate"
      | "total_value"
      | "total_orders" = "approval_rate",
  ): DealSizeMetrics[] {
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
   * Get deal size performance summary
   */
  static getSummary(metrics: DealSizeMetrics[]): {
    best_band_by_approval: DealSizeMetrics | null;
    best_band_by_attachment: DealSizeMetrics | null;
    highest_value_band: DealSizeMetrics | null;
    largest_band_by_volume: DealSizeMetrics | null;
    total_value_all_bands: number;
  } {
    const sortedByApproval = this.rankBands(metrics, "approval_rate");
    const sortedByAttachment = this.rankBands(metrics, "attachment_rate");
    const sortedByValue = this.rankBands(metrics, "total_value");
    const sortedByVolume = this.rankBands(metrics, "total_orders");

    const totalValue = metrics.reduce((sum, m) => sum + m.total_value, 0);

    return {
      best_band_by_approval: sortedByApproval[0] || null,
      best_band_by_attachment: sortedByAttachment[0] || null,
      highest_value_band: sortedByValue[0] || null,
      largest_band_by_volume: sortedByVolume[0] || null,
      total_value_all_bands: totalValue,
    };
  }

  /**
   * Compare two deal size bands' performance
   */
  static compareBands(
    records: NormalizedRecord[],
    band1: DealSizeBand,
    band2: DealSizeBand,
  ): {
    band1: DealSizeMetrics | null;
    band2: DealSizeMetrics | null;
    approval_rate_diff: number | null;
    attachment_rate_diff: number | null;
    avg_value_diff: number | null;
  } {
    const m1 = this.getBandMetrics(records, band1);
    const m2 = this.getBandMetrics(records, band2);

    const approval_rate_diff =
      m1?.approval_rate != null && m2?.approval_rate != null
        ? m1.approval_rate - m2.approval_rate
        : null;

    const attachment_rate_diff =
      m1?.attachment_rate != null && m2?.attachment_rate != null
        ? m1.attachment_rate - m2.attachment_rate
        : null;

    const avg_value_diff =
      m1?.avg_order_value != null && m2?.avg_order_value != null
        ? m1.avg_order_value - m2.avg_order_value
        : null;

    return {
      band1: m1,
      band2: m2,
      approval_rate_diff,
      attachment_rate_diff,
      avg_value_diff,
    };
  }

  /**
   * Get value distribution across bands (as percentages)
   */
  static getValueDistribution(metrics: DealSizeMetrics[]): Array<{
    band: DealSizeBand;
    total_value: number;
    percentage: number;
    order_count: number;
  }> {
    const totalValue = metrics.reduce((sum, m) => sum + m.total_value, 0);

    return metrics.map((m) => ({
      band: m.deal_size_band,
      total_value: m.total_value,
      percentage: totalValue > 0 ? (m.total_value / totalValue) * 100 : 0,
      order_count: m.total_orders,
    }));
  }

  /**
   * Get volume distribution across bands (as percentages)
   */
  static getVolumeDistribution(metrics: DealSizeMetrics[]): Array<{
    band: DealSizeBand;
    order_count: number;
    percentage: number;
    total_value: number;
  }> {
    const totalOrders = metrics.reduce((sum, m) => sum + m.total_orders, 0);

    return metrics.map((m) => ({
      band: m.deal_size_band,
      order_count: m.total_orders,
      percentage: totalOrders > 0 ? (m.total_orders / totalOrders) * 100 : 0,
      total_value: m.total_value,
    }));
  }

  /**
   * Identify high-value deals (over £5,000)
   */
  static getHighValueDeals(records: NormalizedRecord[]): {
    total_high_value_orders: number;
    total_high_value_amount: number;
    high_value_percentage: number;
    high_value_metrics: DealSizeMetrics | null;
  } {
    // Filter for high-value bands (5k-10k and over-10k)
    const highValueRecords = records.filter(
      (r) =>
        r.deal_size_band === DealSizeBand.FROM_5K_TO_10K ||
        r.deal_size_band === DealSizeBand.OVER_10K,
    );

    const totalOrders = records.length;
    const highValueOrders = highValueRecords.length;
    const highValueAmount = highValueRecords.reduce(
      (sum, r) => sum + (r.order_value || 0),
      0,
    );

    // Combine metrics for high-value bands
    let combinedMetrics: DealSizeMetrics | null = null;
    const metrics = this.aggregate(records);
    const highValueBands = metrics.filter(
      (m) =>
        m.deal_size_band === DealSizeBand.FROM_5K_TO_10K ||
        m.deal_size_band === DealSizeBand.OVER_10K,
    );

    if (highValueBands.length > 0) {
      const totalFinanced = highValueBands.reduce(
        (sum, m) => sum + m.financed_orders,
        0,
      );
      const totalApproved = highValueBands.reduce(
        (sum, m) => sum + m.approved_applications,
        0,
      );
      const totalValue = highValueBands.reduce(
        (sum, m) => sum + m.total_value,
        0,
      );

      combinedMetrics = {
        deal_size_band: DealSizeBand.FROM_5K_TO_10K, // Representative band
        total_orders: highValueOrders,
        financed_orders: totalFinanced,
        attachment_rate:
          highValueOrders > 0 ? (totalFinanced / highValueOrders) * 100 : null,
        approved_applications: totalApproved,
        approval_rate:
          totalFinanced > 0 ? (totalApproved / totalFinanced) * 100 : null,
        total_value: totalValue,
        avg_order_value:
          highValueOrders > 0 ? totalValue / highValueOrders : null,
        min_value: 5000,
        max_value: 999999999,
      };
    }

    return {
      total_high_value_orders: highValueOrders,
      total_high_value_amount: highValueAmount,
      high_value_percentage:
        totalOrders > 0 ? (highValueOrders / totalOrders) * 100 : 0,
      high_value_metrics: combinedMetrics,
    };
  }

  /**
   * Get micro deals (under £1,000)
   */
  static getMicroDeals(records: NormalizedRecord[]): {
    total_micro_orders: number;
    total_micro_amount: number;
    micro_percentage: number;
    micro_metrics: DealSizeMetrics | null;
  } {
    const microRecords = records.filter(
      (r) => r.deal_size_band === DealSizeBand.UNDER_1K,
    );

    const totalOrders = records.length;
    const microOrders = microRecords.length;
    const microAmount = microRecords.reduce(
      (sum, r) => sum + (r.order_value || 0),
      0,
    );

    const microMetrics = this.getBandMetrics(records, DealSizeBand.UNDER_1K);

    return {
      total_micro_orders: microOrders,
      total_micro_amount: microAmount,
      micro_percentage: totalOrders > 0 ? (microOrders / totalOrders) * 100 : 0,
      micro_metrics: microMetrics,
    };
  }
}

export default DealSizeMetricsAggregator;
