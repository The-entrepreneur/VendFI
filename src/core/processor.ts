// src/core/processor.ts

import {
    RawCSVRow,
    FieldMapping,
    AnalyticsReport,
    NormalizedRecord,
    ImportResult,
  } from '../types';
  import { parseCSV, getHeaders, parseCSVString } from '../parsers/csv-parser';
  import { inferMapping, validateMapping } from '../parsers/field-mapper';
  import { computeGlobalMetrics } from '../aggregators/global-metrics';
  import { 
    computeProductMetrics, 
    identifyFrictionHotspots 
  } from '../aggregators/product-metrics';
  import { computeTermMetrics } from '../aggregators/term-metrics';
  import { computeTimeSeries } from '../aggregators/time-series';
  
  /**
   * Main CSV Processing Engine
   */
  export class CSVProcessor {
    private vendorId: string;
    private rawRows: RawCSVRow[] = [];
    private normalizedRecords: NormalizedRecord[] = [];
    private mapping: FieldMapping = {};
    
    constructor(vendorId: string) {
      this.vendorId = vendorId;
    }
    
    /**
     * Load CSV data from string
     */
    loadFromString(csvContent: string): void {
      this.rawRows = parseCSVString(csvContent);
    }
    
    /**
     * Load CSV data from pre-parsed rows
     */
    loadFromRows(rows: RawCSVRow[]): void {
      this.rawRows = rows;
    }
    
    /**
     * Get CSV headers
     */
    getHeaders(): string[] {
      return getHeaders(this.rawRows);
    }
    
    /**
     * Auto-infer field mapping
     */
    inferMapping() {
      const headers = this.getHeaders();
      const inference = inferMapping(headers);
      
      return {
        inference,
        validation: validateMapping(inference.suggested_mapping),
      };
    }
    
    /**
     * Set field mapping manually
     */
    setMapping(mapping: FieldMapping): void {
      this.mapping = mapping;
    }
    
    /**
     * Import and normalize CSV data
     */
    import(options?: { assumeFinanceSelected?: boolean }): ImportResult {
      if (Object.keys(this.mapping).length === 0) {
        // Try auto-inference if no mapping set
        const { inference, validation } = this.inferMapping();
        
        if (!validation.valid) {
          throw new Error(
            `Invalid mapping: missing required fields: ${validation.missing.join(', ')}`
          );
        }
        
        this.mapping = inference.suggested_mapping;
      }
      
      const result = parseCSV(this.rawRows, this.mapping, options);
      this.normalizedRecords = result.records;
      
      return result;
    }
    
    /**
     * Generate complete analytics report
     */
    generateReport(dateFrom?: Date, dateTo?: Date): AnalyticsReport {
      if (this.normalizedRecords.length === 0) {
        throw new Error('No normalized records available. Run import() first.');
      }
      
      const globalMetrics = computeGlobalMetrics(
        this.normalizedRecords,
        dateFrom,
        dateTo
      );
      
      const productMetrics = computeProductMetrics(
        this.normalizedRecords,
        dateFrom,
        dateTo
      );
      
      const termMetrics = computeTermMetrics(
        this.normalizedRecords,
        dateFrom,
        dateTo
      );
      
      const timeSeries = computeTimeSeries(this.normalizedRecords, 'weekly');
      
      const frictionHotspots = identifyFrictionHotspots(
        productMetrics,
        globalMetrics.approval_rate
      );
      
      return {
        vendor_id: this.vendorId,
        generated_at: new Date(),
        global_metrics: globalMetrics,
        product_metrics: productMetrics,
        term_metrics: termMetrics,
        time_series: timeSeries,
        friction_hotspots: frictionHotspots,
      };
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
  }
  
  