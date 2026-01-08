// src/index.ts - Main export
// This file exports all public APIs for the CSV processor

export * from "./types";
export * from "./core/processor";
export {
  inferMapping,
  validateMapping,
  createManualMapping,
} from "./parsers/field-mapper";
export { parseCSVString } from "./parsers/csv-parser";
export {
  VendorStorage,
  getVendorStorage,
  resetVendorStorage,
} from "./storage/vendor-storage";
export { FileManager } from "./storage/file-manager";
export { DeduplicationEngine } from "./storage/deduplication";
export type {
  ImportMetadata,
  LoadRecordsOptions,
  StorageOperationResult,
  DeduplicationConfig,
  StorageConfig,
  VendorDirectoryStructure,
  VendorStatistics,
} from "./storage/storage-types";

// Re-export commonly used types and classes for convenience
import { FieldMapping, AnalyticsReport } from "./types";
import { CSVProcessor } from "./core/processor";

export { FieldMapping, AnalyticsReport, CSVProcessor };

// Convenience function for quick processing
export function processCSV(
  csvContent: string,
  vendorId: string,
  mapping?: FieldMapping,
): AnalyticsReport {
  const processor = new CSVProcessor(vendorId);
  processor.loadFromString(csvContent);

  if (mapping) {
    processor.setMapping(mapping);
  }

  processor.import();
  return processor.generateReport();
}
