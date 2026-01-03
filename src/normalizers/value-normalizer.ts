// src/normalizers/value-normalizer.ts

/**
 * Parse a value to boolean
 */
export function normalizeBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (value === null || value === undefined) return false;
    
    const str = String(value).toLowerCase().trim();
    
    // True values
    if (['true', 'yes', 'y', '1', 'on', 'enabled'].includes(str)) {
      return true;
    }
    
    // False values
    if (['false', 'no', 'n', '0', 'off', 'disabled', ''].includes(str)) {
      return false;
    }
    
    // Default to false for ambiguous values
    return false;
  }
  
  /**
   * Parse a value to number (handles currency symbols, commas, etc.)
   */
  export function normalizeNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return value;
    
    // Remove currency symbols, commas, spaces
    const cleaned = String(value)
      .replace(/[£$€,\s]/g, '')
      .trim();
    
    if (!cleaned) return null;
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  
  /**
   * Parse a value to integer
   */
  export function normalizeInteger(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return Math.floor(value);
    
    const cleaned = String(value).replace(/[,\s]/g, '').trim();
    if (!cleaned) return null;
    
    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? null : parsed;
  }
  
  /**
   * Normalize string (trim, handle nulls)
   */
  export function normalizeString(value: any): string | null {
    if (value === null || value === undefined) return null;
    
    const str = String(value).trim();
    return str === '' ? null : str;
  }