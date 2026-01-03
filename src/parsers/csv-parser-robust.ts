// src/parsers/csv-parser-robust.ts
// Production-ready CSV parser with PapaParse, streaming support, and error recovery

import * as Papa from "papaparse";
import {
  RawCSVRow,
  FieldMapping,
  NormalizedRecord,
  ImportResult,
  CanonicalField,
} from "../types";
import { normalizeDate } from "../normalizers/date-normalizer";
import { normalizeStatus } from "../normalizers/status-normalizer";
import {
  normalizeBoolean,
  normalizeNumber,
  normalizeInteger,
  normalizeString,
} from "../normalizers/value-normalizer";

/**
 * Advanced parsing options
 */
export interface ParseOptions {
  assumeFinanceSelected?: boolean;
  skipValidation?: boolean;

  // Error handling
  continueOnError?: boolean; // Continue parsing even if some rows fail
  maxErrors?: number; // Stop after N errors (default: unlimited)

  // Data cleaning
  trimWhitespace?: boolean; // Trim all fields (default: true)
  skipEmptyRows?: boolean; // Skip rows with all empty values (default: true)

  // Encoding
  encoding?: string; // File encoding (default: 'UTF-8')

  // CSV format detection
  delimiter?: string; // Auto-detect if not specified
  quoteChar?: string; // Default: "
  escapeChar?: string; // Default: "

  // Performance
  chunkSize?: number; // For streaming large files

  // Validation rules
  requireMinimumColumns?: number;
  allowDuplicateOrderIds?: boolean;
}

/**
 * Parsing statistics and diagnostics
 */
export interface ParseStatistics {
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  skippedRows: number;
  emptyRows: number;
  duplicateOrderIds: number;

  // Field-level stats
  missingRequiredFields: Record<string, number>;
  invalidDataTypes: Record<string, number>;

  // Performance
  parseTimeMs: number;
  rowsPerSecond: number;
}

/**
 * Enhanced import result with statistics
 */
export interface EnhancedImportResult extends ImportResult {
  statistics: ParseStatistics;
  warnings: Array<{
    row_number: number;
    field: string;
    message: string;
    value?: any;
  }>;
}

/**
 * Validation error details
 */
interface ValidationError {
  row_number: number;
  field?: string;
  error: string;
  raw_value?: any;
  severity: "error" | "warning";
}

/**
 * Enhanced CSV parser with PapaParse
 */
export class RobustCSVParser {
  private options: ParseOptions;
  private statistics: ParseStatistics;
  private validationErrors: ValidationError[] = [];
  private seenOrderIds: Set<string> = new Set();

  constructor(options: ParseOptions = {}) {
    this.options = {
      continueOnError: true,
      maxErrors: undefined,
      trimWhitespace: true,
      skipEmptyRows: true,
      encoding: "UTF-8",
      allowDuplicateOrderIds: false,
      ...options,
    };

    this.statistics = this.initializeStatistics();
  }

  private initializeStatistics(): ParseStatistics {
    return {
      totalRows: 0,
      successfulRows: 0,
      failedRows: 0,
      skippedRows: 0,
      emptyRows: 0,
      duplicateOrderIds: 0,
      missingRequiredFields: {},
      invalidDataTypes: {},
      parseTimeMs: 0,
      rowsPerSecond: 0,
    };
  }

  /**
   * Parse CSV from string with PapaParse
   */
  parseFromString(csvContent: string): RawCSVRow[] {
    const parseResult = Papa.parse(csvContent, {
      header: true,
      dynamicTyping: false, // Keep everything as strings for custom normalization
      skipEmptyLines: this.options.skipEmptyRows,
      delimiter: this.options.delimiter,
      quoteChar: this.options.quoteChar || '"',
      escapeChar: this.options.escapeChar || '"',
      transformHeader: (header: string) => {
        // Normalize headers: trim and handle common issues
        return header
          .trim()
          .replace(/\u200B/g, "") // Remove zero-width spaces
          .replace(/\uFEFF/g, ""); // Remove BOM
      },
      transform: (value: string) => {
        if (this.options.trimWhitespace && typeof value === "string") {
          return value.trim();
        }
        return value;
      },
    });

    if (parseResult.errors && parseResult.errors.length > 0) {
      console.warn("PapaParse found errors:", parseResult.errors);
      parseResult.errors.forEach((err: Papa.ParseError) => {
        this.validationErrors.push({
          row_number: err.row || 0,
          error: err.message,
          severity: "warning",
        });
      });
    }

    return parseResult.data as RawCSVRow[];
  }

  /**
   * Parse CSV from file with auto-encoding detection
   */
  async parseFromFile(filePath: string): Promise<RawCSVRow[]> {
    return new Promise((resolve, reject) => {
      const fs = require("fs");
      const fileContent = fs.readFileSync(filePath, this.options.encoding);

      try {
        const rows = this.parseFromString(fileContent);
        resolve(rows);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Parse CSV with streaming for large files
   */
  async parseFromStream(
    filePath: string,
    onChunk: (rows: RawCSVRow[]) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const fs = require("fs");
      const stream = fs.createReadStream(filePath, {
        encoding: this.options.encoding,
      });

      Papa.parse(stream, {
        header: true,
        dynamicTyping: false,
        skipEmptyLines: this.options.skipEmptyRows,
        chunk: (results: Papa.ParseResult<unknown>) => {
          onChunk(results.data as RawCSVRow[]);
        },
        complete: () => resolve(),
        error: (error: Error) => reject(error),
      });
    });
  }

  /**
   * Validate a single row before normalization
   */
  private validateRow(
    rawRow: RawCSVRow,
    mapping: FieldMapping,
    rowNumber: number,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check if row is completely empty
    const hasAnyValue = Object.values(rawRow).some(
      (v) => v !== null && v !== undefined && v !== "",
    );
    if (!hasAnyValue) {
      this.statistics.emptyRows++;
      return [
        {
          row_number: rowNumber,
          error: "Empty row",
          severity: "warning",
        },
      ];
    }

    // Validate required fields exist
    const requiredFields = [CanonicalField.ORDER_ID, CanonicalField.ORDER_DATE];

    for (const field of requiredFields) {
      const sourceColumn = mapping[field];
      if (!sourceColumn) {
        errors.push({
          row_number: rowNumber,
          field,
          error: `Required field ${field} not mapped`,
          severity: "error",
        });
        this.statistics.missingRequiredFields[field] =
          (this.statistics.missingRequiredFields[field] || 0) + 1;
        continue;
      }

      const value = rawRow[sourceColumn];
      if (value === null || value === undefined || value === "") {
        errors.push({
          row_number: rowNumber,
          field,
          error: `Required field ${field} is empty`,
          raw_value: value,
          severity: "error",
        });
        this.statistics.missingRequiredFields[field] =
          (this.statistics.missingRequiredFields[field] || 0) + 1;
      }
    }

    // Check for duplicate order IDs
    if (mapping[CanonicalField.ORDER_ID]) {
      const orderId = String(rawRow[mapping[CanonicalField.ORDER_ID]] || "");
      if (orderId && this.seenOrderIds.has(orderId)) {
        this.statistics.duplicateOrderIds++;
        if (!this.options.allowDuplicateOrderIds) {
          errors.push({
            row_number: rowNumber,
            field: CanonicalField.ORDER_ID,
            error: `Duplicate order ID: ${orderId}`,
            raw_value: orderId,
            severity: "error",
          });
        } else {
          errors.push({
            row_number: rowNumber,
            field: CanonicalField.ORDER_ID,
            error: `Duplicate order ID: ${orderId}`,
            raw_value: orderId,
            severity: "warning",
          });
        }
      }
      this.seenOrderIds.add(orderId);
    }

    return errors;
  }

  /**
   * Normalize a single row with enhanced error handling
   */
  private normalizeRowRobust(
    rawRow: RawCSVRow,
    mapping: FieldMapping,
    rowNumber: number,
  ): { record: NormalizedRecord | null; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    try {
      // Extract mapped values with error tracking
      const getValue = (field: CanonicalField, required: boolean = false) => {
        const sourceColumn = mapping[field];
        if (!sourceColumn) {
          if (required) {
            errors.push({
              row_number: rowNumber,
              field,
              error: `Field ${field} not mapped`,
              severity: "error",
            });
          }
          return null;
        }
        return rawRow[sourceColumn];
      };

      // Required fields
      const orderIdRaw = getValue(CanonicalField.ORDER_ID, true);
      const orderDateRaw = getValue(CanonicalField.ORDER_DATE, true);

      if (!orderIdRaw || !orderDateRaw) {
        return { record: null, errors };
      }

      const orderId = String(orderIdRaw);
      const orderDate = normalizeDate(orderDateRaw);

      if (!orderDate) {
        errors.push({
          row_number: rowNumber,
          field: CanonicalField.ORDER_DATE,
          error: "Invalid date format",
          raw_value: orderDateRaw,
          severity: "error",
        });
        this.statistics.invalidDataTypes[CanonicalField.ORDER_DATE] =
          (this.statistics.invalidDataTypes[CanonicalField.ORDER_DATE] || 0) +
          1;
        return { record: null, errors };
      }

      // Optional fields with error tracking
      const productName =
        normalizeString(getValue(CanonicalField.PRODUCT_NAME)) || "Unknown";
      const productSku = normalizeString(getValue(CanonicalField.PRODUCT_SKU));
      const productCategory = normalizeString(
        getValue(CanonicalField.PRODUCT_CATEGORY),
      );

      const orderValueRaw = getValue(CanonicalField.ORDER_VALUE);
      const orderValue = normalizeNumber(orderValueRaw);
      if (orderValueRaw && !orderValue) {
        errors.push({
          row_number: rowNumber,
          field: CanonicalField.ORDER_VALUE,
          error: "Invalid number format",
          raw_value: orderValueRaw,
          severity: "warning",
        });
      }

      // Finance fields
      let financeSelected = this.options.assumeFinanceSelected || false;
      if (mapping[CanonicalField.FINANCE_SELECTED]) {
        financeSelected = normalizeBoolean(
          getValue(CanonicalField.FINANCE_SELECTED),
        );
      }

      const financeProvider = normalizeString(
        getValue(CanonicalField.FINANCE_PROVIDER),
      );

      const termRaw = getValue(CanonicalField.FINANCE_TERM_MONTHS);
      const financeTermMonths = normalizeInteger(termRaw);
      if (termRaw && !financeTermMonths) {
        errors.push({
          row_number: rowNumber,
          field: CanonicalField.FINANCE_TERM_MONTHS,
          error: "Invalid term format",
          raw_value: termRaw,
          severity: "warning",
        });
      }

      const financeDecisionStatus = normalizeStatus(
        getValue(CanonicalField.FINANCE_DECISION_STATUS),
      );

      const financeDecisionDate = normalizeDate(
        getValue(CanonicalField.FINANCE_DECISION_DATE),
      );

      const customerId = normalizeString(getValue(CanonicalField.CUSTOMER_ID));
      const customerSegment = normalizeString(
        getValue(CanonicalField.CUSTOMER_SEGMENT),
      );

      const record: NormalizedRecord = {
        order_id: orderId,
        order_date: orderDate,
        product_name: productName,
        product_sku: productSku,
        product_category: productCategory,
        order_value: orderValue,
        finance_selected: financeSelected,
        finance_provider: financeProvider,
        finance_term_months: financeTermMonths,
        finance_decision_status: financeDecisionStatus,
        finance_decision_date: financeDecisionDate,
        customer_id: customerId,
        customer_segment: customerSegment,
      };

      return { record, errors };
    } catch (error) {
      errors.push({
        row_number: rowNumber,
        error: `Unexpected error: ${(error as Error).message}`,
        severity: "error",
      });
      return { record: null, errors };
    }
  }

  /**
   * Parse and normalize CSV with comprehensive error handling
   */
  parseAndNormalize(
    rawRows: RawCSVRow[],
    mapping: FieldMapping,
  ): EnhancedImportResult {
    const startTime = Date.now();

    this.statistics = this.initializeStatistics();
    this.validationErrors = [];
    this.seenOrderIds.clear();

    const records: NormalizedRecord[] = [];
    const errors: Array<{ row_number: number; error: string }> = [];
    const warnings: Array<{
      row_number: number;
      field: string;
      message: string;
      value?: any;
    }> = [];

    this.statistics.totalRows = rawRows.length;

    for (let i = 0; i < rawRows.length; i++) {
      const rowNumber = i + 2; // +2 for 1-indexed and header row
      const rawRow = rawRows[i];

      // Pre-validation
      const validationErrors = this.validateRow(rawRow, mapping, rowNumber);

      // Check if we should skip this row
      if (
        validationErrors.some(
          (e) => e.severity === "error" && e.error === "Empty row",
        )
      ) {
        this.statistics.skippedRows++;
        continue;
      }

      // Attempt normalization
      const { record, errors: normErrors } = this.normalizeRowRobust(
        rawRow,
        mapping,
        rowNumber,
      );

      const allErrors = [...validationErrors, ...normErrors];

      // Separate errors and warnings
      const criticalErrors = allErrors.filter((e) => e.severity === "error");
      const rowWarnings = allErrors.filter((e) => e.severity === "warning");

      // Add to warnings
      rowWarnings.forEach((w) => {
        warnings.push({
          row_number: rowNumber,
          field: w.field || "unknown",
          message: w.error,
          value: w.raw_value,
        });
      });

      // Handle critical errors
      if (criticalErrors.length > 0) {
        this.statistics.failedRows++;

        criticalErrors.forEach((e) => {
          errors.push({
            row_number: rowNumber,
            error: `${e.field ? `[${e.field}] ` : ""}${e.error}`,
          });
        });

        // Check if we should stop
        if (this.options.maxErrors && errors.length >= this.options.maxErrors) {
          errors.push({
            row_number: rowNumber,
            error: `Stopping: Maximum error limit (${this.options.maxErrors}) reached`,
          });
          break;
        }

        if (!this.options.continueOnError) {
          break;
        }

        continue;
      }

      // Success
      if (record) {
        records.push(record);
        this.statistics.successfulRows++;
      }
    }

    // Calculate performance metrics
    this.statistics.parseTimeMs = Date.now() - startTime;
    this.statistics.rowsPerSecond =
      this.statistics.parseTimeMs > 0
        ? Math.round(
            (this.statistics.totalRows / this.statistics.parseTimeMs) * 1000,
          )
        : 0;

    return {
      total_rows: this.statistics.totalRows,
      successfully_normalized: this.statistics.successfulRows,
      failed_rows: this.statistics.failedRows,
      errors,
      records,
      statistics: this.statistics,
      warnings,
    };
  }

  /**
   * Get parsing statistics
   */
  getStatistics(): ParseStatistics {
    return { ...this.statistics };
  }

  /**
   * Reset parser state
   */
  reset(): void {
    this.statistics = this.initializeStatistics();
    this.validationErrors = [];
    this.seenOrderIds.clear();
  }
}

/**
 * Convenience function for simple parsing
 */
export function parseCSVRobust(
  csvContent: string,
  mapping: FieldMapping,
  options: ParseOptions = {},
): EnhancedImportResult {
  const parser = new RobustCSVParser(options);
  const rawRows = parser.parseFromString(csvContent);
  return parser.parseAndNormalize(rawRows, mapping);
}

/**
 * Auto-detect CSV delimiter
 */
export function detectDelimiter(csvSample: string): string {
  const result = Papa.parse(csvSample, {
    preview: 5,
    delimitersToGuess: [",", "\t", "|", ";"],
  });
  return result.meta?.delimiter || ",";
}

/**
 * Detect file encoding (basic)
 */
export function detectEncoding(buffer: Buffer): string {
  // Check for BOM
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return "UTF-8";
  }
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    return "UTF-16LE";
  }
  if (buffer[0] === 0xfe && buffer[1] === 0xff) {
    return "UTF-16BE";
  }

  // Default to UTF-8
  return "UTF-8";
}
