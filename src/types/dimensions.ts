/**
 * src/types/dimensions.ts
 * Dimensional data types for multi-vendor analytics
 *
 * These enums and interfaces represent different ways to slice vendor finance data
 * across multiple customers in the platform. Dimensions enable powerful cohort analysis,
 * comparative analytics, and performance tracking across channels, segments, and geographies.
 *
 * ARCHITECTURAL PRINCIPLE:
 * Each dimension is a separate axis of analysis - they can be combined in any way to
 * create custom reports. For example: "Web channel approvals for SME-Medium customers
 * in GB" is a valid dimensional slice.
 */

/**
 * Point-of-sale channel where transaction occurred
 * Used for channel-specific performance analysis per vendor
 *
 * BUSINESS MEANING:
 * Different channels have different finance profiles. Web orders tend to be higher
 * attachment rate but lower AOV. In-store has lower attachment but higher approval.
 * Telesales has highest AOV but low volume.
 */
export enum SalesChannel {
  WEB = 'web',                    // Online shopping, e-commerce, web store
  IN_STORE = 'in-store',          // Physical store/showroom, point-of-sale terminal
  TELESALES = 'telesales',        // Outbound phone sales, sales team calls
  PHONE = 'phone',                // Inbound customer calls, support calls
  MARKETPLACE = 'marketplace',    // Amazon, eBay, 3rd party platforms, resellers
}

/**
 * Customer business classification
 * Determines risk profile, finance eligibility, and future credit limits
 *
 * BUSINESS MEANING:
 * Larger organizations have different finance behavior: enterprises have longer
 * approval times but higher approval rates; startups have higher decline rates but
 * higher attachment. SME segmentation helps identify optimal finance terms per segment.
 */
export enum CustomerSegment {
  SME_SMALL = 'sme-small',        // Micro: 1-10 employees, typically £0-5k orders
  SME_MEDIUM = 'sme-medium',      // Small-medium: 10-50 employees, £5k-20k orders
  ENTERPRISE = 'enterprise',      // Large: 50+ employees, £20k+ orders
  STARTUP = 'startup',            // Early-stage: <3 years old, typically <50 employees
}

/**
 * Deal value bands for cohort analysis
 * Helps identify financing behavior and approval patterns by deal size
 *
 * COMPUTED FIELD: Automatically calculated from order_value during normalization.
 * DO NOT MAP from CSV - this is derived, not source data.
 *
 * BUSINESS MEANING:
 * Deal size strongly correlates with finance behavior: under £1k has high attachment
 * but low value; over £10k is high value but low attachment. These bands are used
 * in finance reserve calculations and risk modeling.
 */
export enum DealSizeBand {
  UNDER_1K = 'under-1k',          // < £1,000 - Small orders, high attachment
  FROM_1K_TO_5K = '1k-5k',        // £1,000 - £4,999 - Growing deals
  FROM_5K_TO_10K = '5k-10k',      // £5,000 - £9,999 - Mid-market
  OVER_10K = 'over-10k',          // £10,000+ - Enterprise/high-risk
}

/**
 * Geographic data for location-based analysis
 * Enables regional performance comparisons within vendor data
 *
 * BUSINESS MEANING:
 * Geography drives regulatory, currency, and finance provider choices.
 * Regional performance metrics help identify expansion opportunities.
 */
export interface GeographyData {
  country: string;                // ISO 3166-1 alpha-2 code (e.g., 'GB', 'US', 'DE')
  region?: string;                // State/Region name (e.g., 'England', 'California', 'Bavaria')
  postal_code?: string;           // Postcode/ZIP (e.g., 'SW1A 1AA', '10001')
}

/**
 * Currency denomination of transaction
 * Important for multi-currency vendors and multi-country operations
 *
 * BUSINESS MEANING:
 * Currency affects finance provider selection (some providers don't support all currencies).
 * Enables reporting in local vs. functional currency. Critical for forecasting and reserves.
 */
export enum Currency {
  GBP = 'GBP',  // British Pounds (£)
  EUR = 'EUR',  // Euros (€)
  USD = 'USD',  // US Dollars ($)
  AUD = 'AUD',  // Australian Dollars
  CAD = 'CAD',  // Canadian Dollars
  JPY = 'JPY',  // Japanese Yen (¥)
}

/**
 * Vendor identifier constraints and interface
 * Used to validate and type vendor_id format across the system
 */
export interface VendorIdentifier {
  vendor_id: string;              // Lowercase alphanumeric with hyphens (e.g., 'acme-tech')
}

/**
 * Calculate deal size band from order value
 *
 * IMPORTANT: This is a COMPUTED FIELD
 * - Call this during normalization to auto-assign band from order_value
 * - Never map from CSV - order_value is the source of truth
 * - Handles null/undefined/zero values gracefully
 *
 * @param orderValue - Numeric order value in GBP/currency
 * @returns DealSizeBand enum value, or null if value is invalid/missing
 */
export function calculateDealSizeBand(orderValue?: number | null): DealSizeBand | null {
  if (!orderValue || orderValue <= 0) {
    return null;
  }

  if (orderValue < 1000) return DealSizeBand.UNDER_1K;
  if (orderValue < 5000) return DealSizeBand.FROM_1K_TO_5K;
  if (orderValue < 10000) return DealSizeBand.FROM_5K_TO_10K;
  return DealSizeBand.OVER_10K;
}

/**
 * ============================================================================
 * VALIDATION HELPERS - Type Guards & Predicates
 * ============================================================================
 * These functions check if a value is valid before using it as an enum.
 * Use these in normalizers and field mappers to prevent invalid data.
 */

/**
 * Type guard: Check if value is a valid SalesChannel
 * Useful in normalizers when converting CSV string to enum
 */
export function isValidSalesChannel(value: any): value is SalesChannel {
  return Object.values(SalesChannel).includes(value as SalesChannel);
}

/**
 * Type guard: Check if value is a valid CustomerSegment
 */
export function isValidCustomerSegment(value: any): value is CustomerSegment {
  return Object.values(CustomerSegment).includes(value as CustomerSegment);
}

/**
 * Type guard: Check if value is a valid DealSizeBand
 */
export function isValidDealSizeBand(value: any): value is DealSizeBand {
  return Object.values(DealSizeBand).includes(value as DealSizeBand);
}

/**
 * Type guard: Check if value is a valid Currency
 */
export function isValidCurrency(value: any): value is Currency {
  return Object.values(Currency).includes(value as Currency);
}

/**
 * Validate country code (ISO 3166-1 alpha-2)
 *
 * SUPPORTED COUNTRIES:
 * Extensive list of common markets where vendors operate.
 * Can be extended for additional countries.
 *
 * @param code - Two-letter country code (e.g., 'GB', 'US')
 * @returns true if valid ISO country code, false otherwise
 */
export function isValidCountryCode(code: string): boolean {
  if (!code || code.length !== 2) return false;

  // Comprehensive list of ISO 3166-1 alpha-2 codes for common markets
  const validCodes = new Set([
    // Europe
    'GB', 'US', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH',
    'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'IE', 'PT', 'GR', 'HU',
    'RO', 'BG', 'HR', 'SI', 'SK', 'LT', 'LV', 'EE',
    // North America
    'CA', 'MX',
    // Asia-Pacific
    'AU', 'NZ', 'SG', 'HK', 'JP', 'KR', 'IN', 'TH', 'MY', 'ID',
    'PH', 'VN', 'TW', 'AE', 'SA', 'IL',
    // Latin America
    'BR', 'AR', 'CL', 'CO', 'PE',
    // Africa
    'ZA', 'EG', 'NG',
  ]);

  return validCodes.has(code.toUpperCase());
}

/**
 * Validate vendor_id format
 *
 * REQUIREMENTS:
 * - Must be lowercase letters, numbers, hyphens only
 * - Cannot start or end with hyphen
 * - Length: 1-100 characters
 * - Examples: "acme-tech", "techcorp-uk", "vendor1", "my-saas-co"
 *
 * @param vendor_id - Vendor identifier string
 * @returns true if format is valid, false otherwise
 */
export function isValidVendorId(vendor_id: string): boolean {
  if (!vendor_id || vendor_id.length === 0) return false;
  if (vendor_id.length > 100) return false;
  if (vendor_id.startsWith('-') || vendor_id.endsWith('-')) return false;

  // Allow lowercase letters, numbers, hyphens
  return /^[a-z0-9-]+$/.test(vendor_id);
}

/**
 * ============================================================================
 * UI DISPLAY LABELS
 * ============================================================================
 * Human-readable labels for enums, used in dashboards, reports, and exports.
 * These are friendly names, not source data.
 */

/**
 * Display labels for SalesChannel enum
 * Used in reports, dropdowns, filters, charts
 */
export const SalesChannelLabels: Record<SalesChannel, string> = {
  [SalesChannel.WEB]: 'Website / E-Commerce',
  [SalesChannel.IN_STORE]: 'In-Store / Retail',
  [SalesChannel.TELESALES]: 'Telesales / Outbound',
  [SalesChannel.PHONE]: 'Phone / Inbound',
  [SalesChannel.MARKETPLACE]: 'Marketplace / Reseller',
};

/**
 * Display labels for CustomerSegment enum
 * Shows employee count ranges to help understand segment
 */
export const CustomerSegmentLabels: Record<CustomerSegment, string> = {
  [CustomerSegment.SME_SMALL]: 'Small SME (1-10 employees)',
  [CustomerSegment.SME_MEDIUM]: 'Medium SME (10-50 employees)',
  [CustomerSegment.ENTERPRISE]: 'Enterprise (50+ employees)',
  [CustomerSegment.STARTUP]: 'Startup (< 3 years old)',
};

/**
 * Display labels for DealSizeBand enum
 * Shows value ranges in GBP
 */
export const DealSizeBandLabels: Record<DealSizeBand, string> = {
  [DealSizeBand.UNDER_1K]: 'Under £1,000',
  [DealSizeBand.FROM_1K_TO_5K]: '£1,000 - £5,000',
  [DealSizeBand.FROM_5K_TO_10K]: '£5,000 - £10,000',
  [DealSizeBand.OVER_10K]: 'Over £10,000',
};

/**
 * Display labels for Currency enum
 * Full currency names for international display
 */
export const CurrencyLabels: Record<Currency, string> = {
  [Currency.GBP]: 'British Pounds (£)',
  [Currency.EUR]: 'Euros (€)',
  [Currency.USD]: 'US Dollars ($)',
  [Currency.AUD]: 'Australian Dollars (A$)',
  [Currency.CAD]: 'Canadian Dollars (C$)',
  [Currency.JPY]: 'Japanese Yen (¥)',
};

/**
 * ============================================================================
 * UTILITY FUNCTIONS FOR DIMENSIONAL ANALYSIS
 * ============================================================================
 */

/**
 * Get all valid values for a dimension
 * Useful for building dropdowns, filters, and UI components
 */
export function getAllSalesChannels(): SalesChannel[] {
  return Object.values(SalesChannel);
}

export function getAllCustomerSegments(): CustomerSegment[] {
  return Object.values(CustomerSegment);
}

export function getAllDealSizeBands(): DealSizeBand[] {
  return [
    DealSizeBand.UNDER_1K,
    DealSizeBand.FROM_1K_TO_5K,
    DealSizeBand.FROM_5K_TO_10K,
    DealSizeBand.OVER_10K,
  ];
}

export function getAllCurrencies(): Currency[] {
  return Object.values(Currency);
}
