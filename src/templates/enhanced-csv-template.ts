/**
 * src/templates/enhanced-csv-template.ts
 * Multi-vendor CSV template generator
 *
 * Creates sample CSV headers, instructions, and templates for vendor data
 * Supports both old (backward-compatible) and new (dimensional) formats
 */

import {
  CanonicalField,
  SalesChannelLabels,
  CustomerSegmentLabels,
} from "../types";

export interface TemplateOptions {
  vendorId?: string;
  includeComments?: boolean;
  includeSampleRows?: boolean;
  maxSampleRows?: number;
  includeAllFields?: boolean; // Include optional fields
}

/**
 * Generate enhanced multi-vendor CSV template
 * Includes headers, instructions, and optional sample rows
 *
 * @param options - Template generation options
 * @returns CSV string with template
 */
export function generateEnhancedTemplate(options: TemplateOptions = {}): string {
  const {
    vendorId = "your-vendor-id",
    includeComments = true,
    includeSampleRows = true,
    maxSampleRows = 3,
    includeAllFields = true,
  } = options;

  let csv = "";

  // Header with instructions
  if (includeComments) {
    csv += `# VendFI Multi-Vendor Enhanced CSV Template\n`;
    csv += `# Vendor ID: ${vendorId}\n`;
    csv += `# Generated: ${new Date().toISOString()}\n`;
    csv += `#\n`;
    csv += `# INSTRUCTIONS:\n`;
    csv += `# 1. Fill in each column with your data\n`;
    csv += `# 2. Column names must match exactly (case-insensitive)\n`;
    csv += `# 3. Fields marked [REQUIRED] must be present in all rows\n`;
    csv += `# 4. Fields marked [OPTIONAL] can be left empty if not available\n`;
    csv += `# 5. Dimensional fields (NEW) enable channel/segment/geography analysis\n`;
    csv += `# 6. Blank rows and comments (starting with #) are ignored\n\n`;
  }

  // Column headers
  const headers = [
    // Required fields
    CanonicalField.ORDER_ID,
    CanonicalField.ORDER_DATE,
    CanonicalField.PRODUCT_NAME,
    CanonicalField.FINANCE_SELECTED,
    CanonicalField.FINANCE_DECISION_STATUS,

    // Recommended optional fields
    CanonicalField.PRODUCT_CATEGORY,
    CanonicalField.ORDER_VALUE,
    CanonicalField.CUSTOMER_ID,

    // Finance fields (optional)
    CanonicalField.PRODUCT_SKU,
    CanonicalField.FINANCE_PROVIDER,
    CanonicalField.FINANCE_TERM_MONTHS,
    CanonicalField.FINANCE_DECISION_DATE,

    // Dimensional fields (optional but recommended)
    CanonicalField.SALES_CHANNEL,
    CanonicalField.CUSTOMER_SEGMENT,
    CanonicalField.GEOGRAPHY_COUNTRY,
    CanonicalField.GEOGRAPHY_REGION,
    CanonicalField.CURRENCY,
  ];

  // Filter out optional fields if not requested
  const fieldsToUse = includeAllFields
    ? headers
    : [
        CanonicalField.ORDER_ID,
        CanonicalField.ORDER_DATE,
        CanonicalField.PRODUCT_NAME,
        CanonicalField.FINANCE_SELECTED,
        CanonicalField.FINANCE_DECISION_STATUS,
        CanonicalField.ORDER_VALUE,
        CanonicalField.SALES_CHANNEL,
        CanonicalField.CUSTOMER_SEGMENT,
        CanonicalField.GEOGRAPHY_COUNTRY,
        CanonicalField.CURRENCY,
      ];

  csv += fieldsToUse.map((h) => `"${h}"`).join(",") + "\n";

  // Add field descriptions as comment
  if (includeComments) {
    csv += `#\n`;
    csv += `# FIELD DESCRIPTIONS:\n`;
    csv += `#\n`;
    csv += `# REQUIRED CORE FIELDS:\n`;
    csv += `# order_id              - Unique transaction identifier (e.g., 'ORD-2024-001')\n`;
    csv += `# order_date            - Transaction date in YYYY-MM-DD format\n`;
    csv += `# product_name          - Name of product purchased (e.g., 'MacBook Pro 14"')\n`;
    csv += `# finance_selected      - true/false: Customer selected finance option?\n`;
    csv += `# finance_decision_status - Outcome: approved, declined, pending, cancelled, other\n`;
    csv += `#\n`;
    csv += `# RECOMMENDED OPTIONAL FIELDS:\n`;
    csv += `# product_category      - Product type/category for analysis\n`;
    csv += `# order_value           - Order value in GBP (numeric, e.g., 2499.00)\n`;
    csv += `# customer_id           - Your internal customer identifier\n`;
    csv += `#\n`;
    csv += `# FINANCE OPTIONAL FIELDS:\n`;
    csv += `# product_sku           - Product SKU/code\n`;
    csv += `# finance_provider      - Finance provider name (PropelPay, iWoca, etc.)\n`;
    csv += `# finance_term_months   - Loan duration in months (e.g., 24)\n`;
    csv += `# finance_decision_date - Decision date in YYYY-MM-DD format\n`;
    csv += `#\n`;
    csv += `# DIMENSIONAL FIELDS (NEW - Optional but Recommended):\n`;
    csv += `# These enable powerful cohort analysis and dimensional reporting\n`;
    csv += `#\n`;
    csv += `# sales_channel         - How purchased: web, in-store, telesales, phone, marketplace\n`;
    csv += `# customer_segment      - Business type: sme-small, sme-medium, enterprise, startup\n`;
    csv += `# geography_country     - ISO country code (GB, US, DE, FR, etc.) - 2 letters uppercase\n`;
    csv += `# geography_region      - Region/state name (England, Scotland, California, etc.)\n`;
    csv += `# currency              - Currency code: GBP, USD, EUR, AUD, CAD, JPY\n`;
    csv += `#\n`;
    csv += `# NOTES:\n`;
    csv += `# - Empty cells are treated as missing data (null)\n`;
    csv += `# - Deal size bands (under-1k, 1k-5k, 5k-10k, over-10k) are computed automatically from order_value\n`;
    csv += `# - vendor_id will be set from CLI parameter (--vendor flag) or inferred from column\n`;
    csv += `#\n`;
  }

  // Sample rows
  if (includeSampleRows) {
    csv += generateSampleRows(vendorId, maxSampleRows, fieldsToUse);
  }

  return csv;
}

/**
 * Generate realistic sample data rows for multi-vendor template
 */
function generateSampleRows(
  vendorId: string,
  count: number = 3,
  fieldsToUse: CanonicalField[],
): string {
  const sampleData = [
    {
      order_id: "ORD-2024-001",
      order_date: "2024-11-01",
      product_name: "MacBook Pro 14 inch",
      product_category: "Laptops & Computing",
      order_value: "2499.00",
      finance_selected: "true",
      finance_decision_status: "approved",
      product_sku: "MBP-14-2024",
      finance_provider: "PropelPay",
      finance_term_months: "24",
      finance_decision_date: "2024-11-01",
      customer_id: "CUST-001",
      sales_channel: "web",
      customer_segment: "sme-medium",
      geography_country: "GB",
      geography_region: "London",
      currency: "GBP",
    },
    {
      order_id: "ORD-2024-002",
      order_date: "2024-11-02",
      product_name: "iPad Pro 12.9 inch",
      product_category: "Tablets & Mobile",
      order_value: "1299.00",
      finance_selected: "true",
      finance_decision_status: "declined",
      product_sku: "IPAD-12-2024",
      finance_provider: "iWoca",
      finance_term_months: "12",
      finance_decision_date: "2024-11-02",
      customer_id: "CUST-002",
      sales_channel: "in-store",
      customer_segment: "sme-small",
      geography_country: "GB",
      geography_region: "Manchester",
      currency: "GBP",
    },
    {
      order_id: "ORD-2024-003",
      order_date: "2024-11-03",
      product_name: "Mac Studio with M2 Max",
      product_category: "Desktops & Workstations",
      order_value: "3999.00",
      finance_selected: "false",
      finance_decision_status: "other",
      product_sku: "MACS-M2-2024",
      finance_provider: "",
      finance_term_months: "",
      finance_decision_date: "",
      customer_id: "CUST-003",
      sales_channel: "telesales",
      customer_segment: "enterprise",
      geography_country: "DE",
      geography_region: "Berlin",
      currency: "EUR",
    },
  ];

  let csv = "";
  for (let i = 0; i < Math.min(count, sampleData.length); i++) {
    const row = sampleData[i];
    const values = fieldsToUse.map((field) => {
      const value = (row as Record<string, string>)[field] || "";
      // Quote if contains comma or newline
      if (value.includes(",") || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return `"${value}"`;
    });
    csv += values.join(",") + "\n";
  }

  return csv;
}

/**
 * Generate minimal template (headers only, no comments)
 * Good for vendors who already know the format
 */
export function generateMinimalTemplate(vendorId: string = "vendor"): string {
  return generateEnhancedTemplate({
    vendorId,
    includeComments: false,
    includeSampleRows: false,
    includeAllFields: false,
  });
}

/**
 * Generate documentation markdown for dimensional fields
 */
export function generateDimensionalFieldDocs(): string {
  return `# VendFI Dimensional Fields Documentation

## What Are Dimensional Fields?

Dimensional fields let you analyze your finance performance across multiple business dimensions:

- **Sales Channel**: How customers buy (web, in-store, telesales, phone, marketplace)
- **Customer Segment**: Business size and type (SME small/medium, Enterprise, Startup)
- **Geography**: Customer location (country, region)
- **Currency**: Transaction currency (GBP, EUR, USD, etc.)

These optional fields enable powerful analytics and cohort comparisons across all vendors.

## Field Descriptions

### sales_channel (Optional)

How the transaction was made. Use one value per row.

**Valid values:**
- \`web\` - E-commerce website, online store
- \`in-store\` - Physical retail location, showroom
- \`telesales\` - Outbound sales calls, sales team
- \`phone\` - Inbound customer calls, support
- \`marketplace\` - Amazon, eBay, 3rd party platforms

**Examples:**
\`\`\`
web
in-store
telesales
phone
marketplace
\`\`\`

### customer_segment (Optional)

Your customer's business classification. Use one value per row.

**Valid values:**
- \`sme-small\` - Small business (1-10 employees), typically <£5k orders
- \`sme-medium\` - Medium business (10-50 employees), £5k-20k orders
- \`enterprise\` - Large business (50+ employees), £20k+ orders
- \`startup\` - Early-stage company (<3 years old)

**Examples:**
\`\`\`
sme-small
sme-medium
enterprise
startup
\`\`\`

### geography_country (Optional)

ISO 3166-1 alpha-2 country code (2 uppercase letters).

**Valid values:** GB, US, DE, FR, IT, ES, NL, BE, AT, CH, SE, NO, DK, FI, PL, CZ, IE, PT, GR, HU, CA, AU, NZ, and 20+ others.

**Examples:**
\`\`\`
GB
US
DE
FR
IT
\`\`\`

### geography_region (Optional)

State, province, or region name. Free text field, no validation.

**Examples:**
\`\`\`
England
Scotland
Wales
California
Bavaria
Ile-de-France
\`\`\`

### currency (Optional)

ISO 4217 currency code (3 uppercase letters).

**Valid values:** GBP, USD, EUR, AUD, CAD, JPY

**Examples:**
\`\`\`
GBP
USD
EUR
AUD
CAD
JPY
\`\`\`

## Complete Examples

### Full Dimensional Data
\`\`\`csv
order_id,order_date,product_name,order_value,finance_selected,finance_decision_status,sales_channel,customer_segment,geography_country,geography_region,currency
ORD-001,2024-11-01,MacBook Pro,2499,true,approved,web,sme-medium,GB,London,GBP
ORD-002,2024-11-02,iPad Pro,1299,true,declined,in-store,sme-small,GB,Manchester,GBP
\`\`\`

### Partial Dimensional Data
\`\`\`csv
order_id,order_date,product_name,order_value,finance_selected,finance_decision_status,sales_channel,customer_segment
ORD-003,2024-11-03,Mac Studio,3999,false,other,telesales,enterprise
ORD-004,2024-11-04,iPhone 15,999,true,approved,web,startup
\`\`\`

### Minimal Data (No Dimensions)
\`\`\`csv
order_id,order_date,product_name,order_value,finance_selected,finance_decision_status
ORD-005,2024-11-05,AirPods Pro,249,true,approved
ORD-006,2024-11-06,Apple Watch,399,false,other
\`\`\`

All three formats are supported and will process correctly.

## Deal Size Bands

Deal size bands are **computed automatically** from \`order_value\`. Do NOT include them in your CSV.

- **under-1k**: < £1,000 - Small orders, high volume
- **1k-5k**: £1,000 - £4,999 - Growing deals
- **5k-10k**: £5,000 - £9,999 - Mid-market
- **over-10k**: £10,000+ - Enterprise deals

Example: If order_value is 2500, deal_size_band will automatically be "1k-5k".

## Best Practices

1. **Be consistent**: Use the same channel/segment values throughout your data
2. **Don't invent values**: Stick to the valid values listed above
3. **Handle nulls gracefully**: Empty cells are fine - leave them blank
4. **Match case and format**: Values are case-insensitive and spaces are converted to hyphens
5. **Start small**: You don't need all dimensional fields from day one; add them gradually

`;
}

/**
 * Get field validation rules for all supported fields
 * Useful for CSV validators and form builders
 */
export function getFieldValidationRules(): Record<string, any> {
  return {
    // Core required fields
    order_id: {
      required: true,
      type: "string",
      maxLength: 100,
      description: "Unique transaction identifier",
      examples: ["ORD-2024-001", "TXN-12345"],
    },

    order_date: {
      required: true,
      type: "date",
      format: "YYYY-MM-DD",
      description: "Transaction date",
      examples: ["2024-11-01", "2024-12-31"],
    },

    product_name: {
      required: true,
      type: "string",
      maxLength: 255,
      description: "Product name",
      examples: ["MacBook Pro 14 inch", "iPad Pro 12.9 inch"],
    },

    finance_selected: {
      required: true,
      type: "boolean",
      description: "Customer selected finance?",
      examples: ["true", "false", "yes", "no"],
    },

    finance_decision_status: {
      required: true,
      type: "enum",
      values: ["approved", "declined", "pending", "cancelled", "other"],
      description: "Finance decision outcome",
    },

    // Optional core fields
    product_category: {
      required: false,
      type: "string",
      maxLength: 100,
      description: "Product category/type",
    },

    order_value: {
      required: false,
      type: "number",
      min: 0,
      decimals: 2,
      description: "Order value in GBP/currency",
    },

    customer_id: {
      required: false,
      type: "string",
      maxLength: 100,
      description: "Internal customer identifier",
    },

    product_sku: {
      required: false,
      type: "string",
      maxLength: 100,
      description: "Product SKU",
    },

    finance_provider: {
      required: false,
      type: "string",
      maxLength: 100,
      description: "Finance provider name",
      examples: ["PropelPay", "iWoca", "Klarna"],
    },

    finance_term_months: {
      required: false,
      type: "integer",
      min: 1,
      max: 60,
      description: "Loan term in months",
    },

    finance_decision_date: {
      required: false,
      type: "date",
      format: "YYYY-MM-DD",
      description: "Decision date",
    },

    // Dimensional fields (optional)
    sales_channel: {
      required: false,
      type: "enum",
      values: ["web", "in-store", "telesales", "phone", "marketplace"],
      description: "How transaction was made",
    },

    customer_segment: {
      required: false,
      type: "enum",
      values: ["sme-small", "sme-medium", "enterprise", "startup"],
      description: "Customer business type",
    },

    geography_country: {
      required: false,
      type: "string",
      pattern: "^[A-Z]{2}$",
      description: "ISO country code",
      examples: ["GB", "US", "DE", "FR"],
    },

    geography_region: {
      required: false,
      type: "string",
      maxLength: 100,
      description: "Region/state name",
      examples: ["England", "California", "Bavaria"],
    },

    currency: {
      required: false,
      type: "enum",
      values: ["GBP", "EUR", "USD", "AUD", "CAD", "JPY"],
      description: "Currency code",
    },

    vendor_id: {
      required: false, // Can be set via CLI if not in CSV
      type: "string",
      pattern: "^[a-z0-9-]+$",
      maxLength: 100,
      description: "Vendor identifier (lowercase alphanumeric with hyphens)",
      examples: ["acme-tech", "vendor1", "my-company"],
    },
  };
}

/**
 * Get import instructions for a specific vendor
 */
export function getImportInstructions(vendorId: string): string {
  return `# VendFI CSV Import Instructions for ${vendorId}

## Quick Start

1. **Prepare your CSV file**
   \`\`\`bash
   # Download template
   vendfi template --vendor ${vendorId} > ${vendorId}-template.csv

   # Fill in your data and save as: ${vendorId}-data.csv
   \`\`\`

2. **Import your data**
   \`\`\`bash
   vendfi import --vendor ${vendorId} --file ${vendorId}-data.csv
   \`\`\`

3. **View results**
   \`\`\`bash
   vendfi report --vendor ${vendorId}
   \`\`\`

## CSV Format Requirements

### Minimum Required Columns
- \`order_id\` - Unique identifier
- \`order_date\` - Transaction date (YYYY-MM-DD)
- \`product_name\` - Product name
- \`finance_selected\` - true/false
- \`finance_decision_status\` - approved/declined/pending/cancelled/other

### Optional Columns (Recommended)
- \`order_value\` - Order amount (numeric)
- \`product_category\` - Product type
- \`customer_id\` - Your customer ID

### Dimensional Columns (For Analytics)
- \`sales_channel\` - web, in-store, telesales, phone, marketplace
- \`customer_segment\` - sme-small, sme-medium, enterprise, startup
- \`geography_country\` - GB, US, DE, FR, etc.
- \`currency\` - GBP, USD, EUR, etc.

## Examples

### Minimal import (backward compatible)
\`\`\`csv
order_id,order_date,product_name,finance_selected,finance_decision_status
ORD-001,2024-11-01,Product A,true,approved
ORD-002,2024-11-02,Product B,false,declined
\`\`\`

### Full import (with dimensions)
\`\`\`csv
order_id,order_date,product_name,order_value,finance_selected,finance_decision_status,sales_channel,customer_segment,geography_country,currency
ORD-001,2024-11-01,Product A,2500,true,approved,web,sme-medium,GB,GBP
ORD-002,2024-11-02,Product B,1200,false,declined,in-store,sme-small,GB,GBP
\`\`\`

## Troubleshooting

### "Invalid field mapping"
- Check column names match exactly (case-insensitive is OK)
- Ensure required columns are present
- Remove extra/unrecognized columns

### "Invalid dimensional value"
- Check spelling of sales_channel, customer_segment, geography_country
- Use only valid enum values
- Leave blank if value is unknown

### "Order dates in future"
- Check date format (must be YYYY-MM-DD)
- Verify dates are not in the future

## Support

For more help:
\`\`\`bash
vendfi help import
vendfi template --help
\`\`\`
`;
}
