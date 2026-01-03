// src/core/config-manager.ts
// Configuration manager for vendor-specific processor settings

import { ProcessorConfig } from "./processor-enhanced";

/**
 * Vendor configuration template
 */
export interface VendorConfig {
  vendorId: string;

  // Parsing behavior
  assumeFinanceSelected?: boolean;
  continueOnError?: boolean;
  maxErrors?: number;
  allowDuplicateOrderIds?: boolean;
  skipEmptyRows?: boolean;
  trimWhitespace?: boolean;

  // CSV format
  delimiter?: string;
  encoding?: string;

  // Mapping behavior
  mappingConfidenceThreshold?: number;
  autoInferMapping?: boolean;

  // Data quality
  minRequiredRows?: number;
  maxDuplicateRate?: number;

  // Performance
  enableCaching?: boolean;
  cacheKey?: string;

  // Vendor metadata
  vendorName?: string;
  vendorType?: "financial" | "ecommerce" | "legacy" | "mixed";
  dataQuality?: "high" | "medium" | "low";
  lastProcessed?: Date;
}

/**
 * Configuration manager for vendor-specific processor settings
 */
export class ProcessorConfigManager {
  private vendorConfigs: Map<string, VendorConfig> = new Map();
  private defaultConfig: VendorConfig;

  constructor() {
    // Set up default configuration
    this.defaultConfig = {
      vendorId: "default",
      assumeFinanceSelected: false,
      continueOnError: true,
      maxErrors: undefined, // Unlimited
      allowDuplicateOrderIds: false,
      skipEmptyRows: true,
      trimWhitespace: true,
      delimiter: undefined, // Auto-detect
      encoding: "UTF-8",
      mappingConfidenceThreshold: 0.6,
      autoInferMapping: true,
      minRequiredRows: 1,
      maxDuplicateRate: 0.1, // 10%
      enableCaching: true,
      vendorType: "mixed",
      dataQuality: "medium",
    };

    this.loadDefaultVendorConfigs();
  }

  /**
   * Load default configurations for common vendor types
   */
  private loadDefaultVendorConfigs(): void {
    // Financial institutions (banks, lenders)
    this.vendorConfigs.set("financial", {
      vendorId: "financial",
      vendorName: "Financial Institution",
      vendorType: "financial",
      dataQuality: "high",
      assumeFinanceSelected: true, // All rows are financed
      continueOnError: false, // Strict - financial data should be clean
      maxErrors: 10, // Stop early if issues
      allowDuplicateOrderIds: false,
      skipEmptyRows: true,
      trimWhitespace: true,
      delimiter: ",", // Standard CSV
      mappingConfidenceThreshold: 0.9, // High confidence required
      minRequiredRows: 100, // Need substantial data
      maxDuplicateRate: 0.01, // Almost no duplicates allowed
      enableCaching: true,
    });

    // E-commerce platforms
    this.vendorConfigs.set("ecommerce", {
      vendorId: "ecommerce",
      vendorName: "E-commerce Platform",
      vendorType: "ecommerce",
      dataQuality: "medium",
      assumeFinanceSelected: false, // Mixed finance/cash
      continueOnError: true, // Lenient - e-commerce can be messy
      maxErrors: 200, // Allow more errors
      allowDuplicateOrderIds: true, // Duplicates happen in e-commerce
      skipEmptyRows: true,
      trimWhitespace: true,
      delimiter: undefined, // Auto-detect (could be , or |)
      mappingConfidenceThreshold: 0.7, // Medium confidence
      minRequiredRows: 50,
      maxDuplicateRate: 0.05, // 5% duplicates allowed
      enableCaching: true,
    });

    // Legacy systems
    this.vendorConfigs.set("legacy", {
      vendorId: "legacy",
      vendorName: "Legacy System",
      vendorType: "legacy",
      dataQuality: "low",
      assumeFinanceSelected: false,
      continueOnError: true,
      maxErrors: undefined, // Process everything
      allowDuplicateOrderIds: true,
      skipEmptyRows: false, // Keep empty rows for audit
      trimWhitespace: true,
      encoding: "ISO-8859-1", // Legacy encoding
      mappingConfidenceThreshold: 0.5, // Low threshold
      minRequiredRows: 1, // Any data is good
      enableCaching: false, // Don't cache unreliable mappings
    });

    // High-volume retailers
    this.vendorConfigs.set("retailer", {
      vendorId: "retailer",
      vendorName: "High-Volume Retailer",
      vendorType: "mixed",
      dataQuality: "high",
      assumeFinanceSelected: false,
      continueOnError: true,
      maxErrors: 50,
      allowDuplicateOrderIds: false,
      skipEmptyRows: true,
      trimWhitespace: true,
      mappingConfidenceThreshold: 0.8,
      minRequiredRows: 500,
      maxDuplicateRate: 0.02,
      enableCaching: true,
    });
  }

  /**
   * Get configuration for a specific vendor
   */
  getConfig(vendorId: string, vendorType?: string): ProcessorConfig {
    // Determine vendor type if not specified
    const type = vendorType || this.detectVendorType(vendorId);

    // Get base configuration for vendor type
    const baseConfig = this.vendorConfigs.get(type) || this.defaultConfig;

    // Merge with vendor-specific overrides
    const config: ProcessorConfig = {
      vendorId,
      parseOptions: {
        assumeFinanceSelected: baseConfig.assumeFinanceSelected,
        continueOnError: baseConfig.continueOnError,
        maxErrors: baseConfig.maxErrors,
        allowDuplicateOrderIds: baseConfig.allowDuplicateOrderIds,
        skipEmptyRows: baseConfig.skipEmptyRows,
        trimWhitespace: baseConfig.trimWhitespace,
        delimiter: baseConfig.delimiter,
        encoding: baseConfig.encoding,
      },
      mappingConfidenceThreshold: baseConfig.mappingConfidenceThreshold,
      autoInferMapping: baseConfig.autoInferMapping,
      minRequiredRows: baseConfig.minRequiredRows,
      maxDuplicateRate: baseConfig.maxDuplicateRate,
      enableCaching: baseConfig.enableCaching,
      cacheKey: baseConfig.cacheKey || `${vendorId}-${type}`,
    };

    return config;
  }

  /**
   * Detect vendor type based on vendor ID patterns
   */
  private detectVendorType(vendorId: string): string {
    const id = vendorId.toLowerCase();

    if (
      id.includes("bank") ||
      id.includes("lender") ||
      id.includes("finance") ||
      id.includes("credit")
    ) {
      return "financial";
    }

    if (
      id.includes("shop") ||
      id.includes("store") ||
      id.includes("market") ||
      id.includes("ecom")
    ) {
      return "ecommerce";
    }

    if (
      id.includes("legacy") ||
      id.includes("old") ||
      id.includes("v1") ||
      id.includes("system")
    ) {
      return "legacy";
    }

    if (
      id.includes("retail") ||
      id.includes("chain") ||
      id.includes("outlet")
    ) {
      return "retailer";
    }

    return "ecommerce"; // Default to ecommerce
  }

  /**
   * Register a custom vendor configuration
   */
  registerVendorConfig(vendorId: string, config: Partial<VendorConfig>): void {
    const existing = this.vendorConfigs.get(vendorId) || this.defaultConfig;
    this.vendorConfigs.set(vendorId, { ...existing, ...config, vendorId });

    console.log(`✅ Registered configuration for vendor: ${vendorId}`);
  }

  /**
   * Update vendor configuration
   */
  updateVendorConfig(vendorId: string, updates: Partial<VendorConfig>): void {
    const existing = this.vendorConfigs.get(vendorId);
    if (existing) {
      this.vendorConfigs.set(vendorId, { ...existing, ...updates });
      console.log(`✅ Updated configuration for vendor: ${vendorId}`);
    } else {
      console.warn(
        `⚠️ Vendor ${vendorId} not found, creating new configuration`,
      );
      this.registerVendorConfig(vendorId, updates);
    }
  }

  /**
   * Get all registered vendor configurations
   */
  getAllConfigs(): Map<string, VendorConfig> {
    return new Map(this.vendorConfigs);
  }

  /**
   * Export configurations to JSON file
   */
  exportConfigs(filePath: string): void {
    const fs = require("fs");
    const configs = Object.fromEntries(this.vendorConfigs);
    fs.writeFileSync(filePath, JSON.stringify(configs, null, 2));
    console.log(
      `✅ Exported ${this.vendorConfigs.size} vendor configurations to ${filePath}`,
    );
  }

  /**
   * Import configurations from JSON file
   */
  importConfigs(filePath: string): void {
    const fs = require("fs");
    const configs = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    Object.entries(configs).forEach(([vendorId, config]) => {
      this.vendorConfigs.set(vendorId, config as VendorConfig);
    });

    console.log(
      `✅ Imported ${Object.keys(configs).length} vendor configurations from ${filePath}`,
    );
  }

  /**
   * Get vendor statistics
   */
  getStatistics(): {
    totalVendors: number;
    byType: Record<string, number>;
    byQuality: Record<string, number>;
  } {
    const byType: Record<string, number> = {};
    const byQuality: Record<string, number> = {};

    this.vendorConfigs.forEach((config) => {
      const type = config.vendorType || "unknown";
      const quality = config.dataQuality || "medium";

      byType[type] = (byType[type] || 0) + 1;
      byQuality[quality] = (byQuality[quality] || 0) + 1;
    });

    return {
      totalVendors: this.vendorConfigs.size,
      byType,
      byQuality,
    };
  }

  /**
   * Create processor with optimal configuration for vendor
   */
  createProcessor(vendorId: string, vendorType?: string): any {
    const config = this.getConfig(vendorId, vendorType);

    // Import EnhancedCSVProcessor dynamically to avoid circular dependencies
    const { EnhancedCSVProcessor } = require("./processor-enhanced");
    return new EnhancedCSVProcessor(config);
  }

  /**
   * Get recommendations for vendor configuration optimization
   */
  getOptimizationRecommendations(
    vendorId: string,
    processingStats: any,
  ): string[] {
    const recommendations: string[] = [];
    const config = this.vendorConfigs.get(vendorId) || this.defaultConfig;

    // Check error rate
    if (processingStats?.errorRate > 0.1 && config.continueOnError === false) {
      recommendations.push(
        "Consider enabling continueOnError for high error rate data",
      );
    }

    // Check duplicate rate
    if (
      processingStats?.duplicateRate > 0.05 &&
      !config.allowDuplicateOrderIds
    ) {
      recommendations.push(
        "Consider allowing duplicate order IDs for this vendor",
      );
    }

    // Check mapping confidence
    if (
      processingStats?.mappingConfidence < 0.7 &&
      (config.mappingConfidenceThreshold || 0.7) > 0.7
    ) {
      recommendations.push(
        "Lower mapping confidence threshold for better compatibility",
      );
    }

    // Check caching
    if (processingStats?.processingCount > 3 && !config.enableCaching) {
      recommendations.push("Enable caching for frequently processed vendor");
    }

    return recommendations;
  }
}
