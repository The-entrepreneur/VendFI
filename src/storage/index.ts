/**
 * src/storage/index.ts
 * Public API exports for the storage module
 *
 * This file re-exports the main classes and types that other parts
 * of the application need to interact with file-based storage.
 */

// Storage types and interfaces
export type {
  VendorProfile,
  ImportMetadata,
  LoadRecordsOptions,
  StorageOperationResult,
  DeduplicationConfig,
  StorageConfig,
  VendorDirectoryStructure,
  VendorStatistics,
  DeduplicationResult,
} from "./storage-types";

// File manager for low-level I/O
export { FileManager } from "./file-manager";

// Deduplication engine
export {
  DeduplicationEngine,
  type DedupKey,
  type DedupResult,
} from "./deduplication";

// Main vendor storage API
export {
  VendorStorage,
  getVendorStorage,
  resetVendorStorage,
} from "./vendor-storage";
