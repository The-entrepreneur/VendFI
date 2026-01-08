// src/aggregators/segment-metrics.ts

import { NormalizedRecord, SegmentMetrics, CustomerSegment, getAllCustomerSegments } from "../types";

/**
 * Segment Metrics Aggregator
 * Analyzes transaction performance broken down by customer segment
 * (SME-Small, SME-Medium, Enterprise, Startup)
 *
 * Why it matters:
 * - Identify which customer types drive the most finance demand
 * - Track approval rates by segment
 * - Find segment-specific friction or opportunities
 * - Benchmark performance across different customer sizes
 */
export class SegmentMetricsAggregator {
  /**
   * Aggregate metrics by customer segment
   */
  static aggregate(records: NormalizedRecord[]): SegmentMetrics[] {
    // Group records by customer segment
    const grouped = new Map<CustomerSegment, NormalizedRecord[]>();

    for (const record of records) {
      if (!record.customer_segment) {
        continue; // Skip records without customer segment
      }

      if (!grouped.has(record.customer_segment)) {
        grouped.set(record.customer_segment, []);
      }
      grouped.get(record.customer_segment)!.push(record);
    }

    // Calculate metrics for each segment
    const metrics: SegmentMetrics[] = [];

    for (const [segment, segmentRecords] of grouped.entries()) {
      const metric = this.calculateSegmentMetrics(segment, segmentRecords);
      metrics.push(metric);
    }

    // Sort by total orders descending (largest segments first)
    return metrics.sort((a, b) => b.total_orders - a.total_orders);
  }

  /**
   * Calculate metrics for a single customer segment
   */
  private static calculateSegmentMetrics(
    segment: CustomerSegment,
    records: NormalizedRecord[]
  ): SegmentMetrics {
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

    return {
      customer_segment: segment,
      total_orders: totalOrders,
      financed_orders: financedOrders,
      attachment_rate: attachmentRate,
      approved_applications: approvedApplications,
      approval_rate: approvalRate,
      total_value: totalValue,
      avg_order_value: avgOrderValue,
    };
  }

  /**
   * Get metrics for a specific segment
   */
  static getSegmentMetrics(
    records: NormalizedRecord[],
    segment: CustomerSegment
  ): SegmentMetrics | null {
    const segmentRecords = records.filter((r) => r.customer_segment === segment);
    if (segmentRecords.length === 0) {
      return null;
    }
    return this.calculateSegmentMetrics(segment, segmentRecords);
  }

  /**
   * Rank segments by performance metric
   */
  static rankSegments(
    metrics: SegmentMetrics[],
    sortBy: "approval_rate" | "attachment_rate" | "total_value" | "total_orders" = "approval_rate"
  ): SegmentMetrics[] {
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
   * Get segment performance summary
   */
  static getSummary(metrics: SegmentMetrics[]): {
    best_segment_by_approval: SegmentMetrics | null;
    best_segment_by_attachment: SegmentMetrics | null;
    highest_value_segment: SegmentMetrics | null;
    largest_segment_by_volume: SegmentMetrics | null;
  } {
    const sortedByApproval = this.rankSegments(metrics, "approval_rate");
    const sortedByAttachment = this.rankSegments(metrics, "attachment_rate");
    const sortedByValue = this.rankSegments(metrics, "total_value");
    const sortedByVolume = this.rankSegments(metrics, "total_orders");

    return {
      best_segment_by_approval: sortedByApproval[0] || null,
      best_segment_by_attachment: sortedByAttachment[0] || null,
      highest_value_segment: sortedByValue[0] || null,
      largest_segment_by_volume: sortedByVolume[0] || null,
    };
  }

  /**
   * Compare two segments' performance
   */
  static compare(
    records: NormalizedRecord[],
    segment1: CustomerSegment,
    segment2: CustomerSegment
  ): {
    segment1: SegmentMetrics | null;
    segment2: SegmentMetrics | null;
    approval_rate_diff: number | null;
    attachment_rate_diff: number | null;
    avg_value_diff: number | null;
  } {
    const metrics = this.aggregate(records);
    const m1 = metrics.find((m) => m.customer_segment === segment1) || null;
    const m2 = metrics.find((m) => m.customer_segment === segment2) || null;

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
      segment1: m1,
      segment2: m2,
      approval_rate_diff,
      attachment_rate_diff,
      avg_value_diff,
    };
  }

  /**
   * Get SME segments only (small + medium)
   */
  static getSMEMetrics(metrics: SegmentMetrics[]): SegmentMetrics[] {
    return metrics.filter(
      (m) =>
        m.customer_segment === "sme-small" || m.customer_segment === "sme-medium"
    );
  }

  /**
   * Compare SME vs Enterprise performance
   */
  static compareSMEVsEnterprise(
    records: NormalizedRecord[]
  ): {
    sme_total_orders: number;
    enterprise_total_orders: number;
    sme_avg_approval: number | null;
    enterprise_avg_approval: number | null;
    sme_total_value: number;
    enterprise_total_value: number;
  } {
    const metrics = this.aggregate(records);
    const smeMetrics = this.getSMEMetrics(metrics);
    const enterpriseMetrics = metrics.filter(
      (m) => m.customer_segment === "enterprise"
    );

    const smeTotalOrders = smeMetrics.reduce((sum, m) => sum + m.total_orders, 0);
    const enterpriseTotalOrders = enterpriseMetrics.reduce(
      (sum, m) => sum + m.total_orders,
      0
    );

    const smeAvgApproval =
      smeMetrics.length > 0
        ? smeMetrics.reduce((sum, m) => sum + (m.approval_rate || 0), 0) /
          smeMetrics.length
        : null;

    const enterpriseAvgApproval =
      enterpriseMetrics.length > 0
        ? enterpriseMetrics.reduce((sum, m) => sum + (m.approval_rate || 0), 0) /
          enterpriseMetrics.length
        : null;

    const smeTotalValue = smeMetrics.reduce((sum, m) => sum + m.total_value, 0);
    const enterpriseTotalValue = enterpriseMetrics.reduce(
      (sum, m) => sum + m.total_value,
      0
    );

    return {
      sme_total_orders: smeTotalOrders,
      enterprise_total_orders: enterpriseTotalOrders,
      sme_avg_approval: smeAvgApproval,
      enterprise_avg_approval: enterpriseAvgApproval,
      sme_total_value: smeTotalValue,
      enterprise_total_value: enterpriseTotalValue,
    };
  }
}

export default SegmentMetricsAggregator;
