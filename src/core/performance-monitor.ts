// src/core/performance-monitor.ts
// Performance monitoring and optimization for CSV processing

import { EnhancedImportResult } from '../parsers/csv-parser-robust';
import { ProcessingDiagnostics } from './processor-enhanced';

/**
 * Performance metrics for a single processing run
 */
export interface ProcessingMetrics {
  vendorId: string;
  timestamp: Date;

  // Volume metrics
  totalRows: number;
  successfulRows: number;
  failedRows: number;

  // Performance metrics
  parseTimeMs: number;
  processTimeMs: number;
  totalTimeMs: number;
  rowsPerSecond: number;

  // Quality metrics
  dataQuality: {
    completeness: number;
    consistency: number;
    accuracy: number;
  };

  // Mapping metrics
  mappingConfidence: number;
  unmappedFields: number;

  // Error metrics
  errorRate: number;
  duplicateRate: number;
  warningCount: number;

  // System metrics
  memoryUsageMB?: number;
  cpuUsagePercent?: number;
}

/**
 * Vendor performance profile
 */
export interface VendorProfile {
  vendorId: string;
  processingCount: number;
  averagePerformance: {
    rowsPerSecond: number;
    parseTimeMs: number;
    accuracy: number;
    errorRate: number;
  };
  bestPerformance: ProcessingMetrics;
  worstPerformance: ProcessingMetrics;
  trends: {
    performance: Array<{ date: Date; rowsPerSecond: number }>;
    quality: Array<{ date: Date; accuracy: number }>;
  };
  recommendations: string[];
}

/**
 * Performance thresholds for alerting
 */
export interface PerformanceThresholds {
  minRowsPerSecond: number;
  maxParseTimeMs: number;
  minDataAccuracy: number;
  maxErrorRate: number;
  maxDuplicateRate: number;
}

/**
 * Performance monitoring and optimization system
 */
export class PerformanceMonitor {
  private metrics: ProcessingMetrics[] = [];
  private vendorProfiles: Map<string, VendorProfile> = new Map();
  private thresholds: PerformanceThresholds;

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = {
      minRowsPerSecond: 1000,      // At least 1000 rows/sec
      maxParseTimeMs: 5000,        // Max 5 seconds parsing
      minDataAccuracy: 0.7,        // At least 70% accuracy
      maxErrorRate: 0.3,           // Max 30% error rate
      maxDuplicateRate: 0.1,       // Max 10% duplicate rate
      ...thresholds,
    };
  }

  /**
   * Record processing metrics from a completed run
   */
  recordProcessing(
    vendorId: string,
    importResult: EnhancedImportResult,
    diagnostics: ProcessingDiagnostics,
    additionalMetrics?: {
      memoryUsageMB?: number;
      cpuUsagePercent?: number;
    }
  ): ProcessingMetrics {
    const timestamp = new Date();

    // Calculate metrics
    const totalRows = importResult.total_rows;
    const successfulRows = importResult.successfully_normalized;
    const failedRows = importResult.failed_rows;

    const parseTimeMs = importResult.statistics.parseTimeMs;
    const processTimeMs = diagnostics.performance.processTimeMs;
    const totalTimeMs = parseTimeMs + processTimeMs;
    const rowsPerSecond = totalTimeMs > 0
      ? Math.round((totalRows / totalTimeMs) * 1000)
      : 0;

    const errorRate = totalRows > 0 ? failedRows / totalRows : 0;
    const duplicateRate = totalRows > 0
      ? importResult.statistics.duplicateOrderIds / totalRows
      : 0;

    const metrics: ProcessingMetrics = {
      vendorId,
      timestamp,
      totalRows,
      successfulRows,
      failedRows,
      parseTimeMs,
      processTimeMs,
      totalTimeMs,
      rowsPerSecond,
      dataQuality: diagnostics.dataQuality,
      mappingConfidence: diagnostics.mappingQuality.confidence,
      unmappedFields: diagnostics.mappingQuality.unmappedFields.length,
      errorRate,
      duplicateRate,
      warningCount: importResult.warnings.length,
      ...additionalMetrics,
    };

    // Store metrics
    this.metrics.push(metrics);

    // Update vendor profile
    this.updateVendorProfile(vendorId, metrics);

    // Check thresholds and generate alerts
    this.checkThresholds(vendorId, metrics);

    return metrics;
  }

  /**
   * Update vendor performance profile
   */
  private updateVendorProfile(vendorId: string, newMetrics: ProcessingMetrics): void {
    let profile = this.vendorProfiles.get(vendorId);

    if (!profile) {
      // Create new profile
      profile = {
        vendorId,
        processingCount: 0,
        averagePerformance: {
          rowsPerSecond: 0,
          parseTimeMs: 0,
          accuracy: 0,
          errorRate: 0,
        },
        bestPerformance: newMetrics,
        worstPerformance: newMetrics,
        trends: {
          performance: [],
          quality: [],
        },
        recommendations: [],
      };
    }

    // Update counts
    profile.processingCount++;

    // Update averages (moving average)
    const count = profile.processingCount;
    profile.averagePerformance = {
      rowsPerSecond: this.calculateMovingAverage(
        profile.averagePerformance.rowsPerSecond,
        newMetrics.rowsPerSecond,
        count
      ),
      parseTimeMs: this.calculateMovingAverage(
        profile.averagePerformance.parseTimeMs,
        newMetrics.parseTimeMs,
        count
      ),
      accuracy: this.calculateMovingAverage(
        profile.averagePerformance.accuracy,
        newMetrics.dataQuality.accuracy,
        count
      ),
      errorRate: this.calculateMovingAverage(
        profile.averagePerformance.errorRate,
        newMetrics.errorRate,
        count
      ),
    };

    // Update best/worst performance
    if (newMetrics.rowsPerSecond > profile.bestPerformance.rowsPerSecond) {
      profile.bestPerformance = newMetrics;
    }
    if (newMetrics.rowsPerSecond < profile.worstPerformance.rowsPerSecond) {
      profile.worstPerformance = newMetrics;
    }

    // Update trends (keep last 30 days)
    profile.trends.performance.push({
      date: newMetrics.timestamp,
      rowsPerSecond: newMetrics.rowsPerSecond,
    });
    profile.trends.quality.push({
      date: newMetrics.timestamp,
      accuracy: newMetrics.dataQuality.accuracy,
    });

    // Keep only last 30 entries per trend
    if (profile.trends.performance.length > 30) {
      profile.trends.performance.shift();
      profile.trends.quality.shift();
    }

    // Generate recommendations
    profile.recommendations = this.generateRecommendations(profile, newMetrics);

    this.vendorProfiles.set(vendorId, profile);
  }

  /**
   * Calculate moving average
   */
  private calculateMovingAverage(current: number, newValue: number, count: number): number {
    return (current * (count - 1) + newValue) / count;
  }

  /**
   * Check performance against thresholds
   */
  private checkThresholds(vendorId: string, metrics: ProcessingMetrics): void {
    const alerts: string[] = [];

    if (metrics.rowsPerSecond < this.thresholds.minRowsPerSecond) {
      alerts.push(`Performance alert: ${metrics.rowsPerSecond} rows/sec (min: ${this.thresholds.minRowsPerSecond})`);
    }

    if (metrics.parseTimeMs > this.thresholds.maxParseTimeMs) {
      alerts.push(`Parse time alert: ${metrics.parseTimeMs}ms (max: ${this.thresholds.maxParseTimeMs}ms)`);
    }

    if (metrics.dataQuality.accuracy < this.thresholds.minDataAccuracy) {
      alerts.push(`Data quality alert: ${(metrics.dataQuality.accuracy * 100).toFixed(1)}% (min: ${this.thresholds.minDataAccuracy * 100}%)`);
    }

    if (metrics.errorRate > this.thresholds.maxErrorRate) {
      alerts.push(`Error rate alert: ${(metrics.errorRate * 100).toFixed(1)}% (max: ${this.thresholds.maxErrorRate * 100}%)`);
    }

    if (metrics.duplicateRate > this.thresholds.maxDuplicateRate) {
      alerts.push(`Duplicate rate alert: ${(metrics.duplicateRate * 100).toFixed(1)}% (max: ${this.thresholds.maxDuplicateRate * 100}%)`);
    }

    if (alerts.length > 0) {
      console.warn(`⚠️ Performance alerts for ${vendorId}:`);
      alerts.forEach(alert => console.warn(`   ${alert}`));
    }
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(profile: VendorProfile, latestMetrics: ProcessingMetrics): string[] {
    const recommendations: string[] = [];

    // Performance recommendations
    if (latestMetrics.rowsPerSecond < 1000 && latestMetrics.totalRows > 10000) {
      recommendations.push('Consider using streaming for large files (>10K rows)');
    }

    if (latestMetrics.parseTimeMs > 1000 && latestMetrics.totalRows < 1000) {
      recommendations.push('Small file with slow parsing - check for complex validation rules');
    }

    if (profile.processingCount > 3 && latestMetrics.mappingConfidence > 0.8) {
      recommendations.push('Enable mapping caching for this vendor');
    }

    // Quality recommendations
    if (latestMetrics.errorRate > 0.2) {
      recommendations.push('High error rate - consider lenient processing mode');
    }

    if (latestMetrics.duplicateRate > 0.05) {
      recommendations.push('High duplicate rate - review data source for unique IDs');
    }

    if (latestMetrics.dataQuality.accuracy < 0.8) {
      recommendations.push('Low data quality - validate CSV export settings');
    }

    if (latestMetrics.unmappedFields > 3) {
      recommendations.push(`${latestMetrics.unmappedFields} unmapped fields - consider custom mapping`);
    }

    // Trend-based recommendations
    if (profile.trends.performance.length >= 5) {
      const recentPerf = profile.trends.performance.slice(-5);
      const avgRecent = recentPerf.reduce((sum, p) => sum + p.rowsPerSecond, 0) / recentPerf.length;
      const avgOverall = profile.averagePerformance.rowsPerSecond;

      if (avgRecent < avgOverall * 0.7) {
        recommendations.push('Performance degradation detected - investigate recent changes');
      }
    }

    return recommendations;
  }

  /**
   * Get performance statistics
   */
  getStatistics(): {
    totalProcessings: number;
    averagePerformance: {
      rowsPerSecond: number;
      parseTimeMs: number;
      accuracy: number;
    };
    vendorCount: number;
    alerts: Array<{ vendorId: string; metric: string; value: number; threshold: number }>;
  } {
    if (this.metrics.length === 0) {
      return {
        totalProcessings: 0,
        averagePerformance: { rowsPerSecond: 0, parseTimeMs: 0, accuracy: 0 },
        vendorCount: 0,
        alerts: [],
      };
    }

    // Calculate averages
    const totalRowsPerSecond = this.metrics.reduce((sum, m) => sum + m.rowsPerSecond, 0);
    const totalParseTime = this.metrics.reduce((sum, m) => sum + m.parseTimeMs, 0);
    const totalAccuracy = this.metrics.reduce((sum, m) => sum + m.dataQuality.accuracy, 0);

    // Find current threshold violations
    const alerts: Array<{ vendorId: string; metric: string; value: number; threshold: number }> = [];

    this.metrics.slice(-10).forEach(metric => { // Check last 10 processings
      if (metric.rowsPerSecond < this.thresholds.minRowsPerSecond) {
        alerts.push({
          vendorId: metric.vendorId,
          metric: 'rowsPerSecond',
          value: metric.rowsPerSecond,
          threshold: this.thresholds.minRowsPerSecond,
        });
      }

      if (metric.dataQuality.accuracy < this.thresholds.minDataAccuracy) {
        alerts.push({
          vendorId: metric.vendorId,
          metric: 'dataAccuracy',
          value: metric.dataQuality.accuracy,
          threshold: this.thresholds.minDataAccuracy,
        });
      }
    });

    return {
      totalProcessings: this.metrics.length,
      averagePerformance: {
        rowsPerSecond: Math.round(totalRowsPerSecond / this.metrics.length),
        parseTimeMs: Math.round(totalParseTime / this.metrics.length),
        accuracy: totalAccuracy / this.metrics.length,
      },
      vendorCount: this.vendorProfiles.size,
      alerts,
    };
  }

  /**
   * Get vendor profile
   */
  getVendorProfile(vendorId: string): VendorProfile | undefined {
    return this.vendorProfiles.get(vendorId);
  }

  /**
   * Get all vendor profiles
   */
  getAllVendorProfiles(): Map<string, VendorProfile> {
    return new Map(this.vendorProfiles);
  }

  /**
   * Get performance trends for a vendor
   */
  getPerformanceTrend(vendorId: string, days: number = 30): {
    dates: Date[];
    performance: number[];
    quality: number[];
  } {
    const profile = this.vendorProfiles.get(vendorId);
    if (!profile) {
      return { dates: [], performance: [], quality: [] };
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const filteredPerf = profile.trends.performance.filter(p => p.date >= cutoff);
    const filteredQuality = profile.trends.quality.filter(q => q.date >= cutoff);

    return {
      dates: filteredPerf.map(p => p.date),
      performance: filteredPerf.map(p => p.rowsPerSecond),
      quality: filteredQuality.map(q => q.accuracy),
    };
  }

  /**
   * Get optimization recommendations for all vendors
   */
  getGlobalRecommendations(): Array<{ vendorId: string; recommendations: string[] }> {
    const recommendations: Array<{ vendorId: string; recommendations: string[] }> = [];

    this.vendorProfiles.forEach((profile, vendorId) => {
      if (profile.recommendations.length > 0) {
        recommendations.push({
          vendorId,
          recommendations: profile.recommendations,
        });
      }
    });

    return recommendations;
  }

  /**
   * Export performance data to JSON
   */
  exportData(filePath: string): void {
    const fs = require('fs');
    const data = {
      metrics: this.metrics,
      vendorProfiles: Object.fromEntries(this.vendorProfiles),
      thresholds: this.thresholds,
      statistics: this.getStatistics(),
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Exported performance data to ${filePath}`);
  }

  /**
   * Clear old metrics (keep last N days)
   */
  cleanupOldMetrics(daysToKeep: number = 90): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);

    const initialCount = this.metrics.length;
    this.metrics = this.metrics.filter(metric => metric.timestamp >= cutoff);

    const removed = initialCount - this.metrics.length;
    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} old metrics (older than ${daysToKeep} days)`);
    }
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.metrics = [];
    this.vendorProfiles.clear();
    console.log('🔄 Performance monitor reset');
  }
}
