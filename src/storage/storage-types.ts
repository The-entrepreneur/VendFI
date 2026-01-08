/**
 * src/storage/storage-types.ts
 * Type definitions for file-based vendor storage system
 *
 * ARCHITECTURAL PURPOSE:
 * These types define the contract for vendor persistence, deduplication,
 * and import metadata tracking. They form the foundation for Week 2
 * file-based storage implementation.
 */

import { NormalizedRecord, FieldMapping } from "../types";

/**
 * Metadata about a single import operation
 * Tracks when data was imported, from where, and key statistics
 */
export interface ImportMetadata {
  /** Unique import ID (timestamp-based or UUID) */
  import_id: string;

  /** Vendor this import belongs to */
  vendor_id: string;

  /** When the import occurred (ISO 8601) */
  timestamp: string;

  /** Original source file name (e.g., 'Q4_2024_sales.csv') */
  source_file: string;

  /** Field mapping used during this import */
  field_mapping: FieldMapping;

  /** Total records in import before deduplication */
  total_records: number;

  /** Records that were new (not duplicates) */
  new_records: number;

  /** Records that were duplicates (skipped) */
  duplicate_records: number;

  /** Records that caused errors */
  error_records: number;

  /** Date range of data in this import (if determinable) */
  data_date_range?: {
    from: string; // ISO 8601
    to: string; // ISO 8601
  };

  /** Additional notes about this import */
  notes?: string;
}

/**
 * Vendor profile - persistent configuration and metadata
 * Stores vendor-specific settings, mappings, and history
 */
export interface VendorProfile {
  /** Unique vendor identifier */
  vendor_id: string;

  /** Human-readable vendor name */
  name: string;

  /** Business description */
  description?: string;

  /** Default field mapping for this vendor's CSV files */
  default_field_mapping: FieldMapping;

  /** When vendor was created in system */
  created_at: string; // ISO 8601

  /** Last time vendor profile was updated */
  updated_at: string; // ISO 8601

  /** Last time vendor imported data */
  last_import_at?: string; // ISO 8601

  /** Total number of records for this vendor (across all imports) */
  total_records: number;

  /** Number of unique records (after deduplication) */
  unique_records: number;

  /** Status of vendor (active, inactive, archived) */
  status: "active" | "inactive" | "archived";

  /** Custom metadata (e.g., customer type, region, etc.) */
  metadata?: Record<string, any>;
}

/**
 * Options for loading vendor records
 * Allows filtering, pagination, and date range selection
 */
export interface LoadRecordsOptions {
  /** Filter by date range */
  dateRange?: {
    from: Date;
    to: Date;
  };

  /** Only return records from specific imports */
  importIds?: string[];

  /** Pagination: skip N records */
  skip?: number;

  /** Pagination: limit results to N records */
  limit?: number;

  /** Sort by field (e.g., 'order_date', 'order_value') */
  sortBy?: string;

  /** Sort direction */
  sortOrder?: "asc" | "desc";
}

/**
 * Result of a storage operation
 * Provides details about what was saved/loaded
 */
export interface StorageOperationResult {
  /** Whether operation succeeded */
  success: boolean;

  /** Message describing result */
  message: string;

  /** Number of records affected */
  recordsAffected: number;

  /** Any errors that occurred (for partial failures) */
  errors?: Array<{
    recordIndex?: number;
    recordId?: string;
    error: string;
  }>;
}

/**
 * Deduplication strategy
 * Defines how to identify and handle duplicate records
 */
export interface DeduplicationConfig {
  /** Fields to use for uniqueness check (e.g., ['order_id', 'vendor_id']) */
  keyFields: string[];

  /** When duplicate found, use this strategy */
  strategy: "skip" | "replace" | "merge";

  /** Enable fuzzy matching for text fields (e.g., company names) */
  fuzzyMatch?: boolean;

  /** Fuzzy match threshold (0-1, e.g., 0.9 for 90% match) */
  fuzzyThreshold?: number;
}

/**
 * Configuration for vendor storage system
 * Defines where files are stored and how they're organized
 */
export interface StorageConfig {
  /** Base directory for all vendor data */
  baseDir: string;

  /** Deduplication strategy */
  deduplication: DeduplicationConfig;

  /** Enable compression for large record files */
  enableCompression?: boolean;

  /** Maximum records per file before splitting */
  maxRecordsPerFile?: number;

  /** How many days to keep import history */
  importHistoryRetentionDays?: number;
}

/**
 * Directory structure for a vendor
 * Describes how files are organized within a vendor directory
 */
export interface VendorDirectoryStructure {
  /** Root vendor directory: {baseDir}/vendors/{vendor_id}/ */
  root: string;

  /** Vendor profile file: {root}/vendor.json */
  vendorProfile: string;

  /** Normalized records directory: {root}/records/ */
  recordsDir: string;

  /** Import metadata directory: {root}/imports/ */
  importsDir: string;

  /** Field mappings directory: {root}/mappings/ */
  mappingsDir: string;

  /** Temp working directory for processing: {root}/.tmp/ */
  tmpDir: string;
}

/**
 * Statistics about vendor data
 * Summary metrics across all imports and records
 */
export interface VendorStatistics {
  /** Vendor ID */
  vendor_id: string;

  /** Total records stored */
  total_records: number;

  /** Unique records (after dedup) */
  unique_records: number;

  /** Number of imports */
  import_count: number;

  /** Date of oldest record */
  oldest_record_date?: string; // ISO 8601

  /** Date of newest record */
  newest_record_date?: string; // ISO 8601

  /** Disk usage in bytes */
  disk_usage_bytes?: number;

  /** Last modified timestamp */
  last_modified: string; // ISO 8601
}

/**
 * Deduplication result
 * Details about which records were duplicates
 */
export interface DeduplicationResult {
  /** Records that were new/unique */
  newRecords: NormalizedRecord[];

  /** Records that were duplicates (grouped by key) */
  duplicates: Map<string, NormalizedRecord[]>;

  /** Total duplicates found */
  totalDuplicates: number;

  /** Duplicate rate (0-1, e.g., 0.15 = 15% duplicates) */
  duplicateRate: number;
}
