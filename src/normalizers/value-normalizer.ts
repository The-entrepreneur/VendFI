// src/normalizers/value-normalizer.ts
/**
 * Value normalization utilities
 * Converts raw CSV values to properly typed canonical values
 *
 * Extended to include multi-vendor and dimensional field normalization
 */

import {
  SalesChannel,
  CustomerSegment,
  GeographyData,
  Currency,
  isValidSalesChannel,
  isValidCustomerSegment,
  isValidCurrency,
  isValidCountryCode,
  isValidVendorId,
  calculateDealSizeBand,
} from "../types/dimensions";

/**
 * Parse a value to boolean
 */
export function normalizeBoolean(value: any): boolean {
  if (typeof value === "boolean") return value;
  if (value === null || value === undefined) return false;

  const str = String(value).toLowerCase().trim();

  // True values
  if (["true", "yes", "y", "1", "on", "enabled"].includes(str)) {
    return true;
  }

  // False values
  if (["false", "no", "n", "0", "off", "disabled", ""].includes(str)) {
    return false;
  }

  // Default to false for ambiguous values
  return false;
}

/**
 * Parse a value to number (handles currency symbols, commas, etc.)
 */
export function normalizeNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;

  // Remove currency symbols, commas, spaces
  const cleaned = String(value)
    .replace(/[£$€¥,\s]/g, "")
    .trim();

  if (!cleaned) return null;

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse a value to integer
 */
export function normalizeInteger(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Math.floor(value);

  const cleaned = String(value).replace(/[,\s]/g, "").trim();
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
  return str === "" ? null : str;
}

/**
 * ============================================================================
 * DIMENSIONAL FIELD NORMALIZERS (NEW)
 * ============================================================================
 * These functions normalize dimensional field values from CSV
 * They handle variations and convert to canonical enum values
 */

/**
 * Normalize sales channel value from CSV
 * Handles variations like "WEB", "web", "E-commerce", "online store"
 *
 * VARIATIONS SUPPORTED:
 * - web: 'web', 'ecommerce', 'online', 'website', 'online_store', 'webstore'
 * - in-store: 'in-store', 'instore', 'retail', 'physical', 'showroom', 'pos'
 * - telesales: 'telesales', 'tele-sales', 'outbound', 'sales_team'
 * - phone: 'phone', 'telephone', 'inbound', 'call', 'support'
 * - marketplace: 'marketplace', 'amazon', 'ebay', 'third-party', 'reseller'
 *
 * @param value - Raw CSV value
 * @returns SalesChannel enum value, or null if invalid
 */
export function normalizeSalesChannel(value: any): SalesChannel | null {
  if (!value) return null;

  const normalized = value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[_\s-]/g, "_");

  // Map common variations to enum values
  const variations: Record<string, SalesChannel> = {
    web: SalesChannel.WEB,
    ecommerce: SalesChannel.WEB,
    e_commerce: SalesChannel.WEB,
    online: SalesChannel.WEB,
    website: SalesChannel.WEB,
    online_store: SalesChannel.WEB,
    webstore: SalesChannel.WEB,
    store: SalesChannel.WEB,

    in_store: SalesChannel.IN_STORE,
    instore: SalesChannel.IN_STORE,
    retail: SalesChannel.IN_STORE,
    physical: SalesChannel.IN_STORE,
    showroom: SalesChannel.IN_STORE,
    pos: SalesChannel.IN_STORE,
    point_of_sale: SalesChannel.IN_STORE,

    telesales: SalesChannel.TELESALES,
    tele_sales: SalesChannel.TELESALES,
    outbound: SalesChannel.TELESALES,
    sales_team: SalesChannel.TELESALES,
    sales_call: SalesChannel.TELESALES,

    phone: SalesChannel.PHONE,
    telephone: SalesChannel.PHONE,
    inbound: SalesChannel.PHONE,
    call: SalesChannel.PHONE,
    support: SalesChannel.PHONE,
    customer_call: SalesChannel.PHONE,

    marketplace: SalesChannel.MARKETPLACE,
    amazon: SalesChannel.MARKETPLACE,
    ebay: SalesChannel.MARKETPLACE,
    third_party: SalesChannel.MARKETPLACE,
    third_party_seller: SalesChannel.MARKETPLACE,
    reseller: SalesChannel.MARKETPLACE,
    distributor: SalesChannel.MARKETPLACE,
  };

  if (variations[normalized]) {
    return variations[normalized];
  }

  // Check if it's already valid enum value
  if (isValidSalesChannel(normalized)) {
    return normalized as SalesChannel;
  }

  return null;
}

/**
 * Normalize customer segment value from CSV
 * Handles variations like "SME-Small", "small sme", "Startup", "Enterprise"
 *
 * VARIATIONS SUPPORTED:
 * - sme-small: 'sme-small', 'small', 'micro', 'tiny', '1-10', 'sme_small'
 * - sme-medium: 'sme-medium', 'medium', 'mid', 'sme_medium', '10-50'
 * - enterprise: 'enterprise', 'large', 'corporate', 'big', '50+'
 * - startup: 'startup', 'early-stage', 'early_stage', 'new_company', '<3yr'
 *
 * @param value - Raw CSV value
 * @returns CustomerSegment enum value, or null if invalid
 */
export function normalizeCustomerSegment(value: any): CustomerSegment | null {
  if (!value) return null;

  const normalized = value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[_\s-]/g, "_");

  const variations: Record<string, CustomerSegment> = {
    sme_small: CustomerSegment.SME_SMALL,
    small: CustomerSegment.SME_SMALL,
    micro: CustomerSegment.SME_SMALL,
    tiny: CustomerSegment.SME_SMALL,
    "1-10": CustomerSegment.SME_SMALL,
    "1_10": CustomerSegment.SME_SMALL,
    startup_small: CustomerSegment.SME_SMALL,

    sme_medium: CustomerSegment.SME_MEDIUM,
    medium: CustomerSegment.SME_MEDIUM,
    mid: CustomerSegment.SME_MEDIUM,
    "10-50": CustomerSegment.SME_MEDIUM,
    "10_50": CustomerSegment.SME_MEDIUM,
    sme: CustomerSegment.SME_MEDIUM,

    enterprise: CustomerSegment.ENTERPRISE,
    large: CustomerSegment.ENTERPRISE,
    corporate: CustomerSegment.ENTERPRISE,
    big: CustomerSegment.ENTERPRISE,
    "50+": CustomerSegment.ENTERPRISE,
    "50_plus": CustomerSegment.ENTERPRISE,
    organization: CustomerSegment.ENTERPRISE,

    startup: CustomerSegment.STARTUP,
    early_stage: CustomerSegment.STARTUP,
    early_stage_company: CustomerSegment.STARTUP,
    new_company: CustomerSegment.STARTUP,
    "< 3yr": CustomerSegment.STARTUP,
    "< 3 years": CustomerSegment.STARTUP,
  };

  if (variations[normalized]) {
    return variations[normalized];
  }

  if (isValidCustomerSegment(normalized)) {
    return normalized as CustomerSegment;
  }

  return null;
}

/**
 * Normalize geography data from CSV columns
 * Validates country code (ISO 3166-1 alpha-2)
 * Optional region and postal code
 *
 * @param countryValue - Country code (e.g., 'GB', 'US')
 * @param regionValue - Optional region/state name
 * @param postalCodeValue - Optional postcode/ZIP
 * @returns GeographyData object, or null if country code is invalid
 */
export function normalizeGeography(
  countryValue?: any,
  regionValue?: any,
  postalCodeValue?: any,
): GeographyData | null {
  const country = countryValue?.toString().trim().toUpperCase();

  if (!country || !isValidCountryCode(country)) {
    return null;
  }

  return {
    country,
    region: regionValue ? regionValue.toString().trim() : undefined,
    postal_code: postalCodeValue
      ? postalCodeValue.toString().trim()
      : undefined,
  };
}

/**
 * Normalize currency code (ISO 4217)
 * Handles currency codes, symbols, and variations
 *
 * VARIATIONS SUPPORTED:
 * - Symbols: £ → GBP, $ → USD, € → EUR, ¥ → JPY
 * - Codes: GBP, gbp, Gbp, STERLING, POUND
 * - Names: British Pounds, US Dollars, Euros, etc.
 *
 * @param value - Raw currency value (code, symbol, or name)
 * @returns Currency enum value, or null if invalid
 */
export function normalizeCurrency(value: any): Currency | null {
  if (!value) return null;

  const normalized = value.toString().toUpperCase().trim();

  // Map symbols to currency codes
  const symbolMap: Record<string, Currency> = {
    "£": Currency.GBP,
    $: Currency.USD,
    "€": Currency.EUR,
    "¥": Currency.JPY,
    A$: Currency.AUD,
    C$: Currency.CAD,
  };

  if (symbolMap[normalized]) {
    return symbolMap[normalized];
  }

  // ISO 4217 codes (3 letters)
  if (isValidCurrency(normalized)) {
    return normalized as Currency;
  }

  // Currency name variations
  const nameMap: Record<string, Currency> = {
    POUND: Currency.GBP,
    STERLING: Currency.GBP,
    BRITISH_POUND: Currency.GBP,
    BRITISH_POUNDS: Currency.GBP,
    DOLLAR: Currency.USD,
    DOLLARS: Currency.USD,
    US_DOLLAR: Currency.USD,
    US_DOLLARS: Currency.USD,
    AMERICAN_DOLLAR: Currency.USD,
    EURO: Currency.EUR,
    EUROS: Currency.EUR,
    YEN: Currency.JPY,
    JAPANESE_YEN: Currency.JPY,
    AUSTRALIAN_DOLLAR: Currency.AUD,
    AUSTRALIAN_DOLLARS: Currency.AUD,
    CANADIAN_DOLLAR: Currency.CAD,
    CANADIAN_DOLLARS: Currency.CAD,
  };

  if (nameMap[normalized]) {
    return nameMap[normalized];
  }

  return null;
}

/**
 * Normalize vendor_id from CSV or CLI input
 * Converts to lowercase and removes invalid characters
 *
 * REQUIREMENTS:
 * - Final result: lowercase, alphanumeric, hyphens only
 * - Examples: 'acme-tech', 'vendor1', 'my-company-name'
 *
 * @param value - Raw vendor ID value
 * @returns Normalized vendor ID, or null if invalid after normalization
 */
export function normalizeVendorId(value: any): string | null {
  if (!value) return null;

  const normalized = value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Convert spaces to hyphens
    .replace(/[^a-z0-9-]/g, "") // Remove other invalid chars
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .replace(/-+/g, "-"); // Remove consecutive hyphens

  if (isValidVendorId(normalized)) {
    return normalized;
  }

  return null;
}

/**
 * ============================================================================
 * VALIDATION HELPERS FOR DIMENSIONAL FIELDS
 * ============================================================================
 */

/**
 * Validate dimensional field values during CSV processing
 * Used by field mappers to check for consistency
 *
 * @param mapping - Field mapping configuration
 * @param sampleRow - Sample CSV row to validate
 * @returns Array of error messages (empty if valid)
 */
export function validateDimensionalFields(
  mapping: Partial<Record<string, string>>,
  sampleRow: Record<string, any>,
): string[] {
  const errors: string[] = [];

  // Check sales_channel if mapped
  const salesChannelCol = Object.entries(mapping).find(
    ([_key, val]) => val === "sales_channel",
  )?.[1];
  if (salesChannelCol && sampleRow[salesChannelCol]) {
    const channelValue = sampleRow[salesChannelCol];
    const normalized = normalizeSalesChannel(channelValue);
    if (channelValue && !normalized) {
      errors.push(
        `Invalid sales_channel: "${channelValue}". Valid values: web, in-store, telesales, phone, marketplace`,
      );
    }
  }

  // Check customer_segment if mapped
  const segmentCol = Object.entries(mapping).find(
    ([_key, val]) => val === "customer_segment",
  )?.[1];
  if (segmentCol && sampleRow[segmentCol]) {
    const segmentValue = sampleRow[segmentCol];
    const normalized = normalizeCustomerSegment(segmentValue);
    if (segmentValue && !normalized) {
      errors.push(
        `Invalid customer_segment: "${segmentValue}". Valid values: sme-small, sme-medium, enterprise, startup`,
      );
    }
  }

  // Check geography_country if mapped
  const countryCol = Object.entries(mapping).find(
    ([_key, val]) => val === "geography_country",
  )?.[1];
  if (countryCol && sampleRow[countryCol]) {
    const countryValue = sampleRow[countryCol];
    if (!isValidCountryCode(countryValue.toString())) {
      errors.push(
        `Invalid geography_country: "${countryValue}". Must be ISO 3166-1 alpha-2 code like GB, US, DE`,
      );
    }
  }

  // Check currency if mapped
  const currencyCol = Object.entries(mapping).find(
    ([_key, val]) => val === "currency",
  )?.[1];
  if (currencyCol && sampleRow[currencyCol]) {
    const currencyValue = sampleRow[currencyCol];
    const normalized = normalizeCurrency(currencyValue);
    if (currencyValue && !normalized) {
      errors.push(
        `Invalid currency: "${currencyValue}". Valid values: GBP, EUR, USD, AUD, CAD, JPY`,
      );
    }
  }

  // Check vendor_id if mapped
  const vendorCol = Object.entries(mapping).find(
    ([_key, val]) => val === "vendor_id",
  )?.[1];
  if (vendorCol && sampleRow[vendorCol]) {
    const vendorValue = sampleRow[vendorCol];
    const normalized = normalizeVendorId(vendorValue);
    if (vendorValue && !normalized) {
      errors.push(
        `Invalid vendor_id: "${vendorValue}". Must be lowercase alphanumeric with hyphens only`,
      );
    }
  }

  return errors;
}

/**
 * Check if a value looks like it might be a sales channel
 * Used by field mapper inference
 */
export function looksLikeSalesChannel(value: any): boolean {
  if (!value) return false;
  return normalizeSalesChannel(value) !== null;
}

/**
 * Check if a value looks like it might be a customer segment
 * Used by field mapper inference
 */
export function looksLikeCustomerSegment(value: any): boolean {
  if (!value) return false;
  return normalizeCustomerSegment(value) !== null;
}

/**
 * Check if a value looks like a vendor ID
 * Used by field mapper inference
 */
export function looksLikeVendorId(value: any): boolean {
  if (!value) return false;
  return normalizeVendorId(value) !== null;
}
