// src/core/processor-enhanced.ts
// Enhanced CSV processor with robust parsing, validation, and diagnostics

import {
  RawCSVRow,
  FieldMapping,
  AnalyticsReport,
  NormalizedRecord,
  CanonicalField,
  MappingInference,
} from "../types";
import {
  RobustCSVParser,
  ParseOptions,
  EnhancedImportResult,
  detectDelimiter,
} from "../parsers/csv-parser-robust";
import { inferMapping, validateMapping } from "../parsers/field-mapper";
import { computeGlobalMetrics } from "../aggregators/global-metrics";
import {
  computeProductMetrics,
  identifyFrictionHotspots,
} from "../aggregators/product-metrics";
import { computeTermMetrics } from "../aggregators/term-metrics";
import { computeTimeSeries } from "../aggregators/time-series";

/**
 * Processor configuration
 */
export interface ProcessorConfig {
  vendorId: string;

  // Parsing options
  parseOptions?: ParseOptions;

  // Mapping behavior
  autoInferMapping?: boolean;
  mappingConfidenceThreshold?: number; // Min confidence to accept auto-mapping (0-1)

  // Data quality
  minRequiredRows?: number;
  maxDuplicateRate?: number; // Max % of duplicate order IDs allowed

  // Performance
  enableCaching?: boolean;
  cacheKey?: string;
}

/**
 * Processing result with diagnostics
 */
export interface ProcessingResult {
  success: boolean;
  report?: AnalyticsReport;
  importResult: EnhancedImportResult;
  diagnostics: ProcessingDiagnostics;
  recommendations: string[];
}

/**
 * Diagnostic information
 */
export interface ProcessingDiagnostics {
  dataQuality: {
    completeness: number; // % of rows with all required fields
    consistency: number; // % of rows with valid data types
    accuracy: number; // Overall quality score
  };

  mappingQuality: {
    confidence: number;
    unmappedFields: string[];
    ambiguousFields: Array<{ field: string; candidates: string[] }>;
  };

  performance: {
    parseTimeMs: number;
    processTimeMs: number;
    rowsPerSecond: number;
  };

  issues: Array<{
    severity: "critical" | "warning" | "info";
    category: "data" | "mapping" | "validation";
    message: string;
    affectedRows?: number;
  }>;
}

/**
 * Saved mapping configuration
 */
export interface SavedMapping {
  vendorId: string;
  mapping: FieldMapping;
  createdAt: Date;
  confidence: number;
  sourceHeaders: string[];
  notes?: string;
}

/**
 * Enhanced CSV Processor
 */
export class EnhancedCSVProcessor {
  private config: ProcessorConfig;
  private parser: RobustCSVParser;
  private rawRows: RawCSVRow[] = [];
  private normalizedRecords: NormalizedRecord[] = [];
  private mapping: FieldMapping = {};
  private mappingInference?: MappingInference;
  private importResult?: EnhancedImportResult;

  // Mapping cache
  private static mappingCache = new Map<string, SavedMapping>();

  constructor(config: ProcessorConfig) {
    this.config = {
      autoInferMapping: true,
      mappingConfidenceThreshold: 0.6,
      minRequiredRows: 1,
      maxDuplicateRate: 0.1,
      enableCaching: true,
      ...config,
    };

    this.parser = new RobustCSVParser(this.config.parseOptions);
  }

  /**
   * Load CSV from string with auto-detection
   */
  loadFromString(csvContent: string): void {
    // Detect delimiter if not specified
    if (!this.config.parseOptions?.delimiter) {
      const delimiter = detectDelimiter(csvContent);
      console.log(`Auto-detected delimiter: "${delimiter}"`);
      this.parser = new RobustCSVParser({
        ...this.config.parseOptions,
        delimiter,
      });
    }

    this.rawRows = this.parser.parseFromString(csvContent);
  }

  /**
   * Load CSV from file
   */
  async loadFromFile(filePath: string): Promise<void> {
    this.rawRows = await this.parser.parseFromFile(filePath);
  }

  /**
   * Get CSV headers
   */
  getHeaders(): string[] {
    if (this.rawRows.length === 0) return [];
    return Object.keys(this.rawRows[0]);
  }

  /**
   * Infer or load mapping
   */
  inferOrLoadMapping(): {
    inference: MappingInference;
    validation: ReturnType<typeof validateMapping>;
    source: "inferred" | "cached";
  } {
    // Check cache first
    if (this.config.enableCaching && this.config.cacheKey) {
      const cached = EnhancedCSVProcessor.mappingCache.get(
        this.config.cacheKey,
      );
      if (cached) {
        console.log("Using cached mapping");
        this.mapping = cached.mapping;
        return {
          inference: {
            suggested_mapping: cached.mapping,
            confidence: cached.confidence,
            unmapped_canonical_fields: [],
            unmapped_source_columns: [],
          },
          validation: validateMapping(cached.mapping),
          source: "cached",
        };
      }
    }

    // Infer new mapping
    const headers = this.getHeaders();
    const inference = inferMapping(headers);
    const validation = validateMapping(inference.suggested_mapping);

    this.mappingInference = inference;

    // Cache if valid and enabled
    if (this.config.enableCaching && this.config.cacheKey && validation.valid) {
      EnhancedCSVProcessor.mappingCache.set(this.config.cacheKey, {
        vendorId: this.config.vendorId,
        mapping: inference.suggested_mapping,
        createdAt: new Date(),
        confidence: inference.confidence,
        sourceHeaders: headers,
      });
    }

    return { inference, validation, source: "inferred" };
  }

  /**
   * Set manual mapping
   */
  setMapping(mapping: FieldMapping): void {
    this.mapping = mapping;

    // Update cache if enabled
    if (this.config.enableCaching && this.config.cacheKey) {
      EnhancedCSVProcessor.mappingCache.set(this.config.cacheKey, {
        vendorId: this.config.vendorId,
        mapping,
        createdAt: new Date(),
        confidence: 1.0, // Manual mapping is 100% confidence
        sourceHeaders: this.getHeaders(),
        notes: "Manual mapping",
      });
    }
  }

  /**
   * Import with comprehensive validation
   */
  import(options?: ParseOptions): EnhancedImportResult {
    // Use provided mapping or auto-infer
    if (Object.keys(this.mapping).length === 0) {
      if (!this.config.autoInferMapping) {
        throw new Error("No mapping provided and auto-inference is disabled");
      }

      const { inference, validation } = this.inferOrLoadMapping();

      if (!validation.valid) {
        throw new Error(
          `Invalid mapping: missing required fields: ${validation.missing.join(", ")}`,
        );
      }

      if (
        inference.confidence < (this.config.mappingConfidenceThreshold || 0.6)
      ) {
        throw new Error(
          `Mapping confidence (${(inference.confidence * 100).toFixed(1)}%) below threshold. ` +
            `Please provide manual mapping.`,
        );
      }

      this.mapping = inference.suggested_mapping;
    }

    // Parse and normalize
    const mergedOptions = {
      ...this.config.parseOptions,
      ...options,
    };

    this.importResult = this.parser.parseAndNormalize(
      this.rawRows,
      this.mapping,
    );
    this.normalizedRecords = this.importResult!.records;

    // Validate minimum rows
    const minRequired =
      this.config.minRequiredRows !== undefined
        ? this.config.minRequiredRows
        : 1;
    if (this.normalizedRecords.length < minRequired) {
      throw new Error(
        `Insufficient valid rows: got ${this.normalizedRecords.length}, ` +
          `need at least ${minRequired}`,
      );
    }

    // Check duplicate rate
    const duplicateRate =
      this.importResult.statistics.duplicateOrderIds /
      this.importResult!.total_rows;

    if (duplicateRate > (this.config.maxDuplicateRate || 0.1)) {
      console.warn(
        `High duplicate rate: ${(duplicateRate * 100).toFixed(1)}% ` +
          `(${this.importResult.statistics.duplicateOrderIds} duplicates)`,
      );
    }

    return this.importResult;
  }

  /**
   * Generate analytics report
   */
  generateReport(dateFrom?: Date, dateTo?: Date): AnalyticsReport {
    if (this.normalizedRecords.length === 0) {
      throw new Error("No normalized records available. Run import() first.");
    }

    const globalMetrics = computeGlobalMetrics(
      this.normalizedRecords,
      dateFrom,
      dateTo,
    );

    const productMetrics = computeProductMetrics(
      this.normalizedRecords,
      dateFrom,
      dateTo,
    );

    const termMetrics = computeTermMetrics(
      this.normalizedRecords,
      dateFrom,
      dateTo,
    );

    const timeSeries = computeTimeSeries(this.normalizedRecords, "weekly");

    const frictionHotspots = identifyFrictionHotspots(
      productMetrics,
      globalMetrics.approval_rate,
    );

    return {
      vendor_id: this.config.vendorId,
      generated_at: new Date(),
      global_metrics: globalMetrics,
      product_metrics: productMetrics,
      term_metrics: termMetrics,
      time_series: timeSeries,
      friction_hotspots: frictionHotspots,
    };
  }

  /**
   * Process CSV with full diagnostics
   */
  process(dateFrom?: Date, dateTo?: Date): ProcessingResult {
    const startTime = Date.now();

    try {
      // Import data
      const importResult = this.import();

      // Generate report
      const report = this.generateReport(dateFrom, dateTo);

      // Calculate diagnostics
      const diagnostics = this.calculateDiagnostics(importResult);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        importResult,
        diagnostics,
      );

      return {
        success: true,
        report,
        importResult,
        diagnostics,
        recommendations,
      };
    } catch (error) {
      return {
        success: false,
        importResult: this.importResult || {
          total_rows: this.rawRows.length,
          successfully_normalized: 0,
          failed_rows: this.rawRows.length,
          errors: [{ row_number: 0, error: (error as Error).message }],
          records: [],
          statistics: this.parser.getStatistics(),
          warnings: [],
        },
        diagnostics: this.calculateDiagnostics(this.importResult),
        recommendations: [`Critical error: ${(error as Error).message}`],
      };
    }
  }

  /**
   * Calculate diagnostic metrics
   */
  private calculateDiagnostics(
    importResult?: EnhancedImportResult,
  ): ProcessingDiagnostics {
    const stats = importResult?.statistics || this.parser.getStatistics();

    // Data quality metrics
    const completeness =
      stats.totalRows > 0 ? stats.successfulRows / stats.totalRows : 0;

    const consistency =
      stats.totalRows > 0
        ? 1 -
          Object.values(stats.invalidDataTypes).reduce((a, b) => a + b, 0) /
            stats.totalRows
        : 0;

    const accuracy = (completeness + consistency) / 2;

    // Mapping quality
    const mappingConfidence =
      this.mappingInference?.confidence ||
      (Object.keys(this.mapping).length > 0 ? 1.0 : 0);

    const unmappedFields =
      this.mappingInference?.unmapped_canonical_fields || [];

    // Issues
    const issues: ProcessingDiagnostics["issues"] = [];

    if (stats.failedRows > stats.totalRows * 0.1) {
      issues.push({
        severity: "critical",
        category: "data",
        message: `High failure rate: ${((stats.failedRows / stats.totalRows) * 100).toFixed(1)}% of rows failed`,
        affectedRows: stats.failedRows,
      });
    }

    if (stats.duplicateOrderIds > 0) {
      issues.push({
        severity:
          stats.duplicateOrderIds > stats.totalRows * 0.05 ? "warning" : "info",
        category: "data",
        message: `Found ${stats.duplicateOrderIds} duplicate order IDs`,
        affectedRows: stats.duplicateOrderIds,
      });
    }

    if (mappingConfidence < 0.8) {
      issues.push({
        severity: "warning",
        category: "mapping",
        message: `Low mapping confidence: ${(mappingConfidence * 100).toFixed(1)}%`,
      });
    }

    if (unmappedFields.length > 2) {
      issues.push({
        severity: "info",
        category: "mapping",
        message: `${unmappedFields.length} optional fields not mapped`,
      });
    }

    return {
      dataQuality: {
        completeness,
        consistency,
        accuracy,
      },
      mappingQuality: {
        confidence: mappingConfidence,
        unmappedFields,
        ambiguousFields: [], // Could be enhanced with field-level confidence
      },
      performance: {
        parseTimeMs: stats.parseTimeMs,
        processTimeMs: Date.now() - stats.parseTimeMs,
        rowsPerSecond: stats.rowsPerSecond,
      },
      issues,
    };
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    importResult: EnhancedImportResult,
    diagnostics: ProcessingDiagnostics,
  ): string[] {
    const recommendations: string[] = [];

    // Data quality recommendations
    if (diagnostics.dataQuality.completeness < 0.9) {
      recommendations.push(
        `Data completeness is ${(diagnostics.dataQuality.completeness * 100).toFixed(1)}%. ` +
          `Review your CSV export settings to include all required fields.`,
      );
    }

    if (importResult.statistics.duplicateOrderIds > 0) {
      recommendations.push(
        `Found ${importResult.statistics.duplicateOrderIds} duplicate order IDs. ` +
          `Ensure your export includes unique transaction IDs.`,
      );
    }

    // Mapping recommendations
    if (diagnostics.mappingQuality.confidence < 0.8) {
      recommendations.push(
        "Consider creating a custom mapping file for better accuracy. " +
          'Run the "map" command to see suggested mappings.',
      );
    }

    if (diagnostics.mappingQuality.unmappedFields.length > 0) {
      const optional = diagnostics.mappingQuality.unmappedFields.filter(
        (f) => f !== CanonicalField.ORDER_ID && f !== CanonicalField.ORDER_DATE,
      );
      if (optional.length > 0) {
        recommendations.push(
          `Optional fields not mapped: ${optional.join(", ")}. ` +
            `Mapping these would provide more detailed analytics.`,
        );
      }
    }

    // Performance recommendations
    if (importResult.statistics.totalRows > 10000) {
      recommendations.push(
        "Large dataset detected. Consider using date range filters for faster processing.",
      );
    }

    return recommendations;
  }

  /**
   * Get normalized records
   */
  getRecords(): NormalizedRecord[] {
    return this.normalizedRecords;
  }

  /**
   * Get current mapping
   */
  getMapping(): FieldMapping {
    return this.mapping;
  }

  /**
   * Get import result
   */
  getImportResult(): EnhancedImportResult | undefined {
    return this.importResult;
  }

  /**
   * Export mapping configuration
   */
  exportMapping(): SavedMapping {
    return {
      vendorId: this.config.vendorId,
      mapping: this.mapping,
      createdAt: new Date(),
      confidence: this.mappingInference?.confidence || 1.0,
      sourceHeaders: this.getHeaders(),
    };
  }

  /**
   * Import mapping configuration
   */
  importMapping(savedMapping: SavedMapping): void {
    this.mapping = savedMapping.mapping;

    if (this.config.enableCaching && this.config.cacheKey) {
      EnhancedCSVProcessor.mappingCache.set(this.config.cacheKey, savedMapping);
    }
  }

  /**
   * Clear mapping cache
   */
  static clearMappingCache(): void {
    EnhancedCSVProcessor.mappingCache.clear();
  }

  /**
   * Get cached mapping
   */
  static getCachedMapping(cacheKey: string): SavedMapping | undefined {
    return EnhancedCSVProcessor.mappingCache.get(cacheKey);
  }
}
