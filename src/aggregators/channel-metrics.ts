// src/aggregators/channel-metrics.ts

import { NormalizedRecord, ChannelMetrics, SalesChannel } from "../types";

/**
 * Channel metrics aggregator
 * Analyzes transaction performance broken down by sales channel
 * (web, in-store, telesales, phone, marketplace)
 */
export class ChannelMetricsAggregator {
  /**
   * Aggregate metrics by sales channel
   */
  static aggregate(records: NormalizedRecord[]): ChannelMetrics[] {
    // Group records by sales channel
    const grouped = new Map<SalesChannel, NormalizedRecord[]>();

    for (const record of records) {
      if (!record.sales_channel) {
        continue; // Skip records without sales channel
      }

      if (!grouped.has(record.sales_channel)) {
        grouped.set(record.sales_channel, []);
      }
      grouped.get(record.sales_channel)!.push(record);
    }

    // Calculate metrics for each channel
    const metrics: ChannelMetrics[] = [];

    for (const [channel, channelRecords] of grouped.entries()) {
      const metric = this.calculateChannelMetrics(channel, channelRecords);
      metrics.push(metric);
    }

    // Sort by total orders descending
    return metrics.sort((a, b) => b.total_orders - a.total_orders);
  }

  /**
   * Calculate metrics for a single sales channel
   */
  private static calculateChannelMetrics(
    channel: SalesChannel,
    records: NormalizedRecord[]
  ): ChannelMetrics {
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
      sales_channel: channel,
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
   * Get metrics for a specific channel
   */
  static getChannelMetrics(
    records: NormalizedRecord[],
    channel: SalesChannel
  ): ChannelMetrics | null {
    const channelRecords = records.filter((r) => r.sales_channel === channel);
    if (channelRecords.length === 0) {
      return null;
    }
    return this.calculateChannelMetrics(channel, channelRecords);
  }

  /**
   * Compare performance across channels
   * Returns sorted list with best-performing channel first
   */
  static rankChannels(
    metrics: ChannelMetrics[],
    sortBy: "approval_rate" | "attachment_rate" | "total_value" | "total_orders" = "approval_rate"
  ): ChannelMetrics[] {
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
   * Get channel performance summary
   */
  static getSummary(metrics: ChannelMetrics[]): {
    best_channel_by_approval: ChannelMetrics | null;
    best_channel_by_attachment: ChannelMetrics | null;
    highest_value_channel: ChannelMetrics | null;
    most_active_channel: ChannelMetrics | null;
  } {
    const sortedByApproval = this.rankChannels(metrics, "approval_rate");
    const sortedByAttachment = this.rankChannels(metrics, "attachment_rate");
    const sortedByValue = this.rankChannels(metrics, "total_value");
    const sortedByVolume = this.rankChannels(metrics, "total_orders");

    return {
      best_channel_by_approval: sortedByApproval[0] || null,
      best_channel_by_attachment: sortedByAttachment[0] || null,
      highest_value_channel: sortedByValue[0] || null,
      most_active_channel: sortedByVolume[0] || null,
    };
  }
}

export default ChannelMetricsAggregator;
