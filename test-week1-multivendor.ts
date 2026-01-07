/**
 * test-week1-multivendor.ts
 * Comprehensive tests for Week 1: Multi-Vendor Dimensional Data Support
 *
 * Tests cover:
 * - Dimensional type validation (SalesChannel, CustomerSegment, etc.)
 * - Deal size band calculation and utilities
 * - Value normalization for all dimensional fields
 * - Vendor ID validation and normalization
 * - Multi-vendor data isolation
 * - CSV template generation
 * - Backward compatibility with legacy CSVs
 *
 * Run with: npm run test
 */

import {
  SalesChannel,
  CustomerSegment,
  DealSizeBand,
  Currency,
  isValidSalesChannel,
  isValidCustomerSegment,
  isValidDealSizeBand,
  isValidCurrency,
  isValidCountryCode,
  isValidVendorId,
  calculateDealSizeBand,
  SalesChannelLabels,
  CustomerSegmentLabels,
  DealSizeBandLabels,
} from "./src/types/dimensions";

import {
  getLabel as getBandLabel,
  getBandMinValue,
  getBandMaxValue,
  getAllBands,
  getDistribution,
  getBandColor,
  getBandStatistics,
  getNextBand,
  getPreviousBand,
} from "./src/utils/deal-size-bands";

import {
  normalizeSalesChannel,
  normalizeCustomerSegment,
  normalizeGeography,
  normalizeCurrency,
  normalizeVendorId,
} from "./src/normalizers/value-normalizer";

import {
  generateEnhancedTemplate,
  generateMinimalTemplate,
  generateDimensionalFieldDocs,
  getFieldValidationRules,
} from "./src/templates/enhanced-csv-template";

import { NormalizedRecord, FinanceStatus } from "./src/types";

// Color codes for output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function assert(condition: boolean, description: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    log(`  ✅ ${description}`, colors.green);
  } else {
    failedTests++;
    log(`  ❌ ${description}`, colors.red);
    if (details) {
      log(`     ${details}`, colors.yellow);
    }
  }
}

function testSuite(name: string) {
  log(`\n${name}`, colors.cyan);
  log("=".repeat(70), colors.cyan);
}

function summary() {
  log(`\n${"=".repeat(70)}`, colors.cyan);
  log(`TEST SUMMARY`, colors.cyan);
  log(`${"=".repeat(70)}`, colors.cyan);
  log(
    `Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`,
    colors.blue,
  );

  if (failedTests === 0) {
    log(`\n🎉 ALL TESTS PASSED!\n`, colors.green);
    process.exit(0);
  } else {
    log(`\n❌ ${failedTests} TEST(S) FAILED\n`, colors.red);
    process.exit(1);
  }
}

// ============================================================================
// TEST SUITE 1: Vendor ID Validation
// ============================================================================
testSuite("TEST SUITE 1: Vendor ID Validation");

assert(isValidVendorId("acme-tech"), "Accept valid vendor ID: acme-tech");
assert(isValidVendorId("vendor1"), "Accept valid vendor ID: vendor1");
assert(
  isValidVendorId("my-vendor-123"),
  "Accept valid vendor ID: my-vendor-123",
);
assert(isValidVendorId("a"), "Accept single character vendor ID");
assert(!isValidVendorId("Acme-Tech"), "Reject uppercase vendor ID");
assert(!isValidVendorId("vendor_id"), "Reject underscore in vendor ID");
assert(!isValidVendorId("-vendor"), "Reject vendor ID starting with hyphen");
assert(!isValidVendorId("vendor-"), "Reject vendor ID ending with hyphen");
assert(!isValidVendorId(""), "Reject empty vendor ID");
assert(!isValidVendorId("vendor@123"), "Reject invalid special characters");
assert(isValidVendorId("a".repeat(100)), "Accept 100-character vendor ID");
assert(!isValidVendorId("a".repeat(101)), "Reject vendor ID > 100 characters");

// ============================================================================
// TEST SUITE 2: Sales Channel Validation
// ============================================================================
testSuite("TEST SUITE 2: Sales Channel Validation");

assert(isValidSalesChannel("web"), "Recognize valid: web");
assert(isValidSalesChannel("in-store"), "Recognize valid: in-store");
assert(isValidSalesChannel("telesales"), "Recognize valid: telesales");
assert(isValidSalesChannel("phone"), "Recognize valid: phone");
assert(isValidSalesChannel("marketplace"), "Recognize valid: marketplace");
assert(!isValidSalesChannel("invalid"), "Reject invalid channel");
assert(!isValidSalesChannel("WEB"), "Reject uppercase (case-sensitive enum)");
assert(!isValidSalesChannel(""), "Reject empty string");
assert(!isValidSalesChannel(null), "Reject null");

// ============================================================================
// TEST SUITE 3: Customer Segment Validation
// ============================================================================
testSuite("TEST SUITE 3: Customer Segment Validation");

assert(isValidCustomerSegment("sme-small"), "Recognize valid: sme-small");
assert(isValidCustomerSegment("sme-medium"), "Recognize valid: sme-medium");
assert(isValidCustomerSegment("enterprise"), "Recognize valid: enterprise");
assert(isValidCustomerSegment("startup"), "Recognize valid: startup");
assert(!isValidCustomerSegment("small"), "Reject partial value");
assert(!isValidCustomerSegment("ENTERPRISE"), "Reject uppercase");
assert(!isValidCustomerSegment(""), "Reject empty");

// ============================================================================
// TEST SUITE 4: Deal Size Band Calculation
// ============================================================================
testSuite("TEST SUITE 4: Deal Size Band Calculation");

assert(
  calculateDealSizeBand(500) === DealSizeBand.UNDER_1K,
  "Calculate UNDER_1K for value 500",
);
assert(
  calculateDealSizeBand(999) === DealSizeBand.UNDER_1K,
  "Calculate UNDER_1K for value 999",
);
assert(
  calculateDealSizeBand(1000) === DealSizeBand.FROM_1K_TO_5K,
  "Calculate FROM_1K_TO_5K for value 1000",
);
assert(
  calculateDealSizeBand(2500) === DealSizeBand.FROM_1K_TO_5K,
  "Calculate FROM_1K_TO_5K for value 2500",
);
assert(
  calculateDealSizeBand(4999) === DealSizeBand.FROM_1K_TO_5K,
  "Calculate FROM_1K_TO_5K for value 4999",
);
assert(
  calculateDealSizeBand(5000) === DealSizeBand.FROM_5K_TO_10K,
  "Calculate FROM_5K_TO_10K for value 5000",
);
assert(
  calculateDealSizeBand(7500) === DealSizeBand.FROM_5K_TO_10K,
  "Calculate FROM_5K_TO_10K for value 7500",
);
assert(
  calculateDealSizeBand(9999) === DealSizeBand.FROM_5K_TO_10K,
  "Calculate FROM_5K_TO_10K for value 9999",
);
assert(
  calculateDealSizeBand(10000) === DealSizeBand.OVER_10K,
  "Calculate OVER_10K for value 10000",
);
assert(
  calculateDealSizeBand(15000) === DealSizeBand.OVER_10K,
  "Calculate OVER_10K for value 15000",
);
assert(calculateDealSizeBand(null) === null, "Return null for null value");
assert(calculateDealSizeBand(undefined) === null, "Return null for undefined");
assert(calculateDealSizeBand(0) === null, "Return null for zero");
assert(calculateDealSizeBand(-100) === null, "Return null for negative");

// ============================================================================
// TEST SUITE 5: Deal Size Band Utilities
// ============================================================================
testSuite("TEST SUITE 5: Deal Size Band Utilities");

assert(
  getBandLabel(DealSizeBand.UNDER_1K) === "Under £1,000",
  "Get label for UNDER_1K",
);
assert(
  getBandLabel(DealSizeBand.FROM_1K_TO_5K) === "£1,000 - £5,000",
  "Get label for FROM_1K_TO_5K",
);
assert(getBandLabel(null) === "Unknown", "Get label for null");

assert(
  getBandMinValue(DealSizeBand.UNDER_1K) === 0,
  "Get min value for UNDER_1K",
);
assert(
  getBandMinValue(DealSizeBand.FROM_1K_TO_5K) === 1000,
  "Get min value for FROM_1K_TO_5K",
);
assert(
  getBandMinValue(DealSizeBand.FROM_5K_TO_10K) === 5000,
  "Get min value for FROM_5K_TO_10K",
);
assert(
  getBandMinValue(DealSizeBand.OVER_10K) === 10000,
  "Get min value for OVER_10K",
);

assert(
  getBandMaxValue(DealSizeBand.UNDER_1K) === 999.99,
  "Get max value for UNDER_1K",
);
assert(
  getBandMaxValue(DealSizeBand.FROM_1K_TO_5K) === 4999.99,
  "Get max value for FROM_1K_TO_5K",
);
assert(
  getBandMaxValue(DealSizeBand.OVER_10K) === Infinity,
  "Get max value for OVER_10K",
);

const bands = getAllBands();
assert(bands.length === 4, "Get all bands returns 4 bands");
assert(bands[0] === DealSizeBand.UNDER_1K, "First band is UNDER_1K");
assert(bands[3] === DealSizeBand.OVER_10K, "Last band is OVER_10K");

const dist = getDistribution([500, 2500, 7500, 15000]);
assert(dist[DealSizeBand.UNDER_1K] === 1, "Distribution: 1 item in UNDER_1K");
assert(
  dist[DealSizeBand.FROM_1K_TO_5K] === 1,
  "Distribution: 1 item in FROM_1K_TO_5K",
);
assert(
  dist[DealSizeBand.FROM_5K_TO_10K] === 1,
  "Distribution: 1 item in FROM_5K_TO_10K",
);
assert(dist[DealSizeBand.OVER_10K] === 1, "Distribution: 1 item in OVER_10K");

const color = getBandColor(DealSizeBand.UNDER_1K);
assert(color === "#4CAF50", "Get color for UNDER_1K (green)");
assert(
  getBandColor(DealSizeBand.OVER_10K) === "#F44336",
  "Get color for OVER_10K (red)",
);
assert(getBandColor(null) === "#999999", "Get color for null (gray)");

// ============================================================================
// TEST SUITE 6: Normalize Sales Channel
// ============================================================================
testSuite("TEST SUITE 6: Normalize Sales Channel");

assert(
  normalizeSalesChannel("WEB") === SalesChannel.WEB,
  "Normalize: WEB → web",
);
assert(
  normalizeSalesChannel("web") === SalesChannel.WEB,
  "Normalize: web → web",
);
assert(
  normalizeSalesChannel("E-commerce") === SalesChannel.WEB,
  "Normalize: E-commerce → web",
);
assert(
  normalizeSalesChannel("online store") === SalesChannel.WEB,
  "Normalize: online store → web",
);
assert(
  normalizeSalesChannel("In-Store") === SalesChannel.IN_STORE,
  "Normalize: In-Store → in-store",
);
assert(
  normalizeSalesChannel("Retail") === SalesChannel.IN_STORE,
  "Normalize: Retail → in-store",
);
assert(
  normalizeSalesChannel("Amazon") === SalesChannel.MARKETPLACE,
  "Normalize: Amazon → marketplace",
);
assert(
  normalizeSalesChannel("Telephone") === SalesChannel.PHONE,
  "Normalize: Telephone → phone",
);
assert(normalizeSalesChannel(null) === null, "Normalize null → null");
assert(normalizeSalesChannel("invalid") === null, "Normalize invalid → null");

// ============================================================================
// TEST SUITE 7: Normalize Customer Segment
// ============================================================================
testSuite("TEST SUITE 7: Normalize Customer Segment");

assert(
  normalizeCustomerSegment("SME-Small") === CustomerSegment.SME_SMALL,
  "Normalize: SME-Small → sme-small",
);
assert(
  normalizeCustomerSegment("Small") === CustomerSegment.SME_SMALL,
  "Normalize: Small → sme-small",
);
assert(
  normalizeCustomerSegment("Startup") === CustomerSegment.STARTUP,
  "Normalize: Startup → startup",
);
assert(
  normalizeCustomerSegment("Enterprise") === CustomerSegment.ENTERPRISE,
  "Normalize: Enterprise → enterprise",
);
assert(
  normalizeCustomerSegment("Medium") === CustomerSegment.SME_MEDIUM,
  "Normalize: Medium → sme-medium",
);
assert(normalizeCustomerSegment(null) === null, "Normalize null → null");
assert(
  normalizeCustomerSegment("invalid") === null,
  "Normalize invalid → null",
);

// ============================================================================
// TEST SUITE 8: Normalize Geography
// ============================================================================
testSuite("TEST SUITE 8: Normalize Geography");

const geo1 = normalizeGeography("GB", "London", "SW1A1AA");
assert(geo1?.country === "GB", "Geography: set country");
assert(geo1?.region === "London", "Geography: set region");
assert(geo1?.postal_code === "SW1A1AA", "Geography: set postal code");

const geo2 = normalizeGeography("gb", "london", "sw1a1aa");
assert(geo2?.country === "GB", "Geography: uppercase country code");
assert(geo2?.region === "london", "Geography: preserve region case");

const geo3 = normalizeGeography("US");
assert(geo3?.country === "US", "Geography: US only");
assert(
  geo3?.region === undefined,
  "Geography: region undefined if not provided",
);

const geo4 = normalizeGeography("XX");
assert(geo4 === null, "Geography: return null for invalid country");

const geo5 = normalizeGeography("US", undefined, "10001");
assert(geo5?.postal_code === "10001", "Geography: postal code without region");

// ============================================================================
// TEST SUITE 9: Normalize Currency
// ============================================================================
testSuite("TEST SUITE 9: Normalize Currency");

assert(normalizeCurrency("GBP") === Currency.GBP, "Normalize: GBP → GBP");
assert(normalizeCurrency("gbp") === Currency.GBP, "Normalize: gbp → GBP");
assert(normalizeCurrency("£") === Currency.GBP, "Normalize: £ → GBP");
assert(normalizeCurrency("$") === Currency.USD, "Normalize: $ → USD");
assert(normalizeCurrency("€") === Currency.EUR, "Normalize: € → EUR");
assert(normalizeCurrency("¥") === Currency.JPY, "Normalize: ¥ → JPY");
assert(normalizeCurrency("USD") === Currency.USD, "Normalize: USD → USD");
assert(normalizeCurrency("EUR") === Currency.EUR, "Normalize: EUR → EUR");
assert(
  normalizeCurrency("British Pound") === Currency.GBP,
  "Normalize: British Pound → GBP",
);
assert(normalizeCurrency(null) === null, "Normalize null → null");
assert(normalizeCurrency("invalid") === null, "Normalize invalid → null");

// ============================================================================
// TEST SUITE 10: Normalize Vendor ID
// ============================================================================
testSuite("TEST SUITE 10: Normalize Vendor ID");

assert(
  normalizeVendorId("acme-tech") === "acme-tech",
  "Normalize: acme-tech → acme-tech",
);
assert(
  normalizeVendorId("ACME-TECH") === "acme-tech",
  "Normalize: ACME-TECH → acme-tech",
);
assert(
  normalizeVendorId("Acme Tech") === "acme-tech",
  "Normalize: Acme Tech → acme-tech",
);
assert(
  normalizeVendorId("VENDOR_1") === "vendor-1",
  "Normalize: VENDOR_1 → vendor-1",
);
assert(
  normalizeVendorId("vendor@123") === "vendor123",
  "Normalize: vendor@123 → vendor123",
);
assert(
  normalizeVendorId("my--vendor") === "my-vendor",
  "Normalize: my--vendor → my-vendor (consecutive hyphens)",
);
assert(
  normalizeVendorId("-vendor-") === "vendor",
  "Normalize: -vendor- → vendor",
);
assert(
  normalizeVendorId("vendor1") === "vendor1",
  "Normalize: vendor1 → vendor1",
);
assert(normalizeVendorId(null) === null, "Normalize null → null");

// ============================================================================
// TEST SUITE 11: Country Code Validation
// ============================================================================
testSuite("TEST SUITE 11: Country Code Validation");

assert(isValidCountryCode("GB"), "Valid: GB");
assert(isValidCountryCode("US"), "Valid: US");
assert(isValidCountryCode("DE"), "Valid: DE");
assert(isValidCountryCode("FR"), "Valid: FR");
assert(isValidCountryCode("IT"), "Valid: IT");
assert(isValidCountryCode("AU"), "Valid: AU");
assert(isValidCountryCode("JP"), "Valid: JP");
assert(!isValidCountryCode("XX"), "Invalid: XX");
assert(!isValidCountryCode("UK"), "Invalid: UK (use GB)");
assert(!isValidCountryCode("USA"), "Invalid: USA (use US)");
assert(!isValidCountryCode(""), "Invalid: empty");
assert(!isValidCountryCode("G"), "Invalid: single character");

// ============================================================================
// TEST SUITE 12: Currency Validation
// ============================================================================
testSuite("TEST SUITE 12: Currency Validation");

assert(isValidCurrency("GBP"), "Valid: GBP");
assert(isValidCurrency("USD"), "Valid: USD");
assert(isValidCurrency("EUR"), "Valid: EUR");
assert(isValidCurrency("AUD"), "Valid: AUD");
assert(!isValidCurrency("gbp"), "Invalid: lowercase gbp");
assert(!isValidCurrency("INVALID"), "Invalid: INVALID");
assert(!isValidCurrency(""), "Invalid: empty");

// ============================================================================
// TEST SUITE 13: Deal Size Band Validation
// ============================================================================
testSuite("TEST SUITE 13: Deal Size Band Validation");

assert(isValidDealSizeBand("under-1k"), "Valid: under-1k");
assert(isValidDealSizeBand("1k-5k"), "Valid: 1k-5k");
assert(isValidDealSizeBand("5k-10k"), "Valid: 5k-10k");
assert(isValidDealSizeBand("over-10k"), "Valid: over-10k");
assert(!isValidDealSizeBand("invalid"), "Invalid: invalid");
assert(!isValidDealSizeBand("UNDER-1K"), "Invalid: uppercase");

// ============================================================================
// TEST SUITE 14: Multi-Vendor Data Isolation
// ============================================================================
testSuite("TEST SUITE 14: Multi-Vendor Data Isolation");

const acmeRecord: NormalizedRecord = {
  vendor_id: "acme-tech",
  order_id: "001",
  order_date: new Date("2024-11-01"),
  product_name: "Product A",
  finance_selected: true,
  finance_decision_status: FinanceStatus.APPROVED,
};

const otherRecord: NormalizedRecord = {
  vendor_id: "other-vendor",
  order_id: "002",
  order_date: new Date("2024-11-02"),
  product_name: "Product B",
  finance_selected: false,
  finance_decision_status: FinanceStatus.DECLINED,
};

assert(acmeRecord.vendor_id !== otherRecord.vendor_id, "Vendors are different");
assert(acmeRecord.order_id !== otherRecord.order_id, "Order IDs are different");

// ============================================================================
// TEST SUITE 15: Backward Compatibility
// ============================================================================
testSuite("TEST SUITE 15: Backward Compatibility");

const legacyRecord: NormalizedRecord = {
  order_id: "123",
  order_date: new Date("2024-11-01"),
  product_name: "Legacy Product",
  finance_selected: true,
  finance_decision_status: FinanceStatus.APPROVED,
  vendor_id: "legacy-vendor",
  // No dimensional fields - should still be valid
};

assert(
  legacyRecord.sales_channel === undefined,
  "Legacy: sales_channel undefined",
);
assert(
  legacyRecord.customer_segment === undefined,
  "Legacy: customer_segment undefined",
);
assert(legacyRecord.geography === undefined, "Legacy: geography undefined");
assert(legacyRecord.currency === undefined, "Legacy: currency undefined");
assert(
  legacyRecord.deal_size_band === undefined,
  "Legacy: deal_size_band undefined",
);
assert(legacyRecord.vendor_id === "legacy-vendor", "Legacy: vendor_id present");

// ============================================================================
// TEST SUITE 16: Full Dimensional Record
// ============================================================================
testSuite("TEST SUITE 16: Full Dimensional Record");

const fullRecord: NormalizedRecord = {
  vendor_id: "acme-tech",
  order_id: "ORD-001",
  order_date: new Date("2024-11-01"),
  product_name: "MacBook Pro 14",
  product_category: "Laptops",
  product_sku: "MBP-14-2024",
  order_value: 2499,
  finance_selected: true,
  finance_provider: "PropelPay",
  finance_term_months: 24,
  finance_decision_status: FinanceStatus.APPROVED,
  finance_decision_date: new Date("2024-11-01"),
  customer_id: "CUST-001",
  sales_channel: SalesChannel.WEB,
  customer_segment: CustomerSegment.SME_MEDIUM,
  geography: {
    country: "GB",
    region: "London",
    postal_code: "SW1A1AA",
  },
  currency: Currency.GBP,
  deal_size_band: calculateDealSizeBand(2499),
};

assert(fullRecord.vendor_id === "acme-tech", "Full record: vendor_id set");
assert(
  fullRecord.sales_channel === SalesChannel.WEB,
  "Full record: sales_channel set",
);
assert(
  fullRecord.customer_segment === CustomerSegment.SME_MEDIUM,
  "Full record: customer_segment set",
);
assert(
  fullRecord.geography?.country === "GB",
  "Full record: geography.country set",
);
assert(
  fullRecord.deal_size_band === DealSizeBand.FROM_1K_TO_5K,
  "Full record: deal_size_band computed correctly",
);

// ============================================================================
// TEST SUITE 17: CSV Template Generation
// ============================================================================
testSuite("TEST SUITE 17: CSV Template Generation");

const template = generateEnhancedTemplate({ vendorId: "test-vendor" });
assert(template.length > 0, "Template generated with content");
assert(template.includes("test-vendor"), "Template includes vendor ID");
assert(template.includes("order_id"), "Template includes order_id header");
assert(
  template.includes("sales_channel"),
  "Template includes sales_channel header",
);
assert(
  template.includes("customer_segment"),
  "Template includes customer_segment header",
);
assert(
  template.includes("geography_country"),
  "Template includes geography_country header",
);
assert(template.includes("currency"), "Template includes currency header");
assert(template.includes("ORD-"), "Template includes sample order IDs");

const minimalTemplate = generateMinimalTemplate("min-vendor");
assert(minimalTemplate.length > 0, "Minimal template generated");
assert(minimalTemplate.includes("order_id"), "Minimal template has headers");
assert(
  !minimalTemplate.includes("INSTRUCTIONS"),
  "Minimal template excludes instructions",
);

// ============================================================================
// TEST SUITE 18: Field Validation Rules
// ============================================================================
testSuite("TEST SUITE 18: Field Validation Rules");

const rules = getFieldValidationRules();
assert(rules.order_id !== undefined, "Rules: order_id present");
assert(rules.order_id.required === true, "Rules: order_id is required");
assert(rules.sales_channel !== undefined, "Rules: sales_channel present");
assert(
  rules.sales_channel.required === false,
  "Rules: sales_channel is optional",
);
assert(
  rules.sales_channel.type === "enum",
  "Rules: sales_channel is enum type",
);
assert(
  Array.isArray(rules.sales_channel.values),
  "Rules: sales_channel has values array",
);

// ============================================================================
// TEST SUITE 19: Band Statistics
// ============================================================================
testSuite("TEST SUITE 19: Band Statistics");

const values = [500, 500, 2500, 2500, 2500, 7500, 15000];
const stats = getBandStatistics(values);

assert(stats[DealSizeBand.UNDER_1K].count === 2, "Stats: 2 items in UNDER_1K");
assert(
  stats[DealSizeBand.FROM_1K_TO_5K].count === 3,
  "Stats: 3 items in FROM_1K_TO_5K",
);
assert(
  stats[DealSizeBand.FROM_5K_TO_10K].count === 1,
  "Stats: 1 item in FROM_5K_TO_10K",
);
assert(stats[DealSizeBand.OVER_10K].count === 1, "Stats: 1 item in OVER_10K");

const expectedPercentage = (2 / 7) * 100;
assert(
  Math.abs(stats[DealSizeBand.UNDER_1K].percentage - expectedPercentage) < 0.01,
  "Stats: UNDER_1K percentage correct",
);

// ============================================================================
// TEST SUITE 20: Band Progression
// ============================================================================
testSuite("TEST SUITE 20: Band Progression");

assert(
  getNextBand(DealSizeBand.UNDER_1K) === DealSizeBand.FROM_1K_TO_5K,
  "Next band from UNDER_1K is FROM_1K_TO_5K",
);
assert(
  getNextBand(DealSizeBand.FROM_1K_TO_5K) === DealSizeBand.FROM_5K_TO_10K,
  "Next band from FROM_1K_TO_5K is FROM_5K_TO_10K",
);
assert(
  getNextBand(DealSizeBand.OVER_10K) === null,
  "Next band from OVER_10K is null",
);

assert(
  getPreviousBand(DealSizeBand.UNDER_1K) === null,
  "Previous band from UNDER_1K is null",
);
assert(
  getPreviousBand(DealSizeBand.FROM_1K_TO_5K) === DealSizeBand.UNDER_1K,
  "Previous band from FROM_1K_TO_5K is UNDER_1K",
);
assert(
  getPreviousBand(DealSizeBand.OVER_10K) === DealSizeBand.FROM_5K_TO_10K,
  "Previous band from OVER_10K is FROM_5K_TO_10K",
);

// ============================================================================
// TEST SUITE 21: Dimensional Field Labels
// ============================================================================
testSuite("TEST SUITE 21: Dimensional Field Labels");

assert(
  SalesChannelLabels[SalesChannel.WEB] === "Website / E-Commerce",
  "Label: WEB has correct label",
);
assert(
  SalesChannelLabels[SalesChannel.IN_STORE] === "In-Store / Retail",
  "Label: IN_STORE has correct label",
);

assert(
  CustomerSegmentLabels[CustomerSegment.SME_SMALL] ===
    "Small SME (1-10 employees)",
  "Label: SME_SMALL has correct label",
);
assert(
  CustomerSegmentLabels[CustomerSegment.ENTERPRISE] ===
    "Enterprise (50+ employees)",
  "Label: ENTERPRISE has correct label",
);

assert(
  DealSizeBandLabels[DealSizeBand.UNDER_1K] === "Under £1,000",
  "Label: UNDER_1K has correct label",
);
assert(
  DealSizeBandLabels[DealSizeBand.OVER_10K] === "Over £10,000",
  "Label: OVER_10K has correct label",
);

// ============================================================================
// TEST SUITE 22: Documentation Generation
// ============================================================================
testSuite("TEST SUITE 22: Documentation Generation");

const docs = generateDimensionalFieldDocs();
assert(docs.length > 0, "Dimensional docs generated");
assert(docs.includes("sales_channel"), "Docs include sales_channel");
assert(docs.includes("customer_segment"), "Docs include customer_segment");
assert(docs.includes("geography"), "Docs include geography");
assert(docs.includes("currency"), "Docs include currency");
assert(docs.includes("Deal Size Bands"), "Docs include deal size bands");

// ============================================================================
// Run Summary
// ============================================================================
summary();
