// src/normalizers/date-normalizer.ts

import { parse, isValid } from 'date-fns';

/**
 * Supported date formats (in priority order)
 */
const DATE_FORMATS = [
  'yyyy-MM-dd',           // ISO: 2024-03-15
  'dd/MM/yyyy',           // UK: 15/03/2024
  'MM/dd/yyyy',           // US: 03/15/2024
  'dd-MM-yyyy',           // Alt: 15-03-2024
  'yyyy/MM/dd',           // Alt ISO: 2024/03/15
  'dd.MM.yyyy',           // European: 15.03.2024
  "yyyy-MM-dd'T'HH:mm:ss", // ISO with time
  "dd/MM/yyyy HH:mm:ss",  // UK with time
];

export function normalizeDate(value: any): Date | null {
  if (!value) return null;
  
  // Already a Date object
  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }
  
  // Convert to string and clean
  const str = String(value).trim();
  if (!str) return null;
  
  // Try parsing with each format
  for (const format of DATE_FORMATS) {
    try {
      const parsed = parse(str, format, new Date());
      if (isValid(parsed)) {
        return parsed;
      }
    } catch (e) {
      // Continue to next format
    }
  }
  
  // Try native Date parsing as fallback
  try {
    const parsed = new Date(str);
    if (isValid(parsed)) {
      return parsed;
    }
  } catch (e) {
    // Fall through
  }
  
  return null;
}