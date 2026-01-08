/**
 * src/storage/vendor-storage.ts
 * Main API for vendor data persistence and retrieval
 *
 * ARCHITECTURAL PURPOSE:
 * This is the PRIMARY interface that the rest of the application uses to:
 * - Save vendor profiles and data
 * - Load vendor records for filtering/aggregation
 * - Track import history and metadata
 * - Handle deduplication automatically
 *
 * WHY THIS LAYER:
 * - Abstracts file operations (FileManager) and dedup logic
 * - Provides typed, high-level API for business logic
 * - Ensures consistent behavior across imports
 * - Makes it easy to swap storage backend (file -> database)
 *
 * USAGE PATTERN:
 * ```
 * const storage = new VendorStorage('./data');
 * storage.createVendor('acme-tech', { name: 'ACME Tech' });
 * storage.saveImport('acme-tech', records, metadata);
 * const records = storage.loadRecords('acme-tech');
 * ```
 */

import * as path from "path";
import { NormalizedRecord, FieldMapping } from "../types";
import { FileManager } from "./file-manager";
import { DeduplicationEngine, DedupResult } from "./deduplication";
import {
  VendorProfile,
  ImportMetadata,
  LoadRecordsOptions,
  StorageOperationResult,
  VendorStatistics,
} from "./storage-types";

/**
 * Main vendor storage system
 * Handles all persistence operations for vendor data
 */
export class VendorStorage {
  private fileManager: FileManager;
  private baseDir: string;

  /**
   * Initialize vendor storage
   * @param baseDir - Root directory for all vendor data (default: './data')
   */
  constructor(baseDir: string = "./data") {
    this.baseDir = baseDir;
    this.fileManager = new FileManager(baseDir);
  }

  /**
   * =====================================================================
   * VENDOR MANAGEMENT
   * =====================================================================
   */

  /**
   * Create a new vendor profile
   * Initializes directory structure and stores profile
   *
   * WHEN CALLED:
   * - First time a vendor is set up in system
   * - Before any data imports
   * - Called by CLI or admin interface
   */
  createVendor(
    vendorId: string,
    profile: Omit<
      VendorProfile,
      | "vendor_id"
      | "created_at"
      | "updated_at"
      | "total_records"
      | "unique_records"
    >,
  ): VendorProfile {
    // Check if vendor already exists
    const existingProfile = this.getVendorProfile(vendorId);
    if (existingProfile) {
      throw new Error(`Vendor '${vendorId}' already exists`);
    }

    // Initialize directory structure
    this.fileManager.initializeVendorDir(vendorId);

    // Create vendor profile
    const now = new Date().toISOString();
    const vendorProfile: VendorProfile = {
      vendor_id: vendorId,
      name: profile.name,
      description: profile.description,
      default_field_mapping: profile.default_field_mapping,
      created_at: now,
      updated_at: now,
      status: "active",
      total_records: 0,
      unique_records: 0,
      metadata: profile.metadata,
    };

    // Save profile
    const profilePath = this.getVendorProfilePath(vendorId);
    this.fileManager.writeJSON(profilePath, vendorProfile);

    return vendorProfile;
  }

  /**
   * Get vendor profile
   * Returns null if vendor doesn't exist
   */
  getVendorProfile(vendorId: string): VendorProfile | null {
    const profilePath = this.getVendorProfilePath(vendorId);
    if (!this.fileManager.fileExists(profilePath)) {
      return null;
    }
    return this.fileManager.readJSON<VendorProfile>(profilePath);
  }

  /**
   * Update vendor profile
   * Modifies existing vendor settings
   */
  updateVendorProfile(
    vendorId: string,
    updates: Partial<VendorProfile>,
  ): VendorProfile {
    const profile = this.getVendorProfile(vendorId);
    if (!profile) {
      throw new Error(`Vendor '${vendorId}' does not exist`);
    }

    const updated: VendorProfile = {
      ...profile,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const profilePath = this.getVendorProfilePath(vendorId);
    this.fileManager.writeJSON(profilePath, updated);

    return updated;
  }

  /**
   * List all vendors
   * Returns array of vendor IDs
   */
  listVendors(): string[] {
    const vendorsDir = path.join(this.baseDir, "vendors");
    if (!this.fileManager.dirExists(vendorsDir)) {
      return [];
    }
    return this.fileManager.listDirs(vendorsDir);
  }

  /**
   * Delete vendor completely
   * WARNING: This removes all data for vendor!
   */
  deleteVendor(vendorId: string): void {
    const vendorDir = this.fileManager.getVendorDir(vendorId);
    this.fileManager.deleteDir(vendorDir);
  }

  /**
   * =====================================================================
   * DATA IMPORT & PERSISTENCE
   * =====================================================================
   */

  /**
   * Save imported records to vendor storage
   * Handles deduplication automatically
   *
   * FLOW:
   * 1. Load existing records from storage
   * 2. Deduplicate incoming records
   * 3. Save new records to file
   * 4. Update vendor profile (record counts)
   * 5. Save import metadata
   *
   * @param vendorId - Vendor to save for
   * @param records - Normalized records from import
   * @param metadata - Import metadata (source file, mapping used, etc.)
   * @returns Operation result with counts
   */
  saveImport(
    vendorId: string,
    records: NormalizedRecord[],
    metadata: Omit<
      ImportMetadata,
      | "import_id"
      | "vendor_id"
      | "timestamp"
      | "new_records_count"
      | "deduplicated_count"
      | "dedup_keys"
    >,
  ): StorageOperationResult & {
    importId: string;
    deduplicationResult: DedupResult;
  } {
    // Verify vendor exists
    const profile = this.getVendorProfile(vendorId);
    if (!profile) {
      throw new Error(`Vendor '${vendorId}' does not exist`);
    }

    // Load existing records for deduplication
    const existingRecords = this.loadRecordsRaw(vendorId);

    // Deduplicate
    const dedupResult = DeduplicationEngine.deduplicate(
      records,
      existingRecords,
    );

    // Save new records
    const recordsPath = this.getVendorRecordsPath(vendorId);
    this.fileManager.appendJSON(recordsPath, dedupResult.newRecords);

    // Create import metadata with dedup info
    const importId = this.generateImportId();
    const importMetadata: ImportMetadata = {
      import_id: importId,
      vendor_id: vendorId,
      timestamp: new Date().toISOString(),
      source_file: metadata.source_file,
      field_mapping: metadata.field_mapping,
      total_records: records.length,
      new_records: dedupResult.newCount,
      duplicate_records: dedupResult.duplicateCount,
      error_records: 0,
      notes: metadata.notes,
    };

    // Save import metadata
    const importsDir = this.getVendorImportsDir(vendorId);
    this.fileManager.ensureDir(importsDir);
    const importFile = path.join(importsDir, `${importId}.json`);
    this.fileManager.writeJSON(importFile, importMetadata);

    // Update vendor profile
    const updatedProfile = this.updateVendorProfile(vendorId, {
      total_records: profile.total_records + dedupResult.newCount,
      unique_records: profile.unique_records + dedupResult.newCount,
      last_import_at: new Date().toISOString(),
    });

    return {
      success: true,
      message: `Imported ${dedupResult.newCount} new records (${dedupResult.duplicateCount} duplicates skipped)`,
      recordsAffected: dedupResult.newCount,
      importId,
      deduplicationResult: dedupResult,
    };
  }

  /**
   * Load records for a vendor
   * Returns normalized records, optionally filtered
   *
   * @param vendorId - Vendor to load for
   * @param options - Filter/pagination options
   * @returns Array of normalized records
   */
  loadRecords(
    vendorId: string,
    options?: LoadRecordsOptions,
  ): NormalizedRecord[] {
    const records = this.loadRecordsRaw(vendorId);

    if (!options) {
      return records;
    }

    let filtered = records;

    // Filter by date range
    if (options.dateRange) {
      filtered = filtered.filter((r) => {
        const recordDate =
          r.order_date instanceof Date ? r.order_date : new Date(r.order_date);
        return (
          recordDate >= options.dateRange!.from &&
          recordDate <= options.dateRange!.to
        );
      });
    }

    // Filter by import IDs
    if (options.importIds && options.importIds.length > 0) {
      const importRecordIds = this.getRecordsFromImports(
        vendorId,
        options.importIds,
      );
      const importIdSet = new Set(importRecordIds);
      filtered = filtered.filter((r) => importIdSet.has(r.order_id));
    }

    // Sort
    if (options.sortBy) {
      filtered = this.sortRecords(
        filtered,
        options.sortBy,
        options.sortOrder || "asc",
      );
    }

    // Paginate
    if (options.skip || options.limit) {
      const skip = options.skip || 0;
      const limit = options.limit || filtered.length;
      filtered = filtered.slice(skip, skip + limit);
    }

    return filtered;
  }

  /**
   * =====================================================================
   * IMPORT HISTORY
   * =====================================================================
   */

  /**
   * Get import metadata
   * Returns details about a specific import
   */
  getImportMetadata(vendorId: string, importId: string): ImportMetadata | null {
    const importFile = path.join(
      this.getVendorImportsDir(vendorId),
      `${importId}.json`,
    );
    if (!this.fileManager.fileExists(importFile)) {
      return null;
    }
    return this.fileManager.readJSON<ImportMetadata>(importFile);
  }

  /**
   * List all imports for a vendor
   * Returns imports sorted by date (newest first)
   */
  listImports(vendorId: string): ImportMetadata[] {
    const importsDir = this.getVendorImportsDir(vendorId);

    // Check if imports directory exists
    if (!this.fileManager.dirExists(importsDir)) {
      return [];
    }

    const files = this.fileManager.listFiles(importsDir, ".json");

    const imports = files
      .map((file) => {
        try {
          const filePath = path.join(importsDir, file);
          const data = this.fileManager.readJSON<ImportMetadata>(filePath);
          return data;
        } catch (error) {
          return null;
        }
      })
      .filter((item): item is ImportMetadata => item !== null);

    // Sort by timestamp (newest first)
    imports.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return imports;
  }

  /**
   * =====================================================================
   * STATISTICS & MONITORING
   * =====================================================================
   */

  /**
   * Get statistics for a vendor
   * Provides overview of data volume and import history
   */
  getVendorStatistics(vendorId: string): VendorStatistics {
    const profile = this.getVendorProfile(vendorId);
    if (!profile) {
      throw new Error(`Vendor '${vendorId}' does not exist`);
    }

    const records = this.loadRecordsRaw(vendorId);
    const imports = this.listImports(vendorId);
    const vendorDir = this.fileManager.getVendorDir(vendorId);
    const diskUsage = this.fileManager.getDirSize(vendorDir);

    // Find date range of records
    let oldestDate: string | undefined;
    let newestDate: string | undefined;

    if (records.length > 0) {
      const dates = records.map((r) =>
        r.order_date instanceof Date ? r.order_date : new Date(r.order_date),
      );
      const sorted = dates.sort((a, b) => a.getTime() - b.getTime());
      oldestDate = sorted[0].toISOString();
      newestDate = sorted[sorted.length - 1].toISOString();
    }

    return {
      vendor_id: vendorId,
      total_records: records.length,
      unique_records: records.length, // After dedup, all are unique
      import_count: imports.length,
      oldest_record_date: oldestDate,
      newest_record_date: newestDate,
      disk_usage_bytes: diskUsage,
      last_modified: new Date().toISOString(),
    };
  }

  /**
   * =====================================================================
   * PRIVATE HELPER METHODS
   * =====================================================================
   */

  /**
   * Load raw records from file (no filtering)
   */
  private loadRecordsRaw(vendorId: string): NormalizedRecord[] {
    const recordsPath = this.getVendorRecordsPath(vendorId);
    if (!this.fileManager.fileExists(recordsPath)) {
      return [];
    }

    try {
      const content = this.fileManager.readText(recordsPath);
      if (!content.trim()) {
        return [];
      }

      // Try parsing as JSONL first
      const lines = content.split("\n").filter((l) => l.trim());
      const records = lines
        .map((line) => {
          try {
            return JSON.parse(line) as NormalizedRecord;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as NormalizedRecord[];

      return records;
    } catch {
      return [];
    }
  }

  /**
   * Append JSON objects to records file (JSONL format)
   * Each object on its own line for easy streaming
   */
  private appendJSON(filePath: string, records: NormalizedRecord[]): void {
    this.fileManager.appendJSON(filePath, records);
  }

  /**
   * Get records from specific imports
   */
  private getRecordsFromImports(
    vendorId: string,
    importIds: string[],
  ): string[] {
    const recordIds: string[] = [];

    for (const importId of importIds) {
      const metadata = this.getImportMetadata(vendorId, importId);
      if (metadata) {
        // Note: We'd need to store which records belong to which import
        // For now, this is a placeholder for the architecture
      }
    }

    return recordIds;
  }

  /**
   * Sort records by field
   */
  private sortRecords(
    records: NormalizedRecord[],
    sortBy: string,
    order: "asc" | "desc",
  ): NormalizedRecord[] {
    const sorted = [...records].sort((a, b) => {
      const aVal = (a as any)[sortBy];
      const bVal = (b as any)[sortBy];

      if (aVal < bVal) return order === "asc" ? -1 : 1;
      if (aVal > bVal) return order === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }

  /**
   * Generate unique import ID (timestamp-based)
   */
  private generateImportId(): string {
    return `import_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get path to vendor profile file
   */
  private getVendorProfilePath(vendorId: string): string {
    return path.join(this.baseDir, "vendors", vendorId, "vendor.json");
  }

  /**
   * Get path to vendor records file
   */
  private getVendorRecordsPath(vendorId: string): string {
    return path.join(
      this.baseDir,
      "vendors",
      vendorId,
      "records",
      "records.jsonl",
    );
  }

  /**
   * Get vendor imports directory
   */
  private getVendorImportsDir(vendorId: string): string {
    return path.join(this.baseDir, "vendors", vendorId, "imports");
  }
}

/**
 * Export singleton-like function for consistent storage access
 */
let storageInstance: VendorStorage | null = null;

export function getVendorStorage(baseDir?: string): VendorStorage {
  if (!storageInstance || (baseDir && baseDir !== storageInstance["baseDir"])) {
    storageInstance = new VendorStorage(baseDir);
  }
  return storageInstance;
}

export function resetVendorStorage(): void {
  storageInstance = null;
}
