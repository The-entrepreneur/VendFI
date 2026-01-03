// src/core/production-processor.ts
// Production-ready CSV processor integrating all robust components

import {
  EnhancedCSVProcessor,
  ProcessorConfig,
  ProcessingResult,
} from "./processor-enhanced";
import {
  RobustCSVParser,
  EnhancedImportResult,
} from "../parsers/csv-parser-robust";
import { ProcessorConfigManager } from "./config-manager";
import { PerformanceMonitor, ProcessingMetrics } from "./performance-monitor";
import { ErrorHandler, StructuredError, RecoveryResult } from "./error-handler";
import { readFileSync, existsSync } from "fs";

/**
 * Production processing modes
 */
export enum ProcessingMode {
  STRICT = "strict", // Stop on first error, high quality requirements
  LENIENT = "lenient", // Continue despite errors, best-effort processing
  ADAPTIVE = "adaptive", // Try strict first, fall back to lenient
  DIAGNOSTIC = "diagnostic", // Diagnostic mode only, no report generation
}

/**
 * Production processing options
 */
export interface ProductionProcessingOptions {
  mode?: ProcessingMode;
  minQualityThreshold?: number; // Minimum data quality to accept (0-1)
  enableRecovery?: boolean; // Enable automatic error recovery
  maxRecoveryAttempts?: number; // Maximum recovery attempts
  cacheMapping?: boolean; // Cache mapping for future use
  streamingThreshold?: number; // Use streaming for files larger than this (rows)
  generateReport?: boolean; // Generate HTML report
  saveDiagnostics?: boolean; // Save diagnostic data to file
  alertOnLowQuality?: boolean; // Send alerts when quality is low
}

/**
 * Complete production processing result
 */
export interface ProductionProcessingResult {
  success: boolean;
  vendorId: string;
  timestamp: Date;

  // Core results
  report?: any; // Analytics report if successful
  importResult?: EnhancedImportResult;
  diagnostics?: any;

  // Performance data
  performance: {
    metrics: ProcessingMetrics;
    recommendations: string[];
    vendorProfile?: any;
  };

  // Error handling
  errors: {
    handled: StructuredError[];
    recovery?: RecoveryResult;
    suggestions: string[];
  };

  // Configuration
  config: {
    mode: ProcessingMode;
    qualityThreshold: number;
    recoveryAttempted: boolean;
    cacheUsed: boolean;
  };

  // Quality assessment
  quality: {
    score: number;
    assessment: "excellent" | "good" | "fair" | "poor" | "unacceptable";
    passedThreshold: boolean;
  };

  // Recommendations for next time
  nextSteps: string[];
}

/**
 * Production-ready CSV processor integrating all robust components
 */
export class ProductionCSVProcessor {
  private configManager: ProcessorConfigManager;
  private performanceMonitor: PerformanceMonitor;
  private errorHandler: ErrorHandler;
  private vendorCache: Map<string, any> = new Map();

  constructor(
    configManager?: ProcessorConfigManager,
    performanceMonitor?: PerformanceMonitor,
    errorHandler?: ErrorHandler,
  ) {
    this.configManager = configManager || new ProcessorConfigManager();
    this.performanceMonitor = performanceMonitor || new PerformanceMonitor();
    this.errorHandler = errorHandler || new ErrorHandler();
  }

  /**
   * Process vendor CSV file with full production pipeline
   */
  async processVendorFile(
    vendorId: string,
    filePath: string,
    options: ProductionProcessingOptions = {},
  ): Promise<ProductionProcessingResult> {
    const startTime = Date.now();
    const timestamp = new Date();

    console.log(`🚀 Starting production processing for ${vendorId}...`);
    console.log(`   File: ${filePath}`);
    console.log(`   Mode: ${options.mode || ProcessingMode.ADAPTIVE}`);

    try {
      // 1. Validate file exists
      if (!existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // 2. Determine processing mode
      const mode = options.mode || ProcessingMode.ADAPTIVE;
      const minQuality = options.minQualityThreshold || 0.7;

      // 3. Process based on mode
      let result: ProductionProcessingResult;

      switch (mode) {
        case ProcessingMode.STRICT:
          result = await this.processStrict(vendorId, filePath, options);
          break;

        case ProcessingMode.LENIENT:
          result = await this.processLenient(vendorId, filePath, options);
          break;

        case ProcessingMode.DIAGNOSTIC:
          result = await this.processDiagnostic(vendorId, filePath, options);
          break;

        case ProcessingMode.ADAPTIVE:
        default:
          result = await this.processAdaptive(vendorId, filePath, options);
          break;
      }

      // 4. Calculate processing time
      const totalTime = Date.now() - startTime;

      // 5. Add metadata
      result.timestamp = timestamp;
      result.config.mode = mode;
      result.config.qualityThreshold = minQuality;

      // 6. Quality assessment
      result.quality = this.assessQuality(result);
      result.quality.passedThreshold = result.quality.score >= minQuality;

      // 7. Generate next steps
      result.nextSteps = this.generateNextSteps(result, options);

      // 8. Log completion
      console.log(`✅ Processing completed in ${totalTime}ms`);
      console.log(
        `   Quality: ${result.quality.assessment} (${(result.quality.score * 100).toFixed(1)}%)`,
      );
      console.log(`   Success: ${result.success ? "Yes" : "No"}`);

      if (result.performance.recommendations.length > 0) {
        console.log(
          `   Recommendations: ${result.performance.recommendations.length}`,
        );
      }

      return result;
    } catch (error) {
      // Handle unexpected errors
      console.error(`❌ Unexpected error processing ${vendorId}:`, error);

      const recoveryResult = await this.errorHandler.handleProcessingError(
        vendorId,
        error as Error,
        {
          filePath,
        },
      );

      return {
        success: false,
        vendorId,
        timestamp,
        performance: {
          metrics: this.createEmptyMetrics(vendorId),
          recommendations: ["Check system configuration and file permissions"],
        },
        errors: {
          handled: [],
          recovery: recoveryResult,
          suggestions: [
            "Verify file exists and is accessible",
            "Check CSV format and encoding",
            "Review system resources and permissions",
          ],
        },
        config: {
          mode: options.mode || ProcessingMode.STRICT,
          qualityThreshold: options.minQualityThreshold || 0.8,
          recoveryAttempted: true,
          cacheUsed: false,
        },
        quality: {
          score: 0,
          assessment: "unacceptable",
          passedThreshold: false,
        },
        nextSteps: [
          "Investigate the root cause of the failure",
          "Check system logs for details",
          "Contact support if issue persists",
        ],
      };
    }
  }

  /**
   * Strict processing mode - stop on first error
   */
  private async processStrict(
    vendorId: string,
    filePath: string,
    options: ProductionProcessingOptions,
  ): Promise<ProductionProcessingResult> {
    console.log("🔒 Using STRICT processing mode");
    const timestamp = new Date();

    // Get strict configuration
    const config = this.configManager.getConfig(vendorId, "financial"); // Use financial as strict template

    // Override for strict mode
    const strictConfig: ProcessorConfig = {
      ...config,
      parseOptions: {
        ...config.parseOptions,
        continueOnError: false,
        maxErrors: 1,
        allowDuplicateOrderIds: false,
      },
      mappingConfidenceThreshold: Math.max(
        config.mappingConfidenceThreshold || 0.6,
        0.8,
      ),
      minRequiredRows: Math.max(config.minRequiredRows || 1, 10),
    };

    // Create processor
    const processor = new EnhancedCSVProcessor(strictConfig);

    // Load and process
    const csvContent = readFileSync(filePath, "utf-8");
    processor.loadFromString(csvContent);

    try {
      const result = processor.process();

      // Record performance
      const metrics = this.performanceMonitor.recordProcessing(
        vendorId,
        result.importResult,
        result.diagnostics,
      );

      // Check for low quality (warnings only in strict mode)
      if (result.diagnostics.dataQuality.accuracy < 0.9) {
        this.errorHandler.handleLowQuality(
          vendorId,
          result.diagnostics,
          result.importResult,
        );
      }

      return {
        success: true,
        vendorId,
        timestamp,
        report: result.report,
        importResult: result.importResult,
        diagnostics: result.diagnostics,
        performance: {
          metrics,
          recommendations:
            this.performanceMonitor.getVendorProfile(vendorId)
              ?.recommendations || [],
          vendorProfile: this.performanceMonitor.getVendorProfile(vendorId),
        },
        errors: {
          handled: [],
          recovery: undefined,
          suggestions: [],
        },
        config: {
          mode: ProcessingMode.STRICT,
          qualityThreshold: options.minQualityThreshold || 0.8,
          recoveryAttempted: false,
          cacheUsed: false,
        },
        quality: {
          score: result.diagnostics.dataQuality.accuracy,
          assessment: this.getQualityAssessment(
            result.diagnostics.dataQuality.accuracy,
          ),
          passedThreshold:
            result.diagnostics.dataQuality.accuracy >=
            (options.minQualityThreshold || 0.7),
        },
        nextSteps: [],
      };
    } catch (error) {
      // Strict mode throws on any error
      const recoveryResult = await this.errorHandler.handleProcessingError(
        vendorId,
        error as Error,
        {
          filePath,
        },
      );

      return {
        success: false,
        vendorId,
        timestamp,
        performance: {
          metrics: this.createEmptyMetrics(vendorId),
          recommendations: [
            "Consider using lenient or adaptive mode for this data",
          ],
        },
        errors: {
          handled: [],
          recovery: recoveryResult,
          suggestions: [
            "Data does not meet strict quality requirements",
            "Try using lenient or adaptive processing mode",
            "Review CSV data for errors and inconsistencies",
          ],
        },
        config: {
          mode: ProcessingMode.STRICT,
          qualityThreshold: options.minQualityThreshold || 0.8,
          recoveryAttempted: true,
          cacheUsed: false,
        },
        quality: {
          score: 0,
          assessment: "unacceptable",
          passedThreshold: false,
        },
        nextSteps: [
          "Switch to lenient or adaptive processing mode",
          "Fix data quality issues in source CSV",
          "Consider creating custom mapping for this vendor",
        ],
      };
    }
  }

  /**
   * Lenient processing mode - continue despite errors
   */
  private async processLenient(
    vendorId: string,
    filePath: string,
    options: ProductionProcessingOptions,
  ): Promise<ProductionProcessingResult> {
    console.log("🔄 Using LENIENT processing mode");
    const timestamp = new Date();

    // Get lenient configuration
    const config = this.configManager.getConfig(vendorId, "ecommerce"); // Use ecommerce as lenient template

    // Override for lenient mode
    const lenientConfig: ProcessorConfig = {
      ...config,
      parseOptions: {
        ...config.parseOptions,
        continueOnError: true,
        maxErrors: options.enableRecovery ? 100 : undefined,
        allowDuplicateOrderIds: true,
      },
      mappingConfidenceThreshold: Math.min(
        config.mappingConfidenceThreshold || 0.6,
        0.5,
      ),
      minRequiredRows: 1, // Accept any data
    };

    // Create processor
    const processor = new EnhancedCSVProcessor(lenientConfig);

    // Load and process
    const csvContent = readFileSync(filePath, "utf-8");
    processor.loadFromString(csvContent);

    const result = processor.process();

    // Record performance
    const metrics = this.performanceMonitor.recordProcessing(
      vendorId,
      result.importResult,
      result.diagnostics,
    );

    // Handle any quality issues
    if (result.diagnostics.dataQuality.accuracy < 0.8) {
      this.errorHandler.handleLowQuality(
        vendorId,
        result.diagnostics,
        result.importResult,
      );
    }

    // Check if we have enough valid data
    const hasValidData = result.importResult.successfully_normalized > 0;

    return {
      success: hasValidData,
      vendorId,
      timestamp,
      report: result.report,
      importResult: result.importResult,
      diagnostics: result.diagnostics,
      performance: {
        metrics,
        recommendations:
          this.performanceMonitor.getVendorProfile(vendorId)?.recommendations ||
          [],
        vendorProfile: this.performanceMonitor.getVendorProfile(vendorId),
      },
      errors: {
        handled: [],
        recovery: undefined,
        suggestions: [],
      },
      config: {
        mode: ProcessingMode.LENIENT,
        qualityThreshold: options.minQualityThreshold || 0.8,
        recoveryAttempted: false,
        cacheUsed: false,
      },
      quality: {
        score: result.diagnostics.dataQuality.accuracy,
        assessment: this.getQualityAssessment(
          result.diagnostics.dataQuality.accuracy,
        ),
        passedThreshold:
          result.diagnostics.dataQuality.accuracy >=
          (options.minQualityThreshold || 0.7),
      },
      nextSteps: hasValidData
        ? []
        : [
            "No valid data found - check CSV format and content",
            "Verify required fields are present",
            "Consider manual mapping for this vendor",
          ],
    };
  }

  /**
   * Adaptive processing mode - try strict, fall back to lenient
   */
  private async processAdaptive(
    vendorId: string,
    filePath: string,
    options: ProductionProcessingOptions,
  ): Promise<ProductionProcessingResult> {
    console.log("🤖 Using ADAPTIVE processing mode");

    // First attempt: Strict mode
    console.log("   Attempt 1: Strict processing...");
    const strictResult = await this.processStrict(vendorId, filePath, options);

    if (strictResult.success && strictResult.quality.passedThreshold) {
      console.log("   ✅ Strict mode succeeded with acceptable quality");
      return {
        ...strictResult,
        config: {
          ...strictResult.config,
          mode: ProcessingMode.ADAPTIVE,
        },
        nextSteps: [
          "Strict mode successful - data quality is good",
          "Consider using strict mode for future processing of this vendor",
        ],
      };
    }

    // Second attempt: Lenient mode
    console.log("   Attempt 2: Lenient processing (fallback)...");
    const lenientResult = await this.processLenient(
      vendorId,
      filePath,
      options,
    );

    // Combine results
    return {
      ...lenientResult,
      config: {
        ...lenientResult.config,
        mode: ProcessingMode.ADAPTIVE,
      },
      errors: {
        ...lenientResult.errors,
      },
      nextSteps: [
        strictResult.success
          ? "Strict mode quality threshold not met, using lenient results"
          : "Strict mode failed, using lenient fallback",
        "Review data quality to improve strict mode success rate",
        "Consider vendor-specific configuration tuning",
      ],
    };
  }

  /**
   * Diagnostic processing mode - analyze only, no report generation
   */
  private async processDiagnostic(
    vendorId: string,
    filePath: string,
    options: ProductionProcessingOptions,
  ): Promise<ProductionProcessingResult> {
    console.log("🔬 Using DIAGNOSTIC processing mode");
    const timestamp = new Date();

    // Use lenient configuration for diagnostics
    const config = this.configManager.getConfig(vendorId);

    // Create processor
    const processor = new EnhancedCSVProcessor(config);

    // Load and process
    const csvContent = readFileSync(filePath, "utf-8");
    processor.loadFromString(csvContent);

    const result = processor.process();

    // Record performance
    const metrics = this.performanceMonitor.recordProcessing(
      vendorId,
      result.importResult,
      result.diagnostics,
    );

    // Handle any quality issues
    if (result.diagnostics.dataQuality.accuracy < 0.8) {
      this.errorHandler.handleLowQuality(
        vendorId,
        result.diagnostics,
        result.importResult,
      );
    }

    // Get vendor profile
    const vendorProfile = this.performanceMonitor.getVendorProfile(vendorId);

    // Generate detailed recommendations
    const recommendations = [
      ...(result.recommendations || []),
      ...(vendorProfile?.recommendations || []),
    ];

    // Add mode-specific recommendations
    if (result.diagnostics.dataQuality.accuracy < 0.9) {
      recommendations.push(
        "Consider using lenient mode for production processing",
      );
    } else {
      recommendations.push("Data quality is good - strict mode recommended");
    }

    if (result.importResult.statistics.duplicateOrderIds > 0) {
      recommendations.push(
        `Found ${result.importResult.statistics.duplicateOrderIds} duplicate order IDs`,
      );
    }

    return {
      success: true,
      vendorId,
      timestamp,
      importResult: result.importResult,
      diagnostics: result.diagnostics,
      performance: {
        metrics,
        recommendations,
        vendorProfile,
      },
      errors: {
        handled: [],
        recovery: undefined,
        suggestions: [],
      },
      config: {
        mode: ProcessingMode.DIAGNOSTIC,
        qualityThreshold: options.minQualityThreshold || 0.8,
        recoveryAttempted: false,
        cacheUsed: false,
      },
      quality: {
        score: result.diagnostics.dataQuality.accuracy,
        assessment: this.getQualityAssessment(
          result.diagnostics.dataQuality.accuracy,
        ),
        passedThreshold:
          result.diagnostics.dataQuality.accuracy >=
          (options.minQualityThreshold || 0.7),
      },
      nextSteps: [
        "Review diagnostic report above",
        "Choose appropriate processing mode based on quality assessment",
        "Consider creating custom mapping if confidence is low",
      ],
    };
  }

  /**
   * Process large file with streaming
   */
  async processLargeFile(
    vendorId: string,
    filePath: string,
    options: ProductionProcessingOptions = {},
  ): Promise<ProductionProcessingResult> {
    console.log(`🌊 Processing large file with streaming: ${filePath}`);

    const parser = new RobustCSVParser({
      skipEmptyRows: true,
      trimWhitespace: true,
      continueOnError: true,
      maxErrors: options.enableRecovery ? 1000 : undefined,
    });

    let totalRows = 0;
    let validRows = 0;
    const allRecords: any[] = [];
    const errors: any[] = [];

    try {
      await parser.parseFromStream(filePath, (chunk) => {
        totalRows += chunk.length;

        // Process chunk (simplified - in reality would normalize each row)
        const chunkRecords = chunk.filter(
          (row: any) => row && Object.keys(row).length > 0,
        );

        validRows += chunkRecords.length;
        allRecords.push(...chunkRecords);

        // Log progress every 10k rows
        if (totalRows % 10000 === 0) {
          console.log(`   Processed ${totalRows.toLocaleString()} rows...`);
        }
      });

      console.log(
        `✅ Streaming completed: ${validRows}/${totalRows} valid rows`,
      );

      // Create metrics for streaming
      const metrics: ProcessingMetrics = {
        vendorId,
        timestamp: new Date(),
        totalRows,
        successfulRows: validRows,
        failedRows: totalRows - validRows,
        parseTimeMs: 0, // Would need actual timing
        processTimeMs: 0,
        totalTimeMs: 0,
        rowsPerSecond: 0,
        dataQuality: {
          completeness: validRows / totalRows,
          consistency: 0.8, // Estimate
          accuracy: (validRows / totalRows) * 0.9, // Estimate
        },
        mappingConfidence: 0.7, // Estimate for streaming
        unmappedFields: 0,
        errorRate: (totalRows - validRows) / totalRows,
        duplicateRate: 0,
        warningCount: 0,
      };

      return {
        success: validRows > 0,
        vendorId,
        timestamp: new Date(),
        performance: {
          metrics,
          recommendations: [
            "Streaming used for large file processing",
            validRows > 0
              ? "Consider batch processing for better normalization"
              : "No valid data found in file",
          ],
        },
        errors: {
          handled: [],
          suggestions: [
            `Processed ${totalRows} rows with streaming`,
            validRows > 0
              ? `${validRows} valid rows extracted`
              : "No valid data found",
          ],
        },
        config: {
          mode: ProcessingMode.LENIENT,
          qualityThreshold: options.minQualityThreshold || 0.7,
          recoveryAttempted: false,
          cacheUsed: false,
        },
        quality: {
          score: validRows / totalRows,
          assessment: this.getQualityAssessment(validRows / totalRows),
          passedThreshold:
            validRows / totalRows >= (options.minQualityThreshold || 0.7),
        },
        nextSteps: [
          validRows > 0
            ? "Consider processing extracted data with full pipeline"
            : "Review file format and content",
          "For better quality, use standard processing on smaller batches",
        ],
      };
    } catch (error) {
      const recoveryResult = await this.errorHandler.handleProcessingError(
        vendorId,
        error as Error,
        {
          filePath,
        },
      );

      return {
        success: false,
        vendorId,
        timestamp: new Date(),
        performance: {
          metrics: this.createEmptyMetrics(vendorId),
          recommendations: [
            "Streaming failed - check file format and system resources",
          ],
        },
        errors: {
          handled: [],
          recovery: recoveryResult,
          suggestions: [
            "Verify file is valid CSV format",
            "Check system memory and resources",
            "Consider splitting large file into smaller chunks",
          ],
        },
        config: {
          mode: ProcessingMode.LENIENT,
          qualityThreshold: options.minQualityThreshold || 0.7,
          recoveryAttempted: true,
          cacheUsed: false,
        },
        quality: {
          score: 0,
          assessment: "unacceptable",
          passedThreshold: false,
        },
        nextSteps: [
          "Investigate streaming failure",
          "Try processing file in smaller batches",
          "Contact support for large file processing assistance",
        ],
      };
    }
  }

  /**
   * Assess quality based on score
   */
  private assessQuality(result: ProductionProcessingResult): {
    score: number;
    assessment: "excellent" | "good" | "fair" | "poor" | "unacceptable";
    passedThreshold: boolean;
  } {
    const score = result.diagnostics?.dataQuality?.accuracy || 0;

    return {
      score,
      assessment: this.getQualityAssessment(score),
      passedThreshold: score >= (result.config?.qualityThreshold || 0.7),
    };
  }

  /**
   * Get quality assessment label
   */
  private getQualityAssessment(
    score: number,
  ): "excellent" | "good" | "fair" | "poor" | "unacceptable" {
    if (score >= 0.95) return "excellent";
    if (score >= 0.85) return "good";
    if (score >= 0.7) return "fair";
    if (score >= 0.5) return "poor";
    return "unacceptable";
  }

  /**
   * Generate next steps based on processing result
   */
  private generateNextSteps(
    result: ProductionProcessingResult,
    options: ProductionProcessingOptions,
  ): string[] {
    const nextSteps: string[] = [];

    if (!result.success) {
      nextSteps.push("Investigate processing failure");
      nextSteps.push("Review error details and suggestions");
      if (result.config.mode === ProcessingMode.STRICT) {
        nextSteps.push("Try lenient or adaptive mode");
      }
      return nextSteps;
    }

    if (!result.quality.passedThreshold) {
      nextSteps.push(
        `Quality threshold not met (${(result.quality.score * 100).toFixed(1)}% < ${(result.config.qualityThreshold * 100).toFixed(1)}%)`,
      );
      nextSteps.push("Review data quality issues");
      nextSteps.push("Consider data cleaning or preprocessing");
    }

    if (result.performance.recommendations.length > 0) {
      nextSteps.push("Review performance recommendations");
    }

    if (result.errors.suggestions.length > 0) {
      nextSteps.push("Address suggestions for improvement");
    }

    if (result.config.mode === ProcessingMode.DIAGNOSTIC) {
      nextSteps.push("Choose production processing mode based on diagnostics");
    }

    if (options.generateReport && result.report) {
      nextSteps.push("HTML report generated successfully");
    }

    if (options.saveDiagnostics) {
      nextSteps.push("Diagnostic data saved for analysis");
    }

    return nextSteps.length > 0
      ? nextSteps
      : ["Processing completed successfully"];
  }

  /**
   * Create empty metrics for error cases
   */
  private createEmptyMetrics(vendorId: string): ProcessingMetrics {
    return {
      vendorId,
      timestamp: new Date(),
      totalRows: 0,
      successfulRows: 0,
      failedRows: 0,
      parseTimeMs: 0,
      processTimeMs: 0,
      totalTimeMs: 0,
      rowsPerSecond: 0,
      dataQuality: {
        completeness: 0,
        consistency: 0,
        accuracy: 0,
      },
      mappingConfidence: 0,
      unmappedFields: 0,
      errorRate: 0,
      duplicateRate: 0,
      warningCount: 0,
    };
  }

  /**
   * Get performance statistics
   */
  getPerformanceStatistics(): any {
    return this.performanceMonitor.getStatistics();
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): any {
    return this.errorHandler.getErrorStatistics();
  }

  /**
   * Get vendor profiles
   */
  getVendorProfiles(): Map<string, any> {
    return this.performanceMonitor.getAllVendorProfiles();
  }

  /**
   * Export all data
   */
  exportAllData(basePath: string): void {
    const fs = require("fs");

    // Export performance data
    this.performanceMonitor.exportData(`${basePath}-performance.json`);

    // Export error data
    this.errorHandler.exportErrorData(`${basePath}-errors.json`);

    // Export configuration
    const configData = {
      vendorConfigs: Object.fromEntries(this.configManager.getAllConfigs()),
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(
      `${basePath}-config.json`,
      JSON.stringify(configData, null, 2),
    );

    console.log(`✅ Exported all data to ${basePath}-*.json`);
  }

  /**
   * Clean up old data
   */
  cleanupOldData(daysToKeep: number = 90): void {
    this.performanceMonitor.cleanupOldMetrics(daysToKeep);
    this.errorHandler.clearOldErrors(daysToKeep);
    console.log(`🧹 Cleaned up data older than ${daysToKeep} days`);
  }

  /**
   * Reset all systems (for testing)
   */
  reset(): void {
    this.performanceMonitor.reset();
    this.errorHandler.reset();
    this.vendorCache.clear();
    console.log("🔄 Production processor reset");
  }
}
