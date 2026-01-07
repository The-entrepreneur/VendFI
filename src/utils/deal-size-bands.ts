/**
 * src/utils/deal-size-bands.ts
 * Deal size band calculation and utilities
 *
 * This module provides helper functions for working with deal size bands.
 * It's used by normalizers to compute deal_size_band from order_value
 * and shared across all vendors for consistent analysis.
 *
 * IMPORTANT: deal_size_band is a COMPUTED field
 * - It is calculated from order_value during normalization
 * - Never map it from CSV
 * - Use calculateDealSizeBand() from dimensions.ts to compute it
 */

import {
  DealSizeBand,
  DealSizeBandLabels,
  calculateDealSizeBand,
} from "../types/dimensions";

/**
 * Get human-readable label for deal size band
 * Used in reports, UI, and exports
 *
 * @param band - DealSizeBand enum value, or null
 * @returns Localized label string (e.g., 'Under £1,000')
 */
export function getLabel(band: DealSizeBand | null): string {
  if (!band) return "Unknown";
  return DealSizeBandLabels[band];
}

/**
 * Get minimum value (inclusive) for a band
 * Useful for filtering, range queries, and UI display
 *
 * @param band - DealSizeBand enum value
 * @returns Minimum value in GBP for the band
 */
export function getBandMinValue(band: DealSizeBand): number {
  switch (band) {
    case DealSizeBand.UNDER_1K:
      return 0;
    case DealSizeBand.FROM_1K_TO_5K:
      return 1000;
    case DealSizeBand.FROM_5K_TO_10K:
      return 5000;
    case DealSizeBand.OVER_10K:
      return 10000;
    default:
      return 0;
  }
}

/**
 * Get maximum value (inclusive) for a band
 * Useful for range queries and UI display
 *
 * @param band - DealSizeBand enum value
 * @returns Maximum value in GBP for the band (Infinity for OVER_10K)
 */
export function getBandMaxValue(band: DealSizeBand): number {
  switch (band) {
    case DealSizeBand.UNDER_1K:
      return 999.99;
    case DealSizeBand.FROM_1K_TO_5K:
      return 4999.99;
    case DealSizeBand.FROM_5K_TO_10K:
      return 9999.99;
    case DealSizeBand.OVER_10K:
      return Infinity;
    default:
      return 0;
  }
}

/**
 * Get all bands in order (for dropdown/filter UI)
 * Bands are returned in ascending order by value
 *
 * @returns Array of DealSizeBand values in order
 */
export function getAllBands(): DealSizeBand[] {
  return [
    DealSizeBand.UNDER_1K,
    DealSizeBand.FROM_1K_TO_5K,
    DealSizeBand.FROM_5K_TO_10K,
    DealSizeBand.OVER_10K,
  ];
}

/**
 * Get band distribution for a set of values
 * Groups values into bands with counts
 *
 * EXAMPLE:
 * Input: [500, 2500, 7500, 15000, null]
 * Output: {
 *   'under-1k': 1,
 *   '1k-5k': 1,
 *   '5k-10k': 1,
 *   'over-10k': 1
 * }
 *
 * @param values - Array of order values (may include null/undefined)
 * @returns Object with band counts
 */
export function getDistribution(
  values: (number | null | undefined)[]
): Record<DealSizeBand, number> {
  const distribution: Record<DealSizeBand, number> = {
    [DealSizeBand.UNDER_1K]: 0,
    [DealSizeBand.FROM_1K_TO_5K]: 0,
    [DealSizeBand.FROM_5K_TO_10K]: 0,
    [DealSizeBand.OVER_10K]: 0,
  };

  for (const value of values) {
    const band = calculateDealSizeBand(value);
    if (band) {
      distribution[band]++;
    }
  }

  return distribution;
}

/**
 * Get color for visualization (charts, heatmaps, UI)
 * Color scheme from low-value (green) to high-value/risky (red)
 *
 * COLORS:
 * - Green: Small deals (< £1k) - high volume, low risk individually
 * - Blue: Growing deals (£1k-£5k) - healthy mix
 * - Orange: Mid-market (£5k-£10k) - balance of volume and value
 * - Red: Enterprise (£10k+) - high value, higher risk
 *
 * @param band - DealSizeBand enum value, or null
 * @returns Hex color code for visualization
 */
export function getBandColor(band: DealSizeBand | null): string {
  switch (band) {
    case DealSizeBand.UNDER_1K:
      return "#4CAF50"; // Green - small deals
    case DealSizeBand.FROM_1K_TO_5K:
      return "#2196F3"; // Blue - growing deals
    case DealSizeBand.FROM_5K_TO_10K:
      return "#FF9800"; // Orange - mid-market
    case DealSizeBand.OVER_10K:
      return "#F44336"; // Red - enterprise/risky
    default:
      return "#999999"; // Gray - unknown
  }
}

/**
 * Format order value with deal size band label
 * Creates human-readable output for reports
 *
 * EXAMPLE:
 * Input: 2500
 * Output: "£2,500.00 (£1,000 - £5,000)"
 *
 * @param orderValue - Numeric order value
 * @returns Formatted string with value and band label
 */
export function formatWithBand(orderValue?: number | null): string {
  if (!orderValue) return "No value";

  const band = calculateDealSizeBand(orderValue);
  const formatted = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(orderValue);

  const bandLabel = getLabel(band);
  return `${formatted} (${bandLabel})`;
}

/**
 * Check if a value falls within a band
 * Useful for filtering and validation
 *
 * @param value - Order value to check
 * @param band - Band to check against
 * @returns true if value is in the band, false otherwise
 */
export function isInBand(value: number | null | undefined, band: DealSizeBand): boolean {
  if (!value || value <= 0) return false;

  const calculatedBand = calculateDealSizeBand(value);
  return calculatedBand === band;
}

/**
 * Get percentage of values in a band
 * Used for calculating band distribution percentages
 *
 * @param values - Array of order values
 * @param band - Band to calculate percentage for
 * @returns Percentage (0-100) of values in the band
 */
export function getBandPercentage(
  values: (number | null | undefined)[],
  band: DealSizeBand
): number {
  const validValues = values.filter((v) => v && v > 0);
  if (validValues.length === 0) return 0;

  const inBand = validValues.filter((v) => isInBand(v, band)).length;
  return (inBand / validValues.length) * 100;
}

/**
 * Get summary statistics for values across all bands
 * Returns counts and percentages for each band
 *
 * EXAMPLE OUTPUT:
 * {
 *   'under-1k': { count: 50, percentage: 20, label: 'Under £1,000' },
 *   '1k-5k': { count: 80, percentage: 32, label: '£1,000 - £5,000' },
 *   ...
 * }
 *
 * @param values - Array of order values
 * @returns Object with statistics per band
 */
export function getBandStatistics(
  values: (number | null | undefined)[]
): Record<
  DealSizeBand,
  { count: number; percentage: number; label: string }
> {
  const distribution = getDistribution(values);
  const total = values.filter((v) => v && v > 0).length || 1;

  const stats: Record<
    DealSizeBand,
    { count: number; percentage: number; label: string }
  > = {} as any;

  for (const band of getAllBands()) {
    const count = distribution[band];
    stats[band] = {
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
      label: getLabel(band),
    };
  }

  return stats;
}

/**
 * Get the next band up (for progression analysis)
 * Useful for identifying upsell opportunities
 *
 * @param band - Current band
 * @returns Next band, or null if already at OVER_10K
 */
export function getNextBand(band: DealSizeBand): DealSizeBand | null {
  switch (band) {
    case DealSizeBand.UNDER_1K:
      return DealSizeBand.FROM_1K_TO_5K;
    case DealSizeBand.FROM_1K_TO_5K:
      return DealSizeBand.FROM_5K_TO_10K;
    case DealSizeBand.FROM_5K_TO_10K:
      return DealSizeBand.OVER_10K;
    case DealSizeBand.OVER_10K:
      return null;
    default:
      return null;
  }
}

/**
 * Get the previous band down (for segmentation analysis)
 * Useful for identifying downgrade risks
 *
 * @param band - Current band
 * @returns Previous band, or null if already at UNDER_1K
 */
export function getPreviousBand(band: DealSizeBand): DealSizeBand | null {
  switch (band) {
    case DealSizeBand.UNDER_1K:
      return null;
    case DealSizeBand.FROM_1K_TO_5K:
      return DealSizeBand.UNDER_1K;
    case DealSizeBand.FROM_5K_TO_10K:
      return DealSizeBand.FROM_1K_TO_5K;
    case DealSizeBand.OVER_10K:
      return DealSizeBand.FROM_5K_TO_10K;
    default:
      return null;
  }
}
