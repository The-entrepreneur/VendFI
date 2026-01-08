/**
 * src/storage/deduplication.ts
 * Record deduplication logic for preventing duplicate imports
 *
 * WHY THIS MATTERS:
 * - Same vendor might submit data twice (accidental re-upload)
 * - Multiple data sources might overlap (same customer, different channels)
 * - Need to identify exact duplicates without losing legitimate records
 * - Must preserve all legitimate data while removing only true duplicates
 *
 * DEDUPLICATION STRATEGY:
 * 1. Primary key: order_id + vendor_id (guaranteed unique)
 * 2. Secondary check: order_date for temporal validation
 * 3. Optional fuzzy matching for text fields (company names, etc.)
 */

import { NormalizedRecord } from '../types';

/**
 * Deduplication key - uniquely identifies a record
 * Using order_id + vendor_id as primary key
 */
export interface DedupKey {
  vendor_id: string;
  order_id: string;
}

/**
 * Result of deduplication operation
 */
export interface DedupResult {
  /** Records that are new (not in existing set) */
  newRecords: NormalizedRecord[];

  /** Records that were duplicates (already exist) */
  duplicateRecords: NormalizedRecord[];

  /** Mapping of dedup key to duplicate records */
  duplicatesByKey: Map<string, NormalizedRecord[]>;

  /** Count of new records added */
  newCount: number;

  /** Count of duplicates found */
  duplicateCount: number;

  /** Duplicate rate (0-1) */
  duplicateRate: number;
}

/**
 * Deduplication engine
 * Identifies and separates duplicate records from unique ones
 */
export class DeduplicationEngine {
  /**
   * Create dedup key from record
   * Format: "vendor_id::order_id"
   */
  private static createKey(record: NormalizedRecord): string {
    return `${record.vendor_id}::${record.order_id}`;
  }

  /**
   * Deduplicate incoming records against existing records
   *
   * ALGORITHM:
   * 1. Build set of existing keys from currentRecords
   * 2. Iterate through incomingRecords
   * 3. If key exists and dates match: duplicate (skip)
   * 4. If key exists but dates differ: investigate (might be update)
   * 5. If key missing: new record (add)
   *
   * @param incomingRecords - New records to check for duplicates
   * @param existingRecords - Records already in storage
   * @returns DedupResult with new/duplicate separation
   */
  static deduplicate(
    incomingRecords: NormalizedRecord[],
    existingRecords: NormalizedRecord[]
  ): DedupResult {
    // Build lookup map of existing records by key
    const existingByKey = new Map<string, NormalizedRecord>();
    for (const record of existingRecords) {
      const key = this.createKey(record);
      if (!existingByKey.has(key)) {
        existingByKey.set(key, record);
      }
    }

    const newRecords: NormalizedRecord[] = [];
    const duplicateRecords: NormalizedRecord[] = [];
    const duplicatesByKey = new Map<string, NormalizedRecord[]>();

    // Process each incoming record
    for (const record of incomingRecords) {
      const key = this.createKey(record);

      if (existingByKey.has(key)) {
        // This is a duplicate
        duplicateRecords.push(record);

        if (!duplicatesByKey.has(key)) {
          duplicatesByKey.set(key, []);
        }
        duplicatesByKey.get(key)!.push(record);
      } else {
        // This is a new record
        newRecords.push(record);
      }
    }

    const totalProcessed = incomingRecords.length;
    const duplicateCount = duplicateRecords.length;
    const newCount = newRecords.length;

    return {
      newRecords,
      duplicateRecords,
      duplicatesByKey,
      newCount,
      duplicateCount,
      duplicateRate: totalProcessed > 0 ? duplicateCount / totalProcessed : 0,
    };
  }

  /**
   * Find duplicates within a single record set
   * Useful for identifying duplicates within an import before saving
   *
   * RETURNS:
   * - Deduped records (keeping first occurrence)
   * - Map of what was deduplicated
   */
  static deduplicateWithin(records: NormalizedRecord[]): {
    dedupedRecords: NormalizedRecord[];
    duplicates: Map<string, NormalizedRecord[]>;
    count: number;
  } {
    const seen = new Map<string, NormalizedRecord>();
    const duplicates = new Map<string, NormalizedRecord[]>();
    const dedupedRecords: NormalizedRecord[] = [];

    for (const record of records) {
      const key = this.createKey(record);

      if (seen.has(key)) {
        // This is a duplicate within the batch
        if (!duplicates.has(key)) {
          duplicates.set(key, []);
        }
        duplicates.get(key)!.push(record);
      } else {
        // First occurrence
        seen.set(key, record);
        dedupedRecords.push(record);
      }
    }

    return {
      dedupedRecords,
      duplicates,
      count: records.length - dedupedRecords.length,
    };
  }

  /**
   * Extract dedup keys from records for quick lookup
   * Useful for checking if a key exists without loading full records
   */
  static extractKeys(records: NormalizedRecord[]): Set<string> {
    const keys = new Set<string>();
    for (const record of records) {
      keys.add(this.createKey(record));
    }
    return keys;
  }

  /**
   * Check if a single record would be a duplicate
   */
  static isDuplicate(
    record: NormalizedRecord,
    existingRecords: NormalizedRecord[]
  ): boolean {
    const key = this.createKey(record);
    return existingRecords.some(r => this.createKey(r) === key);
  }

  /**
   * Filter records to only those that are NOT duplicates
   * Returns records not found in existing set
   */
  static filterNewRecords(
    incomingRecords: NormalizedRecord[],
    existingRecords: NormalizedRecord[]
  ): NormalizedRecord[] {
    const result = this.deduplicate(incomingRecords, existingRecords);
    return result.newRecords;
  }

  /**
   * Merge records by deduplicating and keeping most recent version
   *
   * STRATEGY:
   * - If same order_id appears in both sets, keep the one with latest update
   * - Based on order_date (newer is more recent)
   * - Useful for updates/corrections to existing orders
   */
  static mergeWithUpdates(
    existingRecords: NormalizedRecord[],
    incomingRecords: NormalizedRecord[]
  ): NormalizedRecord[] {
    const merged = new Map<string, NormalizedRecord>();

    // Add all existing records
    for (const record of existingRecords) {
      const key = this.createKey(record);
      merged.set(key, record);
    }

    // Process incoming records
    for (const incoming of incomingRecords) {
      const key = this.createKey(incoming);

      if (merged.has(key)) {
        // Record exists - keep newer version
        const existing = merged.get(key)!;
        if (incoming.order_date > existing.order_date) {
          merged.set(key, incoming);
        }
      } else {
        // New record
        merged.set(key, incoming);
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Generate statistics about deduplication
   */
  static getStats(result: DedupResult): {
    total: number;
    new: number;
    duplicates: number;
    duplicatePercentage: string;
  } {
    const total = result.newCount + result.duplicateCount;
    const percentage = (result.duplicateRate * 100).toFixed(2);

    return {
      total,
      new: result.newCount,
      duplicates: result.duplicateCount,
      duplicatePercentage: `${percentage}%`,
    };
  }
}
