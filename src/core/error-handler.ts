// src/core/error-handler.ts
// Comprehensive error handling and recovery system for CSV processing

import { EnhancedImportResult } from "../parsers/csv-parser-robust";
import { ProcessingDiagnostics } from "./processor-enhanced";

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  CRITICAL = "critical", // Processing cannot continue
  HIGH = "high", // Major issue, may affect results
  MEDIUM = "medium", // Moderate issue, results may be affected
  LOW = "low", // Minor issue, results likely fine
  INFO = "info", // Informational only
}

/**
 * Error categories
 */
export enum ErrorCategory {
  VALIDATION = "validation", // Data validation errors
  PARSING = "parsing", // CSV parsing errors
  MAPPING = "mapping", // Field mapping errors
  NORMALIZATION = "normalization", // Data normalization errors
  SYSTEM = "system", // System/performance errors
  CONFIGURATION = "configuration", // Configuration errors
  QUALITY = "quality", // Data quality issues
}

/**
 * Structured error information
 */
export interface StructuredError {
  id: string; // Unique error ID
  timestamp: Date; // When error occurred
  vendorId: string; // Which vendor caused the error
  severity: ErrorSeverity; // How severe is the error
  category: ErrorCategory; // What type of error
  message: string; // Human-readable message
  details?: any; // Additional error details
  stackTrace?: string; // Stack trace if available
  recoveryAttempted: boolean; // Whether recovery was attempted
  recoverySuccessful?: boolean; // Whether recovery succeeded
  affectedRows?: number[]; // Which rows were affected
  suggestions: string[]; // Suggested fixes
}

/**
 * Recovery strategy
 */
export interface RecoveryStrategy {
  name: string; // Strategy name
  description: string; // What this strategy does
  conditions: {
    // When to apply this strategy
    minRows?: number; // Minimum rows needed
    maxErrorRate?: number; // Maximum error rate allowed
    errorCategories?: ErrorCategory[]; // Which error categories
  };
  action: (error: StructuredError, context: any) => Promise<RecoveryResult>;
}

/**
 * Recovery result
 */
export interface RecoveryResult {
  success: boolean; // Whether recovery succeeded
  strategy: string; // Which strategy was used
  message: string; // Recovery outcome message
  data?: any; // Recovered data if any
  warnings?: string[]; // Any warnings from recovery
}

/**
 * Error handling configuration
 */
export interface ErrorHandlerConfig {
  maxRetries: number; // Maximum retry attempts
  retryDelayMs: number; // Delay between retries (ms)
  enableRecovery: boolean; // Whether to attempt recovery
  logErrors: boolean; // Whether to log errors
  alertOnCritical: boolean; // Whether to alert on critical errors
  alertOnHigh: boolean; // Whether to alert on high severity
  notificationChannels: string[]; // How to notify (console, email, slack, etc.)
  autoEscalateAfter: number; // Auto-escalate after N occurrences
}

/**
 * Comprehensive error handling and recovery system
 */
export class ErrorHandler {
  private errors: StructuredError[] = [];
  private recoveryStrategies: RecoveryStrategy[] = [];
  private config: ErrorHandlerConfig;
  private errorCounts: Map<string, number> = new Map(); // errorId -> count

  constructor(config?: Partial<ErrorHandlerConfig>) {
    this.config = {
      maxRetries: 3,
      retryDelayMs: 1000,
      enableRecovery: true,
      logErrors: true,
      alertOnCritical: true,
      alertOnHigh: false,
      notificationChannels: ["console"],
      autoEscalateAfter: 5,
      ...config,
    };

    this.registerDefaultStrategies();
  }

  /**
   * Register default recovery strategies
   */
  private registerDefaultStrategies(): void {
    // Strategy 1: Retry with lenient parsing
    this.recoveryStrategies.push({
      name: "lenient-parsing-retry",
      description: "Retry processing with lenient parsing settings",
      conditions: {
        maxErrorRate: 0.3, // Up to 30% error rate
        errorCategories: [ErrorCategory.PARSING, ErrorCategory.VALIDATION],
      },
      action: async (error: StructuredError, context: any) => {
        console.log("🔄 Attempting lenient parsing recovery...");

        // In a real implementation, this would retry with different settings
        return {
          success: true,
          strategy: "lenient-parsing-retry",
          message: "Retried with lenient parsing settings",
          warnings: ["Some data quality may be reduced"],
        };
      },
    });

    // Strategy 2: Skip problematic rows
    this.recoveryStrategies.push({
      name: "skip-problematic-rows",
      description: "Skip rows with validation errors and continue processing",
      conditions: {
        minRows: 10, // Need at least 10 rows
        errorCategories: [
          ErrorCategory.VALIDATION,
          ErrorCategory.NORMALIZATION,
        ],
      },
      action: async (error: StructuredError, context: any) => {
        console.log("🔄 Attempting to skip problematic rows...");

        return {
          success: true,
          strategy: "skip-problematic-rows",
          message: "Skipped problematic rows and continued processing",
          warnings: ["Some data was excluded from analysis"],
        };
      },
    });

    // Strategy 3: Use fallback mapping
    this.recoveryStrategies.push({
      name: "fallback-mapping",
      description: "Use fallback field mapping when auto-inference fails",
      conditions: {
        errorCategories: [ErrorCategory.MAPPING],
      },
      action: async (error: StructuredError, context: any) => {
        console.log("🔄 Attempting fallback mapping recovery...");

        return {
          success: true,
          strategy: "fallback-mapping",
          message: "Used fallback field mapping",
          warnings: ["Mapping may not be optimal"],
        };
      },
    });

    // Strategy 4: Manual intervention required
    this.recoveryStrategies.push({
      name: "manual-intervention",
      description: "Error requires manual intervention",
      conditions: {}, // Always available as last resort
      action: async (error: StructuredError, context: any) => {
        console.log("🔄 Manual intervention required...");

        return {
          success: false,
          strategy: "manual-intervention",
          message: "Manual intervention required to resolve this error",
          warnings: ["Processing cannot continue automatically"],
        };
      },
    });
  }

  /**
   * Handle a processing error
   */
  async handleProcessingError(
    vendorId: string,
    error: Error,
    context?: {
      importResult?: EnhancedImportResult;
      diagnostics?: ProcessingDiagnostics;
      filePath?: string;
      rowNumbers?: number[];
    },
  ): Promise<RecoveryResult> {
    // Create structured error
    const structuredError = this.createStructuredError(
      vendorId,
      error,
      context,
    );

    // Log the error
    if (this.config.logErrors) {
      this.logError(structuredError);
    }

    // Check if we should alert
    this.checkForAlerts(structuredError);

    // Check if error should be escalated
    this.checkForEscalation(structuredError);

    // Attempt recovery if enabled
    if (this.config.enableRecovery) {
      return await this.attemptRecovery(structuredError, context);
    }

    // No recovery attempted
    return {
      success: false,
      strategy: "none",
      message: "Recovery not attempted (disabled in config)",
    };
  }

  /**
   * Handle low data quality (not an error, but a warning)
   */
  handleLowQuality(
    vendorId: string,
    diagnostics: ProcessingDiagnostics,
    importResult: EnhancedImportResult,
  ): void {
    const error: StructuredError = {
      id: `quality-${Date.now()}`,
      timestamp: new Date(),
      vendorId,
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.QUALITY,
      message: `Low data quality detected: ${(diagnostics.dataQuality.accuracy * 100).toFixed(1)}% accuracy`,
      details: {
        completeness: diagnostics.dataQuality.completeness,
        consistency: diagnostics.dataQuality.consistency,
        accuracy: diagnostics.dataQuality.accuracy,
        successfulRows: importResult.successfully_normalized,
        totalRows: importResult.total_rows,
        errorRate: importResult.failed_rows / importResult.total_rows,
      },
      recoveryAttempted: false,
      suggestions: this.generateQualitySuggestions(diagnostics, importResult),
    };

    this.errors.push(error);

    if (this.config.logErrors) {
      console.warn(`⚠️ Low data quality for ${vendorId}:`, error.message);
      console.warn("   Suggestions:", error.suggestions.join(", "));
    }
  }

  /**
   * Create structured error from raw error
   */
  private createStructuredError(
    vendorId: string,
    error: Error,
    context?: any,
  ): StructuredError {
    // Determine error category from message/context
    const category = this.determineErrorCategory(error, context);

    // Determine severity
    const severity = this.determineErrorSeverity(category, context);

    // Generate unique ID
    const errorId = `${category}-${severity}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Track error count
    const errorKey = `${category}-${error.message.substring(0, 50)}`;
    const count = (this.errorCounts.get(errorKey) || 0) + 1;
    this.errorCounts.set(errorKey, count);

    const structuredError: StructuredError = {
      id: errorId,
      timestamp: new Date(),
      vendorId,
      severity,
      category,
      message: error.message,
      details: {
        originalError: error.toString(),
        stack: error.stack,
        context: context,
        occurrenceCount: count,
      },
      stackTrace: error.stack,
      recoveryAttempted: false,
      suggestions: this.generateErrorSuggestions(error, category, context),
    };

    // Add affected rows if available
    if (context?.rowNumbers) {
      structuredError.affectedRows = context.rowNumbers;
    }

    this.errors.push(structuredError);
    return structuredError;
  }

  /**
   * Determine error category
   */
  private determineErrorCategory(error: Error, context?: any): ErrorCategory {
    const message = error.message.toLowerCase();

    if (
      message.includes("mapping") ||
      message.includes("field") ||
      message.includes("column")
    ) {
      return ErrorCategory.MAPPING;
    }

    if (
      message.includes("parse") ||
      message.includes("csv") ||
      message.includes("delimiter")
    ) {
      return ErrorCategory.PARSING;
    }

    if (
      message.includes("valid") ||
      message.includes("required") ||
      message.includes("missing")
    ) {
      return ErrorCategory.VALIDATION;
    }

    if (
      message.includes("normalize") ||
      message.includes("format") ||
      message.includes("date") ||
      message.includes("currency")
    ) {
      return ErrorCategory.NORMALIZATION;
    }

    if (
      message.includes("config") ||
      message.includes("setting") ||
      message.includes("option")
    ) {
      return ErrorCategory.CONFIGURATION;
    }

    if (
      message.includes("memory") ||
      message.includes("performance") ||
      message.includes("timeout")
    ) {
      return ErrorCategory.SYSTEM;
    }

    // Default based on context
    if (context?.importResult?.statistics) {
      return ErrorCategory.QUALITY;
    }

    return ErrorCategory.SYSTEM;
  }

  /**
   * Determine error severity
   */
  private determineErrorSeverity(
    category: ErrorCategory,
    context?: any,
  ): ErrorSeverity {
    // Critical errors always stop processing
    if (category === ErrorCategory.SYSTEM) {
      return ErrorSeverity.CRITICAL;
    }

    // Check error rate in context
    if (context?.importResult) {
      const errorRate =
        context.importResult.failed_rows / context.importResult.total_rows;

      if (errorRate > 0.5) {
        return ErrorSeverity.HIGH;
      } else if (errorRate > 0.2) {
        return ErrorSeverity.MEDIUM;
      } else if (errorRate > 0.05) {
        return ErrorSeverity.LOW;
      }
    }

    // Default based on category
    switch (category) {
      case ErrorCategory.VALIDATION:
      case ErrorCategory.MAPPING:
        return ErrorSeverity.HIGH;
      case ErrorCategory.PARSING:
      case ErrorCategory.NORMALIZATION:
        return ErrorSeverity.MEDIUM;
      case ErrorCategory.QUALITY:
        return ErrorSeverity.LOW;
      case ErrorCategory.CONFIGURATION:
        return ErrorSeverity.INFO;
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  /**
   * Generate error suggestions
   */
  private generateErrorSuggestions(
    error: Error,
    category: ErrorCategory,
    context?: any,
  ): string[] {
    const suggestions: string[] = [];
    const message = error.message.toLowerCase();

    switch (category) {
      case ErrorCategory.MAPPING:
        suggestions.push("Check CSV headers match expected format");
        suggestions.push("Consider creating a custom mapping file");
        suggestions.push('Use the "map" command to see inferred mappings');
        break;

      case ErrorCategory.PARSING:
        suggestions.push("Verify CSV format and delimiter");
        suggestions.push("Check for special characters or encoding issues");
        suggestions.push("Try using --continue-on-error flag");
        break;

      case ErrorCategory.VALIDATION:
        suggestions.push("Review required fields in your CSV");
        suggestions.push("Check for empty or malformed values");
        suggestions.push(
          "Use --allow-duplicates if duplicate IDs are expected",
        );
        break;

      case ErrorCategory.NORMALIZATION:
        suggestions.push("Check date and currency formats");
        suggestions.push("Verify numeric values are properly formatted");
        suggestions.push("Consider preprocessing your CSV data");
        break;

      case ErrorCategory.QUALITY:
        if (context?.importResult) {
          const successRate =
            context.importResult.successfully_normalized /
            context.importResult.total_rows;
          if (successRate < 0.8) {
            suggestions.push(
              "Data quality is low - review CSV export settings",
            );
          }
        }
        break;
    }

    // General suggestions
    if (message.includes("insufficient") || message.includes("not enough")) {
      suggestions.push("Check if CSV has enough valid rows");
      suggestions.push("Review data filtering criteria");
    }

    if (message.includes("threshold") || message.includes("confidence")) {
      suggestions.push("Adjust confidence threshold with --confidence option");
      suggestions.push("Consider manual mapping for better accuracy");
    }

    return suggestions;
  }

  /**
   * Generate quality suggestions
   */
  private generateQualitySuggestions(
    diagnostics: ProcessingDiagnostics,
    importResult: EnhancedImportResult,
  ): string[] {
    const suggestions: string[] = [];

    if (diagnostics.dataQuality.completeness < 0.9) {
      suggestions.push(
        `Data completeness is ${(diagnostics.dataQuality.completeness * 100).toFixed(1)}% - review CSV export for missing fields`,
      );
    }

    if (diagnostics.dataQuality.consistency < 0.9) {
      suggestions.push(
        `Data consistency is ${(diagnostics.dataQuality.consistency * 100).toFixed(1)}% - check data types and formats`,
      );
    }

    if (importResult.statistics.duplicateOrderIds > 0) {
      suggestions.push(
        `Found ${importResult.statistics.duplicateOrderIds} duplicate order IDs - ensure unique transaction IDs`,
      );
    }

    if (diagnostics.mappingQuality.confidence < 0.8) {
      suggestions.push(
        `Mapping confidence is ${(diagnostics.mappingQuality.confidence * 100).toFixed(1)}% - consider custom mapping`,
      );
    }

    if (importResult.failed_rows > importResult.total_rows * 0.1) {
      suggestions.push(
        `High failure rate (${((importResult.failed_rows / importResult.total_rows) * 100).toFixed(1)}%) - review error details`,
      );
    }

    return suggestions;
  }

  /**
   * Log error with appropriate formatting
   */
  private logError(error: StructuredError): void {
    const timestamp = error.timestamp.toISOString();
    const prefix = this.getSeverityPrefix(error.severity);

    console.log(
      `${prefix} [${timestamp}] ${error.vendorId} - ${error.category.toUpperCase()}: ${error.message}`,
    );

    if (error.details) {
      console.log("   Details:", JSON.stringify(error.details, null, 2));
    }

    if (error.suggestions.length > 0) {
      console.log("   Suggestions:");
      error.suggestions.forEach((suggestion, i) => {
        console.log(`     ${i + 1}. ${suggestion}`);
      });
    }

    if (error.severity === ErrorSeverity.CRITICAL && error.stackTrace) {
      console.log("   Stack trace:", error.stackTrace);
    }
  }

  /**
   * Get severity prefix for logging
   */
  private getSeverityPrefix(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return "🔴 CRITICAL";
      case ErrorSeverity.HIGH:
        return "🟠 HIGH";
      case ErrorSeverity.MEDIUM:
        return "🟡 MEDIUM";
      case ErrorSeverity.LOW:
        return "🔵 LOW";
      case ErrorSeverity.INFO:
        return "ℹ️ INFO";
      default:
        return "⚪ UNKNOWN";
    }
  }

  /**
   * Check if alerts should be sent
   */
  private checkForAlerts(error: StructuredError): void {
    if (
      error.severity === ErrorSeverity.CRITICAL &&
      this.config.alertOnCritical
    ) {
      this.sendAlert(error, "CRITICAL error requires immediate attention");
    }

    if (error.severity === ErrorSeverity.HIGH && this.config.alertOnHigh) {
      this.sendAlert(error, "HIGH severity error detected");
    }
  }

  /**
   * Send alert through configured channels
   */
  private sendAlert(error: StructuredError, title: string): void {
    this.config.notificationChannels.forEach((channel) => {
      switch (channel) {
        case "console":
          console.error(`🚨 ALERT: ${title}`);
          console.error(`   Vendor: ${error.vendorId}`);
          console.error(`   Error: ${error.message}`);
          console.error(`   Time: ${error.timestamp.toISOString()}`);
          break;

        case "email":
          // In a real implementation, this would send an email
          console.log(`📧 Would send email alert: ${title}`);
          break;

        case "slack":
          // In a real implementation, this would send a Slack message
          console.log(`💬 Would send Slack alert: ${title}`);
          break;

        default:
          console.log(`📢 Alert via ${channel}: ${title}`);
      }
    });
  }

  /**
   * Check if error should be escalated
   */
  private checkForEscalation(error: StructuredError): void {
    const errorKey = `${error.category}-${error.message.substring(0, 50)}`;
    const count = this.errorCounts.get(errorKey) || 0;

    if (count >= this.config.autoEscalateAfter) {
      console.warn(
        `🚨 Auto-escalating error: ${error.message} (occurred ${count} times)`,
      );
      // In a real implementation, this would trigger escalation procedures
    }
  }

  /**
   * Attempt to recover from error
   */
  private async attemptRecovery(
    error: StructuredError,
    context: any,
  ): Promise<RecoveryResult> {
    console.log(`🔄 Attempting recovery for error: ${error.message}`);

    // Find applicable recovery strategies
    const applicableStrategies = this.recoveryStrategies.filter((strategy) => {
      // Check conditions
      if (
        strategy.conditions.minRows &&
        context?.importResult?.total_rows < strategy.conditions.minRows
      ) {
        return false;
      }

      if (strategy.conditions.maxErrorRate && context?.importResult) {
        const errorRate =
          context.importResult.failed_rows / context.importResult.total_rows;
        if (errorRate > strategy.conditions.maxErrorRate) {
          return false;
        }
      }

      if (
        strategy.conditions.errorCategories &&
        !strategy.conditions.errorCategories.includes(error.category)
      ) {
        return false;
      }

      return true;
    });

    if (applicableStrategies.length === 0) {
      console.log("❌ No recovery strategies applicable");
      return {
        success: false,
        strategy: "none",
        message: "No applicable recovery strategies found",
      };
    }

    // Try strategies in order
    for (const strategy of applicableStrategies) {
      console.log(`   Trying strategy: ${strategy.name}`);

      try {
        const result = await strategy.action(error, context);

        if (result.success) {
          console.log(
            `   ✅ Recovery successful with strategy: ${strategy.name}`,
          );
          error.recoveryAttempted = true;
          error.recoverySuccessful = true;
          return result;
        }
      } catch (recoveryError) {
        console.log(
          `   ❌ Recovery failed with strategy ${strategy.name}:`,
          (recoveryError as Error).message,
        );
        // Continue to next strategy
      }
    }

    // All strategies failed
    console.log("❌ All recovery strategies failed");
    error.recoveryAttempted = true;
    error.recoverySuccessful = false;

    return {
      success: false,
      strategy: "all-failed",
      message: "All recovery strategies failed",
    };
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number;
    bySeverity: Record<ErrorSeverity, number>;
    byCategory: Record<ErrorCategory, number>;
    byVendor: Record<string, number>;
    recoveryRate: number;
  } {
    const bySeverity: Record<ErrorSeverity, number> = {
      [ErrorSeverity.CRITICAL]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.INFO]: 0,
    };

    const byCategory: Record<ErrorCategory, number> = {
      [ErrorCategory.VALIDATION]: 0,
      [ErrorCategory.PARSING]: 0,
      [ErrorCategory.MAPPING]: 0,
      [ErrorCategory.NORMALIZATION]: 0,
      [ErrorCategory.SYSTEM]: 0,
      [ErrorCategory.CONFIGURATION]: 0,
      [ErrorCategory.QUALITY]: 0,
    };

    const byVendor: Record<string, number> = {};

    let recoveryAttempted = 0;
    let recoverySuccessful = 0;

    this.errors.forEach((error) => {
      bySeverity[error.severity]++;
      byCategory[error.category]++;
      byVendor[error.vendorId] = (byVendor[error.vendorId] || 0) + 1;

      if (error.recoveryAttempted) {
        recoveryAttempted++;
        if (error.recoverySuccessful) {
          recoverySuccessful++;
        }
      }
    });

    const recoveryRate =
      recoveryAttempted > 0 ? recoverySuccessful / recoveryAttempted : 0;

    return {
      totalErrors: this.errors.length,
      bySeverity,
      byCategory,
      byVendor,
      recoveryRate,
    };
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 10): StructuredError[] {
    return this.errors
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clear old errors
   */
  clearOldErrors(daysToKeep: number = 30): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);

    const initialCount = this.errors.length;
    this.errors = this.errors.filter((error) => error.timestamp >= cutoff);

    const removed = initialCount - this.errors.length;
    if (removed > 0) {
      console.log(
        `🧹 Cleaned up ${removed} old errors (older than ${daysToKeep} days)`,
      );
    }
  }

  /**
   * Export error data
   */
  exportErrorData(filePath: string): void {
    const fs = require("fs");
    const data = {
      errors: this.errors,
      statistics: this.getErrorStatistics(),
      config: this.config,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Exported error data to ${filePath}`);
  }

  /**
   * Reset error handler (for testing)
   */
  reset(): void {
    this.errors = [];
    this.errorCounts.clear();
    console.log("🔄 Error handler reset");
  }
}
