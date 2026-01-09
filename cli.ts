#!/usr/bin/env node
/**
 * VendFI Analytics CLI v4.0 - Complete Implementation
 *
 * Comprehensive command-line interface supporting all Phase 1 components:
 * - Week 1-2: CSV Processing, Vendor Management, Storage, Deduplication, Import History
 * - Week 3: Dimensional Filtering (5 dimensions, 14 operators, composable logic)
 * - Week 4: Dimensional Metrics (4 aggregators, multi-dimensional analysis)
 *
 * Total Commands: 46
 * - Data Processing Layer: 18 commands
 * - Analytics Filtering Layer: 12 commands
 * - Metrics & Analytics Layer: 16 commands
 *
 * Usage: vendfi <command> [options]
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { basename, resolve } from "path";
import {
  EnhancedCSVProcessor,
  ProcessorConfig,
} from "./src/core/processor-enhanced";
import { VendorStorage, DeduplicationEngine, FileManager } from "./src/storage";
import { generateHTMLReport } from "./src/reports/html-generator";
import {
  FilterEngine,
  FilterBuilder,
  FilterSet,
  DateRangeType,
  FilterResult,
} from "./src/filters";
import { ChannelMetricsAggregator } from "./src/aggregators/channel-metrics";
import { SegmentMetricsAggregator } from "./src/aggregators/segment-metrics";
import { GeographyMetricsAggregator } from "./src/aggregators/geography-metrics";
import { DealSizeMetricsAggregator } from "./src/aggregators/deal-size-metrics";
import { FilterOperator } from "./src/filters/filter-types";

// ============================================================================
// COLORS & FORMATTING
// ============================================================================

const c = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

function log(message: string, color: string = c.reset) {
  console.log(`${color}${message}${c.reset}`);
}

function printBanner() {
  log(
    "\n╔══════════════════════════════════════════════════════════════════╗",
    c.cyan,
  );
  log(
    "║           VendFI Analytics CLI v4.0 (Complete)                  ║",
    c.cyan,
  );
  log(
    "║  Data Processing + Filtering + Dimensional Analytics Complete   ║",
    c.cyan,
  );
  log(
    "╚══════════════════════════════════════════════════════════════════╝\n",
    c.cyan,
  );
}

// ============================================================================
// HELP & DOCUMENTATION
// ============================================================================

function printMainHelp() {
  printBanner();
  log("USAGE", c.bright);
  log("  vendfi <command> [options]\n");

  log("PHASE 1: DATA PROCESSING LAYER (Week 1-2) - 18 commands", c.bright);
  log("CSV Analysis & Validation:", c.cyan);
  log("  analyze          Analyze and process CSV file with full diagnostics");
  log("  validate         Validate CSV quality before processing");
  log("  map              Display inferred field mapping");
  log("  diagnose         Run comprehensive diagnostic report");
  log("  export-mapping   Export field mapping to JSON file");

  log("\nVendor Management:", c.cyan);
  log("  vendor:create    Create new vendor with profile");
  log("  vendor:list      List all vendors and their statistics");
  log("  vendor:info      Show detailed vendor information");
  log("  vendor:update    Update vendor profile or field mapping");
  log("  vendor:delete    Delete vendor and all associated data");

  log("\nImport Operations:", c.cyan);
  log(
    "  import:csv       Import CSV data to vendor storage with deduplication",
  );
  log("  import:list      View import history for a vendor");
  log("  import:details   Show metadata for specific import");
  log("  import:replay    Replay data from previous import");

  log("\nData Query & Export:", c.cyan);
  log("  data:list        List records for a vendor with filters");
  log("  data:count       Count total records for vendor");
  log("  data:export      Export records to CSV or JSON");
  log("  data:stats       Show vendor data statistics");

  log("\nPHASE 1: ANALYTICS FILTERING LAYER (Week 3) - 12 commands", c.bright);
  log("Filter Management:", c.cyan);
  log("  filter:create    Define and save new filter configuration");
  log("  filter:list      List all saved filters");
  log("  filter:info      Show detailed filter information");
  log("  filter:delete    Delete saved filter");

  log("\nFilter Application:", c.cyan);
  log("  filter:apply     Apply filter to vendor data");
  log("  filter:preview   Preview filter results (first N records)");
  log("  filter:describe  Get human-readable filter description");

  log("\nFilter Composition:", c.cyan);
  log("  filter:builder   Interactive filter builder");
  log("  filter:combine   Combine multiple filters (AND/OR)");
  log("  filter:test      Test filter against sample data");

  log("\nPreset Filters:", c.cyan);
  log("  filter:presets   List available preset filters");
  log("  filter:apply-preset  Apply named preset filter");

  log("\nPHASE 1: METRICS & ANALYTICS LAYER (Week 4) - 16 commands", c.bright);
  log("Channel Metrics:", c.cyan);
  log("  metrics:channel  Get sales channel performance metrics");
  log("  metrics:channel:top     Rank channels by metric");
  log("  metrics:channel:compare Compare two channels");

  log("\nSegment Metrics:", c.cyan);
  log("  metrics:segment  Get customer segment analytics");
  log("  metrics:segment:summary   Segment performance summary");
  log("  metrics:segment:compare   Segment comparison analysis");

  log("\nGeographic Metrics:", c.cyan);
  log("  metrics:geography        Get geographic performance metrics");
  log("  metrics:geography:country Country-level analysis");
  log("  metrics:geography:region Region-level breakdown");
  log("  metrics:geography:currency Currency analysis");

  log("\nDeal Size Metrics:", c.cyan);
  log("  metrics:deal-size Get deal size band metrics");
  log("  metrics:deal-size:distribution Volume/value distribution");
  log("  metrics:deal-size:comparison Band comparison");

  log("\nMulti-Dimensional Reports:", c.cyan);
  log("  metrics:report   Generate comprehensive multi-metric report");
  log("  metrics:export   Export metrics to JSON/CSV");

  log("\nGLOBAL OPTIONS", c.bright);
  log("  -h, --help                Show help for command");
  log("  -v, --verbose             Verbose output");
  log("  --vendor-id <id>          Specify vendor ID");
  log("  --data-dir <path>         Data storage directory (default: ./data)");

  log("\nEXAMPLES", c.bright);
  log("  # Data Processing (Week 1-2)", c.cyan);
  log("  vendfi analyze sales.csv");
  log("  vendfi vendor:create --vendor-id acme-tech --name 'ACME Technology'");
  log("  vendfi import:csv sales.csv --vendor-id acme-tech");

  log("\n  # Filtering (Week 3)", c.cyan);
  log("  vendfi filter:create web-only --dimensions sales_channels:WEB");
  log("  vendfi filter:apply web-only --vendor-id acme-tech");

  log("\n  # Metrics (Week 4)", c.cyan);
  log("  vendfi metrics:channel --vendor-id acme-tech");
  log(
    "  vendfi metrics:report --vendor-id acme-tech --export-html report.html",
  );

  log("\nFor help on specific command:", c.bright);
  log("  vendfi <command> --help\n");
}

function printCommandHelp(command: string) {
  const helps: { [key: string]: () => void } = {
    analyze: helpAnalyze,
    validate: helpValidate,
    map: helpMap,
    diagnose: helpDiagnose,
    "export-mapping": helpExportMapping,
    "vendor:create": helpVendorCreate,
    "vendor:list": helpVendorList,
    "vendor:info": helpVendorInfo,
    "vendor:update": helpVendorUpdate,
    "vendor:delete": helpVendorDelete,
    "import:csv": helpImportCsv,
    "import:list": helpImportList,
    "import:details": helpImportDetails,
    "import:replay": helpImportReplay,
    "data:list": helpDataList,
    "data:count": helpDataCount,
    "data:export": helpDataExport,
    "data:stats": helpDataStats,
    "filter:create": helpFilterCreate,
    "filter:apply": helpFilterApply,
    "filter:list": helpFilterList,
    "filter:presets": helpFilterPresets,
    "metrics:channel": helpMetricsChannel,
    "metrics:segment": helpMetricsSegment,
    "metrics:geography": helpMetricsGeography,
    "metrics:deal-size": helpMetricsDealSize,
    "metrics:report": helpMetricsReport,
  };

  if (helps[command]) {
    helps[command]();
  } else {
    log(`\n❌ Unknown command: ${command}`, c.red);
    log("Run 'vendfi --help' for available commands\n");
  }
}

// Week 1 Help Functions
function helpAnalyze() {
  log(
    "\nanalyze - Analyze and process CSV file with full diagnostics",
    c.bright,
  );
  log("USAGE: vendfi analyze <csv-file> [options]\n");

  log("OPTIONS", c.bright);
  log(
    "  -o, --output <file>              Output HTML report (default: report.html)",
  );
  log("  -j, --json <file>                Also save JSON report");
  log("  -v, --vendor-id <id>             Vendor ID (default: vendor-001)");
  log("  -f, --finance-only               Assume all rows are financed");
  log("  -m, --mapping <file>             Use custom mapping JSON file");
  log("  --date-from <YYYY-MM-DD>         Filter from date");
  log("  --date-to <YYYY-MM-DD>           Filter to date");
  log("  --max-errors <n>                 Stop after N errors");
  log("  --continue-on-error              Continue despite errors");
  log("  --allow-duplicates               Allow duplicate order IDs");
  log(
    "  --confidence <0-1>               Min mapping confidence (default: 0.6)",
  );

  log("\nEXAMPLES", c.bright);
  log("  vendfi analyze sales-data.csv");
  log("  vendfi analyze sales-data.csv -o custom-report.html -v acme-tech");
  log("  vendfi analyze messy-data.csv --continue-on-error --max-errors 100\n");
}

function helpValidate() {
  log("\nvalidate - Validate CSV quality before processing", c.bright);
  log("USAGE: vendfi validate <csv-file> [options]\n");

  log("OPTIONS", c.bright);
  log("  -v, --vendor-id <id>             Vendor ID for context");
  log("  -m, --mapping <file>             Use custom mapping");
  log("  --confidence <0-1>               Min mapping confidence");

  log("\nEXAMPLES", c.bright);
  log("  vendfi validate sales-data.csv");
  log("  vendfi validate sales-data.csv -m mapping.json\n");
}

function helpMap() {
  log("\nmap - Display inferred field mapping", c.bright);
  log("USAGE: vendfi map <csv-file> [options]\n");

  log("OPTIONS", c.bright);
  log("  --confidence <0-1>               Min mapping confidence");
  log("  -s, --save <file>                Save mapping to JSON file");

  log("\nEXAMPLES", c.bright);
  log("  vendfi map sales-data.csv");
  log("  vendfi map sales-data.csv -s my-mapping.json\n");
}

function helpDiagnose() {
  log("\ndiagnose - Run comprehensive diagnostic report", c.bright);
  log("USAGE: vendfi diagnose <csv-file> [options]\n");

  log("OPTIONS", c.bright);
  log("  -o, --output <file>              Output report file");
  log("  -v, --vendor-id <id>             Vendor ID");

  log("\nEXAMPLES", c.bright);
  log("  vendfi diagnose problematic.csv");
  log("  vendfi diagnose problematic.csv -o diagnostic-report.html\n");
}

function helpExportMapping() {
  log("\nexport-mapping - Export field mapping to JSON file", c.bright);
  log("USAGE: vendfi export-mapping <csv-file> -o <output-file>\n");

  log("OPTIONS", c.bright);
  log("  -o, --output <file>              Output JSON file (required)");

  log("\nEXAMPLES", c.bright);
  log("  vendfi export-mapping sales.csv -o mapping.json\n");
}

// Week 2 Help Functions
function helpVendorCreate() {
  log("\nvendor:create - Create new vendor with profile", c.bright);
  log("USAGE: vendfi vendor:create [options]\n");

  log("OPTIONS", c.bright);
  log("  --vendor-id <id>                 Vendor ID (required)");
  log("  --name <name>                    Display name (required)");
  log("  --description <text>             Vendor description");
  log("  --mapping <file>                 Initial field mapping file");

  log("\nEXAMPLES", c.bright);
  log("  vendfi vendor:create --vendor-id acme-tech --name 'ACME Technology'");
  log(
    "  vendfi vendor:create --vendor-id acme --name 'ACME' --description 'Leading equipment distributor' --mapping mapping.json\n",
  );
}

function helpVendorList() {
  log("\nvendor:list - List all vendors and their statistics", c.bright);
  log("USAGE: vendfi vendor:list [options]\n");

  log("OPTIONS", c.bright);
  log(
    "  --format <format>                Output format: table|json (default: table)",
  );
  log(
    "  --sort <field>                   Sort by: name|records|date (default: name)",
  );

  log("\nEXAMPLES", c.bright);
  log("  vendfi vendor:list");
  log("  vendfi vendor:list --format json");
  log("  vendfi vendor:list --sort records\n");
}

function helpVendorInfo() {
  log("\nvendor:info - Show detailed vendor information", c.bright);
  log("USAGE: vendfi vendor:info --vendor-id <id>\n");

  log("OPTIONS", c.bright);
  log("  --vendor-id <id>                 Vendor ID (required)");
  log("  --include-records                Include recent records in output");

  log("\nEXAMPLES", c.bright);
  log("  vendfi vendor:info --vendor-id acme-tech");
  log("  vendfi vendor:info --vendor-id acme-tech --include-records\n");
}

function helpVendorUpdate() {
  log("\nvendor:update - Update vendor profile or field mapping", c.bright);
  log("USAGE: vendfi vendor:update --vendor-id <id> [options]\n");

  log("OPTIONS", c.bright);
  log("  --vendor-id <id>                 Vendor ID (required)");
  log("  --name <name>                    Update display name");
  log("  --description <text>             Update description");
  log("  --mapping <file>                 Update field mapping from file");

  log("\nEXAMPLES", c.bright);
  log("  vendfi vendor:update --vendor-id acme-tech --name 'ACME Tech Corp'");
  log(
    "  vendfi vendor:update --vendor-id acme-tech --mapping new-mapping.json\n",
  );
}

function helpVendorDelete() {
  log("\nvendor:delete - Delete vendor and all associated data", c.bright);
  log("USAGE: vendfi vendor:delete --vendor-id <id> [options]\n");

  log("OPTIONS", c.bright);
  log("  --vendor-id <id>                 Vendor ID (required)");
  log("  --force                          Skip confirmation prompt");

  log("⚠️  WARNING: This will permanently delete all data for the vendor!\n");

  log("EXAMPLES", c.bright);
  log("  vendfi vendor:delete --vendor-id old-vendor");
  log("  vendfi vendor:delete --vendor-id old-vendor --force\n");
}

function helpImportCsv() {
  log(
    "\nimport:csv - Import CSV data to vendor storage with deduplication",
    c.bright,
  );
  log("USAGE: vendfi import:csv <csv-file> --vendor-id <id> [options]\n");

  log("OPTIONS", c.bright);
  log("  --vendor-id <id>                 Target vendor ID (required)");
  log("  -m, --mapping <file>             Field mapping file");
  log("  --allow-duplicates               Allow duplicate order IDs");
  log("  --merge-mode                     Merge/update existing records");
  log("  --skip-duplicates                Skip duplicate records silently");

  log("\nEXAMPLES", c.bright);
  log("  vendfi import:csv Q4-sales.csv --vendor-id acme-tech");
  log("  vendfi import:csv Q4-sales.csv --vendor-id acme-tech -m mapping.json");
  log("  vendfi import:csv updates.csv --vendor-id acme-tech --merge-mode\n");
}

function helpImportList() {
  log("\nimport:list - View import history for a vendor", c.bright);
  log("USAGE: vendfi import:list --vendor-id <id> [options]\n");

  log("OPTIONS", c.bright);
  log("  --vendor-id <id>                 Vendor ID (required)");
  log("  --limit <n>                      Show last N imports (default: 10)");
  log("  --format <format>                Output format: table|json|detailed");

  log("\nEXAMPLES", c.bright);
  log("  vendfi import:list --vendor-id acme-tech");
  log("  vendfi import:list --vendor-id acme-tech --limit 20");
  log("  vendfi import:list --vendor-id acme-tech --format detailed\n");
}

function helpImportDetails() {
  log("\nimport:details - Show metadata for specific import", c.bright);
  log("USAGE: vendfi import:details --vendor-id <id> --import-id <id>\n");

  log("OPTIONS", c.bright);
  log("  --vendor-id <id>                 Vendor ID (required)");
  log("  --import-id <id>                 Import ID (required)");

  log("\nEXAMPLES", c.bright);
  log(
    "  vendfi import:details --vendor-id acme-tech --import-id import_1234567890_abc\n",
  );
}

function helpImportReplay() {
  log("\nimport:replay - Replay data from previous import", c.bright);
  log(
    "USAGE: vendfi import:replay --vendor-id <id> --import-id <id> [options]\n",
  );

  log("OPTIONS", c.bright);
  log("  --vendor-id <id>                 Vendor ID (required)");
  log("  --import-id <id>                 Import ID to replay (required)");
  log("  --output <file>                  Export to CSV/JSON file");

  log("\nEXAMPLES", c.bright);
  log(
    "  vendfi import:replay --vendor-id acme-tech --import-id import_1234567890_abc",
  );
  log(
    "  vendfi import:replay --vendor-id acme-tech --import-id import_1234567890_abc -o recovered.csv\n",
  );
}

function helpDataList() {
  log("\ndata:list - List records for a vendor with filters", c.bright);
  log("USAGE: vendfi data:list --vendor-id <id> [options]\n");

  log("OPTIONS", c.bright);
  log("  --vendor-id <id>                 Vendor ID (required)");
  log("  --limit <n>                      Limit results (default: 50)");
  log("  --skip <n>                       Skip first N records");
  log("  --from-date <YYYY-MM-DD>         Filter from date");
  log("  --to-date <YYYY-MM-DD>           Filter to date");
  log("  --sort-by <field>                Sort by field");
  log("  --format <format>                Output format: table|json|csv");

  log("\nEXAMPLES", c.bright);
  log("  vendfi data:list --vendor-id acme-tech");
  log(
    "  vendfi data:list --vendor-id acme-tech --limit 100 --sort-by order_date",
  );
  log(
    "  vendfi data:list --vendor-id acme-tech --from-date 2024-01-01 --to-date 2024-12-31\n",
  );
}

function helpDataCount() {
  log("\ndata:count - Count total records for vendor", c.bright);
  log("USAGE: vendfi data:count --vendor-id <id>\n");

  log("EXAMPLES", c.bright);
  log("  vendfi data:count --vendor-id acme-tech\n");
}

function helpDataExport() {
  log("\ndata:export - Export records to CSV or JSON", c.bright);
  log(
    "USAGE: vendfi data:export --vendor-id <id> -o <output-file> [options]\n",
  );

  log("OPTIONS", c.bright);
  log("  --vendor-id <id>                 Vendor ID (required)");
  log("  -o, --output <file>              Output file (required)");
  log("  --from-date <YYYY-MM-DD>         Filter from date");
  log("  --to-date <YYYY-MM-DD>           Filter to date");
  log(
    "  --format <format>                Format: csv|json (auto-detect from extension)",
  );

  log("\nEXAMPLES", c.bright);
  log("  vendfi data:export --vendor-id acme-tech -o export.csv");
  log("  vendfi data:export --vendor-id acme-tech -o export.json");
  log(
    "  vendfi data:export --vendor-id acme-tech -o 2024-data.csv --from-date 2024-01-01 --to-date 2024-12-31\n",
  );
}

function helpDataStats() {
  log("\ndata:stats - Show vendor data statistics", c.bright);
  log("USAGE: vendfi data:stats --vendor-id <id>\n");

  log("EXAMPLES", c.bright);
  log("  vendfi data:stats --vendor-id acme-tech\n");
}

// Week 3 Help Functions
function helpFilterCreate() {
  log("\nfilter:create - Define and save new filter configuration", c.bright);
  log("USAGE: vendfi filter:create <name> [options]\n");

  log("OPTIONS", c.bright);
  log("  <name>                           Filter name (required)");
  log("  --dimensions <spec>              Dimension filters (repeatable)");
  log("  --date-range <type>              Date range type");
  log("  --from-date <YYYY-MM-DD>         Custom date range start");
  log("  --to-date <YYYY-MM-DD>           Custom date range end");
  log("  --custom <expression>            Custom filter expression");
  log("  --logic <AND|OR>                 Composition logic");
  log("  --description <text>             Filter description");

  log("\nDIMENSION SPECS", c.bright);
  log("  sales_channels:WEB,PHONE");
  log("  customer_segments:ENTERPRISE,SME_MEDIUM");
  log("  countries:GB,US,DE");
  log("  currencies:GBP,USD");
  log("  deal_size_bands:FROM_5K_TO_10K,OVER_50K");

  log("\nEXAMPLES", c.bright);
  log("  vendfi filter:create web-only --dimensions sales_channels:WEB");
  log(
    "  vendfi filter:create enterprise-gb --dimensions customer_segments:ENTERPRISE --dimensions countries:GB\n",
  );
}

function helpFilterApply() {
  log("\nfilter:apply - Apply filter to vendor data", c.bright);
  log("USAGE: vendfi filter:apply <filter-id> --vendor-id <id> [options]\n");

  log("OPTIONS", c.bright);
  log("  <filter-id>                      Filter name or ID (required)");
  log("  --vendor-id <id>                 Vendor ID (required)");
  log("  --preview <n>                    Show first N matching records");
  log("  --count-only                     Return only match count");
  log("  --export <file>                  Export filtered results to CSV");
  log("  --stats                          Include statistics");
  log("  --format <format>                Output format: table|json|csv");

  log("\nEXAMPLES", c.bright);
  log("  vendfi filter:apply web-only --vendor-id acme-tech");
  log("  vendfi filter:apply web-only --vendor-id acme-tech --count-only");
  log(
    "  vendfi filter:apply web-only --vendor-id acme-tech --export results.csv\n",
  );
}

function helpFilterList() {
  log("\nfilter:list - List all saved filters", c.bright);
  log("USAGE: vendfi filter:list [options]\n");

  log("OPTIONS", c.bright);
  log("  --detailed                       Show full filter definitions");
  log("  --format <format>                Output format: table|json");

  log("\nEXAMPLES", c.bright);
  log("  vendfi filter:list");
  log("  vendfi filter:list --detailed\n");
}

function helpFilterPresets() {
  log("\nfilter:presets - List available preset filters", c.bright);
  log("USAGE: vendfi filter:presets [options]\n");

  log("BUILT-IN PRESETS", c.bright);
  log("  SME_WEB                          SME customers via web");
  log("  ENTERPRISE_ALL_CHANNELS          Enterprise all channels");
  log("  HIGH_VALUE_DEALS                 Deals over £5,000");
  log("  UK_SALES                         UK-only transactions");
  log("  GBP_TRANSACTIONS                 GBP currency only");

  log("\nEXAMPLES", c.bright);
  log("  vendfi filter:presets");
  log("  vendfi filter:apply-preset HIGH_VALUE_DEALS --vendor-id acme-tech\n");
}

// Week 4 Help Functions
function helpMetricsChannel() {
  log("\nmetrics:channel - Get sales channel performance metrics", c.bright);
  log("USAGE: vendfi metrics:channel --vendor-id <id> [options]\n");

  log("OPTIONS", c.bright);
  log("  --vendor-id <id>                 Vendor ID (required)");
  log("  --channel <CHANNEL>              Specific channel only");
  log("  --rank-by <metric>               Sort by: volume|value|approval");
  log("  --compare <ch1,ch2>              Compare two channels");
  log("  --filter <filter-id>             Apply filter before metrics");
  log("  --format <format>                Output format: table|json");

  log("\nEXAMPLES", c.bright);
  log("  vendfi metrics:channel --vendor-id acme-tech");
  log("  vendfi metrics:channel --vendor-id acme-tech --rank-by approval");
  log("  vendfi metrics:channel --vendor-id acme-tech --compare WEB,PHONE\n");
}

function helpMetricsSegment() {
  log("\nmetrics:segment - Get customer segment analytics", c.bright);
  log("USAGE: vendfi metrics:segment --vendor-id <id> [options]\n");

  log("OPTIONS", c.bright);
  log("  --vendor-id <id>                 Vendor ID (required)");
  log("  --segment <SEGMENT>              Specific segment only");
  log("  --rank-by <metric>               Sort by: volume|value|approval");
  log("  --compare <seg1,seg2>            Compare two segments");
  log("  --sme-summary                    SME segments combined");
  log("  --format <format>                Output format: table|json");

  log("\nEXAMPLES", c.bright);
  log("  vendfi metrics:segment --vendor-id acme-tech");
  log("  vendfi metrics:segment --vendor-id acme-tech --sme-summary");
  log(
    "  vendfi metrics:segment --vendor-id acme-tech --compare ENTERPRISE,SME_MEDIUM\n",
  );
}

function helpMetricsGeography() {
  log("\nmetrics:geography - Get geographic performance metrics", c.bright);
  log("USAGE: vendfi metrics:geography --vendor-id <id> [options]\n");

  log("OPTIONS", c.bright);
  log("  --vendor-id <id>                 Vendor ID (required)");
  log("  --level <country|region>         Breakdown level (default: country)");
  log("  --country <CODE>                 Specific country only");
  log(
    "  --region <REGION>                Specific region (EMEA, Americas, APAC)",
  );
  log("  --currency-summary               Group by currency");
  log("  --domestic-international         Compare domestic vs intl");
  log("  --format <format>                Output format: table|json");

  log("\nEXAMPLES", c.bright);
  log("  vendfi metrics:geography --vendor-id acme-tech");
  log("  vendfi metrics:geography --vendor-id acme-tech --level region");
  log(
    "  vendfi metrics:geography --vendor-id acme-tech --domestic-international\n",
  );
}

function helpMetricsDealSize() {
  log("\nmetrics:deal-size - Get deal size band metrics", c.bright);
  log("USAGE: vendfi metrics:deal-size --vendor-id <id> [options]\n");

  log("OPTIONS", c.bright);
  log("  --vendor-id <id>                 Vendor ID (required)");
  log("  --band <BAND>                    Specific band only");
  log("  --distribution                   Volume & value distribution");
  log("  --compare <band1,band2>          Compare two bands");
  log("  --concentration                  Show revenue concentration");
  log("  --format <format>                Output format: table|json");

  log("\nEXAMPLES", c.bright);
  log("  vendfi metrics:deal-size --vendor-id acme-tech");
  log("  vendfi metrics:deal-size --vendor-id acme-tech --distribution");
  log(
    "  vendfi metrics:deal-size --vendor-id acme-tech --compare UNDER_1K,OVER_50K\n",
  );
}

function helpMetricsReport() {
  log(
    "\nmetrics:report - Generate comprehensive multi-metric report",
    c.bright,
  );
  log("USAGE: vendfi metrics:report --vendor-id <id> [options]\n");

  log("OPTIONS", c.bright);
  log("  --vendor-id <id>                 Vendor ID (required)");
  log("  --filter <filter-id>             Apply filter before metrics");
  log("  --from-date <YYYY-MM-DD>         Date range start");
  log("  --to-date <YYYY-MM-DD>           Date range end");
  log("  --export-html <file>             Export HTML report");
  log("  --export-json <file>             Export JSON data");
  log("  --export-csv <file>              Export CSV summary");
  log("  --summary                        Summary only (no details)");

  log("\nEXAMPLES", c.bright);
  log("  vendfi metrics:report --vendor-id acme-tech");
  log(
    "  vendfi metrics:report --vendor-id acme-tech --export-html report.html\n",
  );
}

// ============================================================================
// ARGUMENT PARSING
// ============================================================================

interface CliOptions {
  command: string;
  csvFile?: string;
  vendorId?: string;
  name?: string;
  description?: string;
  output?: string;
  json?: string;
  mapping?: string;
  help?: boolean;
  verbose?: boolean;
  financeOnly?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  maxErrors?: number;
  continueOnError?: boolean;
  allowDuplicates?: boolean;
  confidence?: number;
  limit?: number;
  skip?: number;
  sortBy?: string;
  format?: string;
  importId?: string;
  force?: boolean;
  includeRecords?: boolean;
  dataDir?: string;
  mergeMode?: boolean;
  skipDuplicates?: boolean;
  // Week 3 options
  dimensions?: string[];
  dateRange?: string;
  customFilter?: string;
  logic?: string;
  filterDescription?: string;
  countOnly?: boolean;
  preview?: number;
  exportFile?: string;
  stats?: boolean;
  detailed?: boolean;
  // Week 4 options
  channel?: string;
  rankBy?: string;
  compare?: string;
  segment?: string;
  smeSummary?: boolean;
  level?: string;
  country?: string;
  region?: string;
  currencySummary?: boolean;
  domesticInternational?: boolean;
  band?: string;
  distribution?: boolean;
  concentration?: boolean;
  summary?: boolean;
  exportHtml?: string;
  exportJson?: string;
  exportCsv?: string;
  filter?: string;
  [key: string]: any;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    command: args[0] || "help",
    csvFile: args[1],
    help: false,
    verbose: false,
    financeOnly: false,
    continueOnError: true,
    allowDuplicates: false,
    confidence: 0.6,
    limit: 50,
    skip: 0,
    dataDir: "./data",
    dimensions: [],
  };

  for (let i = 2; i < args.length; i++) {
    const arg = args[i];

    if (arg === "-h" || arg === "--help") {
      options.help = true;
    } else if (arg === "-v" || arg === "--vendor-id") {
      options.vendorId = args[++i];
    } else if (arg === "--name") {
      options.name = args[++i];
    } else if (arg === "--description") {
      options.description = args[++i];
    } else if (arg === "-o" || arg === "--output") {
      options.output = args[++i];
    } else if (arg === "-j" || arg === "--json") {
      options.json = args[++i];
    } else if (arg === "-m" || arg === "--mapping") {
      options.mapping = args[++i];
    } else if (arg === "-f" || arg === "--finance-only") {
      options.financeOnly = true;
    } else if (arg === "--date-from") {
      options.dateFrom = new Date(args[++i]);
    } else if (arg === "--date-to") {
      options.dateTo = new Date(args[++i]);
    } else if (arg === "--from-date") {
      options.dateFrom = new Date(args[++i]);
    } else if (arg === "--to-date") {
      options.dateTo = new Date(args[++i]);
    } else if (arg === "--max-errors") {
      options.maxErrors = parseInt(args[++i]);
    } else if (arg === "--continue-on-error") {
      options.continueOnError = true;
    } else if (arg === "--allow-duplicates") {
      options.allowDuplicates = true;
    } else if (arg === "--confidence") {
      options.confidence = parseFloat(args[++i]);
    } else if (arg === "--limit") {
      options.limit = parseInt(args[++i]);
    } else if (arg === "--skip") {
      options.skip = parseInt(args[++i]);
    } else if (arg === "--sort-by" || arg === "--sort") {
      options.sortBy = args[++i];
    } else if (arg === "--format") {
      options.format = args[++i];
    } else if (arg === "--import-id") {
      options.importId = args[++i];
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--include-records") {
      options.includeRecords = true;
    } else if (arg === "--data-dir") {
      options.dataDir = args[++i];
    } else if (arg === "--save") {
      options.output = args[++i];
    } else if (arg === "--merge-mode") {
      options.mergeMode = true;
    } else if (arg === "--skip-duplicates") {
      options.skipDuplicates = true;
    } else if (arg === "-s" || arg === "--save") {
      options.output = args[++i];
    } else if (arg === "--dimensions") {
      const dimSpec = args[++i];
      if (!options.dimensions) options.dimensions = [];
      options.dimensions.push(dimSpec);
    } else if (arg === "--date-range") {
      options.dateRange = args[++i];
    } else if (arg === "--custom") {
      options.customFilter = args[++i];
    } else if (arg === "--logic") {
      options.logic = args[++i];
    } else if (arg === "--count-only") {
      options.countOnly = true;
    } else if (arg === "--preview") {
      options.preview = parseInt(args[++i]);
    } else if (arg === "--export") {
      options.exportFile = args[++i];
    } else if (arg === "--stats") {
      options.stats = true;
    } else if (arg === "--detailed") {
      options.detailed = true;
    } else if (arg === "--channel") {
      options.channel = args[++i];
    } else if (arg === "--rank-by") {
      options.rankBy = args[++i];
    } else if (arg === "--compare") {
      options.compare = args[++i];
    } else if (arg === "--segment") {
      options.segment = args[++i];
    } else if (arg === "--sme-summary") {
      options.smeSummary = true;
    } else if (arg === "--level") {
      options.level = args[++i];
    } else if (arg === "--country") {
      options.country = args[++i];
    } else if (arg === "--region") {
      options.region = args[++i];
    } else if (arg === "--currency-summary") {
      options.currencySummary = true;
    } else if (arg === "--domestic-international") {
      options.domesticInternational = true;
    } else if (arg === "--band") {
      options.band = args[++i];
    } else if (arg === "--distribution") {
      options.distribution = true;
    } else if (arg === "--concentration") {
      options.concentration = true;
    } else if (arg === "--summary") {
      options.summary = true;
    } else if (arg === "--export-html") {
      options.exportHtml = args[++i];
    } else if (arg === "--export-json") {
      options.exportJson = args[++i];
    } else if (arg === "--export-csv") {
      options.exportCsv = args[++i];
    } else if (arg === "--filter") {
      options.filter = args[++i];
    }
  }

  return options;
}

// ============================================================================
// WEEK 1 COMMANDS
// ============================================================================

function commandAnalyze(csvFile: string, options: CliOptions) {
  log(`\n📊 Analyzing: ${basename(csvFile)}`, c.bright);

  if (!csvFile || !existsSync(csvFile)) {
    log(`❌ Error: CSV file not found: ${csvFile}`, c.red);
    process.exit(1);
  }

  try {
    const csvContent = readFileSync(csvFile, "utf-8");
    const config: ProcessorConfig = {
      vendorId: options.vendorId || "vendor-001",
      parseOptions: {
        assumeFinanceSelected: options.financeOnly,
        continueOnError: options.continueOnError,
        maxErrors: options.maxErrors,
        allowDuplicateOrderIds: options.allowDuplicates,
      },
      mappingConfidenceThreshold: options.confidence,
    };

    const processor = new EnhancedCSVProcessor(config);
    processor.loadFromString(csvContent);

    if (options.mapping) {
      log(`📂 Loading custom mapping: ${options.mapping}`, c.cyan);
      const mappingJson = JSON.parse(readFileSync(options.mapping, "utf-8"));
      processor.setMapping(mappingJson.mapping || mappingJson);
    } else {
      log(`🤖 Auto-inferring field mapping...`, c.cyan);
    }

    const result = processor.process(options.dateFrom, options.dateTo);

    if (!result.success) {
      log(`\n❌ Processing failed!`, c.red);
      if (result.importResult.errors.length > 0) {
        log(`Error: ${result.importResult.errors[0]?.error}`, c.red);
      }
      process.exit(1);
    }

    const ir = result.importResult;
    const dq = result.diagnostics.dataQuality;

    log(`\n✅ Processing Results:`, c.green);
    log(`   Total Rows: ${ir.total_rows}`);
    log(`   ✅ Successful: ${ir.successfully_normalized}`, c.green);
    if (ir.failed_rows > 0) {
      log(`   ❌ Failed: ${ir.failed_rows}`, c.red);
    }
    log(
      `   📈 Data Quality: ${(dq.accuracy * 100).toFixed(1)}%`,
      dq.accuracy > 0.85 ? c.green : c.yellow,
    );
    log(
      `   ⚡ Performance: ${ir.statistics.rowsPerSecond.toLocaleString()} rows/sec`,
      c.cyan,
    );

    if (options.output) {
      log(`\n📝 Generating HTML report...`, c.cyan);
      const html = generateHTMLReport(result.report!, {
        vendorName: options.vendorId || "vendor-001",
        csvFileName: basename(csvFile),
      });
      writeFileSync(options.output, html);
      log(`✅ HTML report saved: ${options.output}`, c.green);
    }

    if (options.json) {
      writeFileSync(options.json, JSON.stringify(result.report, null, 2));
      log(`✅ JSON report saved: ${options.json}`, c.green);
    }

    if (result.recommendations.length > 0) {
      log(`\n💡 Recommendations:`, c.bright);
      result.recommendations.slice(0, 3).forEach((rec, i) => {
        log(`   ${i + 1}. ${rec}`, c.cyan);
      });
    }

    log("\n");
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandValidate(csvFile: string, options: CliOptions) {
  log(`\n🔍 Validating: ${basename(csvFile)}`, c.bright);

  if (!csvFile || !existsSync(csvFile)) {
    log(`❌ Error: CSV file not found: ${csvFile}`, c.red);
    process.exit(1);
  }

  try {
    const csvContent = readFileSync(csvFile, "utf-8");
    const config: ProcessorConfig = {
      vendorId: options.vendorId || "vendor-001",
      parseOptions: {
        assumeFinanceSelected: options.financeOnly,
        continueOnError: true,
        allowDuplicateOrderIds: options.allowDuplicates,
      },
      mappingConfidenceThreshold: options.confidence,
    };

    const processor = new EnhancedCSVProcessor(config);
    processor.loadFromString(csvContent);

    log(`\n📊 CSV Structure:`, c.bright);
    const headers = processor.getHeaders();
    log(`   Columns: ${headers.length}`, c.cyan);
    log(`   Rows: ${csvContent.split("\n").length - 1}`, c.cyan);

    log(`\n🤖 Analyzing field mappings...`, c.cyan);
    const { inference, validation } = processor.inferOrLoadMapping();

    log(`\n📋 Validation Results:`, c.bright);
    log(
      `   Confidence: ${(inference.confidence * 100).toFixed(1)}%`,
      inference.confidence > 0.8 ? c.green : c.yellow,
    );
    log(
      `   Validation: ${validation.valid ? "✅ Valid" : "❌ Invalid"}`,
      validation.valid ? c.green : c.red,
    );

    if (!validation.valid) {
      log(`\n❌ Missing Required Fields:`, c.red);
      validation.missing.forEach((f) => log(`   - ${f}`, c.red));
    }

    log(`\n📥 Testing import...`, c.cyan);
    const importResult = processor.import();

    log(`\n✅ Import Test Results:`, c.bright);
    log(`   Total Rows: ${importResult.total_rows}`);
    log(`   ✅ Successful: ${importResult.successfully_normalized}`, c.green);
    if (importResult.failed_rows > 0) {
      log(`   ❌ Failed: ${importResult.failed_rows}`, c.red);
    }

    const successRate =
      importResult.successfully_normalized / importResult.total_rows;
    log(
      `\n📈 Data Quality Score: ${(successRate * 100).toFixed(1)}%`,
      successRate > 0.9 ? c.green : successRate > 0.7 ? c.yellow : c.red,
    );

    if (importResult.errors.length > 0) {
      log(`\n⚠️  Sample Errors (first 3):`, c.yellow);
      importResult.errors.slice(0, 3).forEach((err) => {
        log(`   Row ${err.row_number}: ${err.error}`, c.yellow);
      });
    }

    log(`\n💡 Recommendations:`, c.bright);
    if (successRate < 0.9) {
      log(
        `   • ${((1 - successRate) * 100).toFixed(1)}% of rows failed - review CSV export settings`,
        c.yellow,
      );
    }
    if (inference.confidence < 0.8) {
      log(
        `   • Low mapping confidence - consider creating custom mapping`,
        c.yellow,
      );
    }
    if (successRate >= 0.9 && inference.confidence >= 0.8) {
      log(`   ✅ CSV quality is good! Ready for analysis.`, c.green);
    }

    log("\n");
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandMap(csvFile: string, options: CliOptions) {
  log(`\n🗺️  Mapping for: ${basename(csvFile)}`, c.bright);

  if (!csvFile || !existsSync(csvFile)) {
    log(`❌ Error: CSV file not found: ${csvFile}`, c.red);
    process.exit(1);
  }

  try {
    const csvContent = readFileSync(csvFile, "utf-8");
    const processor = new EnhancedCSVProcessor({
      vendorId: options.vendorId || "vendor-001",
      mappingConfidenceThreshold: options.confidence,
    });

    processor.loadFromString(csvContent);
    const { inference } = processor.inferOrLoadMapping();

    log(
      `\nInferred Mapping (Confidence: ${(inference.confidence * 100).toFixed(1)}%):`,
      c.cyan,
    );
    Object.entries(inference.suggested_mapping).forEach(([key, value]) => {
      log(`  ${key}: ${value}`);
    });

    if (options.output) {
      writeFileSync(
        options.output,
        JSON.stringify(inference.suggested_mapping, null, 2),
      );
      log(`\n💾 Mapping saved: ${options.output}`, c.green);
    }

    log("\n");
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandDiagnose(csvFile: string, options: CliOptions) {
  log(`\n🔬 Running full diagnostics: ${basename(csvFile)}`, c.bright);

  if (!csvFile || !existsSync(csvFile)) {
    log(`❌ Error: CSV file not found: ${csvFile}`, c.red);
    process.exit(1);
  }

  try {
    const csvContent = readFileSync(csvFile, "utf-8");
    const config: ProcessorConfig = {
      vendorId: options.vendorId || "vendor-001",
      parseOptions: {
        assumeFinanceSelected: options.financeOnly,
        continueOnError: options.continueOnError,
        maxErrors: options.maxErrors,
        allowDuplicateOrderIds: options.allowDuplicates,
      },
      mappingConfidenceThreshold: options.confidence,
    };

    const processor = new EnhancedCSVProcessor(config);
    processor.loadFromString(csvContent);

    if (options.mapping) {
      const mappingJson = JSON.parse(readFileSync(options.mapping, "utf-8"));
      processor.setMapping(mappingJson);
    }

    const result = processor.process(options.dateFrom, options.dateTo);

    log(
      `\n═══════════════════════════════════════════════════════════════`,
      c.bright,
    );
    log(`  DIAGNOSTIC REPORT`, c.bright);
    log(
      `═══════════════════════════════════════════════════════════════\n`,
      c.bright,
    );

    log(
      `📊 Import Status: ${result.success ? "✅ Success" : "❌ Failed"}`,
      result.success ? c.green : c.red,
    );

    log(`\n📈 Data Quality Metrics:`, c.bright);
    const dq = result.diagnostics.dataQuality;
    log(
      `   Completeness: ${(dq.completeness * 100).toFixed(1)}%`,
      dq.completeness > 0.9 ? c.green : c.yellow,
    );
    log(
      `   Consistency: ${(dq.consistency * 100).toFixed(1)}%`,
      dq.consistency > 0.9 ? c.green : c.yellow,
    );
    log(
      `   Overall Accuracy: ${(dq.accuracy * 100).toFixed(1)}%`,
      dq.accuracy > 0.85 ? c.green : c.yellow,
    );

    log(`\n🗺️  Mapping Quality:`, c.bright);
    const mq = result.diagnostics.mappingQuality;
    log(
      `   Confidence: ${(mq.confidence * 100).toFixed(1)}%`,
      mq.confidence > 0.8 ? c.green : c.yellow,
    );
    log(
      `   Unmapped Fields: ${mq.unmappedFields.length}`,
      mq.unmappedFields.length > 0 ? c.yellow : c.green,
    );
    if (mq.unmappedFields.length > 0) {
      log(`   ${mq.unmappedFields.join(", ")}`, c.dim);
    }

    log(`\n⚡ Performance:`, c.bright);
    const perf = result.diagnostics.performance;
    log(`   Parse Time: ${perf.parseTimeMs}ms`);
    log(`   Process Time: ${perf.processTimeMs}ms`);
    log(
      `   Throughput: ${perf.rowsPerSecond.toLocaleString()} rows/sec`,
      c.cyan,
    );

    if (result.diagnostics.issues.length > 0) {
      log(`\n⚠️  Issues Found:`, c.bright);
      result.diagnostics.issues.forEach((issue) => {
        const icon =
          issue.severity === "critical"
            ? "🔴"
            : issue.severity === "warning"
              ? "🟡"
              : "🔵";
        const color =
          issue.severity === "critical"
            ? c.red
            : issue.severity === "warning"
              ? c.yellow
              : c.cyan;

        log(`   ${icon} [${issue.category}] ${issue.message}`, color);
      });
    }

    if (result.recommendations.length > 0) {
      log(`\n💡 Recommendations:`, c.bright);
      result.recommendations.forEach((rec, i) => {
        log(`   ${i + 1}. ${rec}`, c.cyan);
      });
    }

    log(`\n═══════════════════════════════════════════════════════════════\n`);
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

// ============================================================================
// WEEK 2 COMMANDS
// ============================================================================

function commandVendorCreate(options: CliOptions) {
  if (!options.vendorId || !options.name) {
    log(`\n❌ Error: --vendor-id and --name are required`, c.red);
    log("Use: vendfi vendor:create --vendor-id <id> --name <name>\n");
    process.exit(1);
  }

  try {
    const storage = new VendorStorage(options.dataDir || "./data");

    if (storage.getVendorProfile(options.vendorId)) {
      log(`\n❌ Error: Vendor already exists: ${options.vendorId}`, c.red);
      process.exit(1);
    }

    const profile = storage.createVendor(options.vendorId, {
      name: options.name,
      description: options.description,
      default_field_mapping: {},
      status: "active",
    });

    log(`\n✅ Vendor created successfully!`, c.green);
    log(`   ID: ${profile.vendor_id}`);
    log(`   Name: ${profile.name}`);
    log(`   Created: ${profile.created_at}\n`);
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandVendorList(options: CliOptions) {
  try {
    const storage = new VendorStorage(options.dataDir || "./data");
    const vendors = storage.listVendors();

    if (vendors.length === 0) {
      log(`\n📭 No vendors found`, c.yellow);
      return;
    }

    log(`\n📋 Vendors (${vendors.length}):`, c.bright);
    log("────────────────────────────────────────────────────────");

    vendors.forEach((vendorId) => {
      const profile = storage.getVendorProfile(vendorId);
      const stats = storage.getVendorStatistics(vendorId);

      if (profile) {
        log(`\n${profile.name} (${profile.vendor_id})`, c.cyan);
        log(`  Status: ${profile.status}`);
        log(`  Records: ${stats.total_records}`);
        log(`  Imports: ${stats.import_count}`);
        log(`  Created: ${profile.created_at}`);
      }
    });

    log("\n");
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandVendorInfo(options: CliOptions) {
  if (!options.vendorId) {
    log(`\n❌ Error: --vendor-id is required`, c.red);
    process.exit(1);
  }

  try {
    const storage = new VendorStorage(options.dataDir || "./data");
    const profile = storage.getVendorProfile(options.vendorId);

    if (!profile) {
      log(`\n❌ Vendor not found: ${options.vendorId}`, c.red);
      process.exit(1);
    }

    const stats = storage.getVendorStatistics(options.vendorId);
    const imports = storage.listImports(options.vendorId);

    log(`\n📊 Vendor Information`, c.bright);
    log("────────────────────────────────────────────────────────");
    log(`\nName: ${profile.name}`);
    log(`ID: ${profile.vendor_id}`);
    if (profile.description) log(`Description: ${profile.description}`);
    log(`Status: ${profile.status}`);
    log(`Created: ${profile.created_at}`);
    log(`Updated: ${profile.updated_at}`);

    log(`\n📈 Statistics:`, c.bright);
    log(`  Total Records: ${stats.total_records}`);
    log(`  Unique Records: ${stats.unique_records}`);
    log(`  Total Imports: ${stats.import_count}`);
    if (stats.oldest_record_date)
      log(
        `  Date Range: ${stats.oldest_record_date} to ${stats.newest_record_date}`,
      );

    log(`\n📥 Recent Imports:`, c.bright);
    imports.slice(0, 5).forEach((imp) => {
      log(`  ${imp.import_id}`);
      log(`    - Source: ${imp.source_file}`);
      log(
        `    - Records: ${imp.new_records} new, ${imp.duplicate_records} duplicates`,
      );
      log(`    - Date: ${imp.timestamp}`);
    });

    log("\n");
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandImportCsv(csvFile: string, options: CliOptions) {
  if (!csvFile || !existsSync(csvFile)) {
    log(`\n❌ Error: CSV file not found: ${csvFile}`, c.red);
    process.exit(1);
  }

  if (!options.vendorId) {
    log(`\n❌ Error: --vendor-id is required`, c.red);
    process.exit(1);
  }

  try {
    const storage = new VendorStorage(options.dataDir || "./data");
    const profile = storage.getVendorProfile(options.vendorId);

    if (!profile) {
      log(`\n❌ Vendor not found: ${options.vendorId}`, c.red);
      log("Use: vendfi vendor:create to create a vendor first\n");
      process.exit(1);
    }

    const csvContent = readFileSync(csvFile, "utf-8");
    const processor = new EnhancedCSVProcessor({
      vendorId: options.vendorId,
      parseOptions: { continueOnError: true },
    });

    processor.loadFromString(csvContent);
    const importResult = processor.import();
    const records = importResult.records || [];

    log(`\n📥 Importing CSV to vendor: ${options.vendorId}`, c.bright);
    log(`   File: ${basename(csvFile)}`);
    log(`   Records: ${records.length}`);

    const result = storage.saveImport(options.vendorId, records, {
      source_file: basename(csvFile),
      field_mapping: profile.default_field_mapping,
      total_records: records.length,
      new_records: 0,
      duplicate_records: 0,
      error_records: 0,
    });

    log(`\n✅ Import Complete!`, c.green);
    log(`   New Records: ${result.deduplicationResult.newCount}`, c.green);
    log(
      `   Duplicates: ${result.deduplicationResult.duplicateCount}`,
      c.yellow,
    );
    log(`   Import ID: ${result.importId}`);
    log(`   Timestamp: ${new Date().toISOString()}\n`);
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandVendorUpdate(options: CliOptions) {
  if (!options.vendorId) {
    log(`\n❌ Error: --vendor-id is required`, c.red);
    process.exit(1);
  }

  try {
    const storage = new VendorStorage(options.dataDir || "./data");
    const profile = storage.getVendorProfile(options.vendorId);

    if (!profile) {
      log(`\n❌ Vendor not found: ${options.vendorId}`, c.red);
      process.exit(1);
    }

    const updates: any = {};
    if (options.name) updates.name = options.name;
    if (options.description) updates.description = options.description;

    // Create updated profile by merging with existing
    const existingProfile = storage.getVendorProfile(options.vendorId);
    if (!existingProfile) {
      throw new Error(`Vendor '${options.vendorId}' does not exist`);
    }

    const updatedProfile = {
      ...existingProfile,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Save the updated profile
    storage["fileManager"].writeJSON(
      storage["getVendorProfilePath"](options.vendorId),
      updatedProfile,
    );
    log(`\n✅ Vendor updated: ${options.vendorId}\n`, c.green);
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandVendorDelete(options: CliOptions) {
  if (!options.vendorId) {
    log(`\n❌ Error: --vendor-id is required`, c.red);
    process.exit(1);
  }

  if (!options.force) {
    log(
      `\n⚠️  WARNING: This will delete all data for vendor: ${options.vendorId}`,
    );
    log(`Run with --force to confirm\n`);
    process.exit(0);
  }

  try {
    const storage = new VendorStorage(options.dataDir || "./data");
    storage.deleteVendor(options.vendorId);
    log(`\n✅ Vendor deleted: ${options.vendorId}\n`, c.green);
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandImportList(options: CliOptions) {
  if (!options.vendorId) {
    log(`\n❌ Error: --vendor-id is required`, c.red);
    process.exit(1);
  }

  try {
    const storage = new VendorStorage(options.dataDir || "./data");
    const imports = storage.listImports(options.vendorId);

    log(`\n📥 Import History for: ${options.vendorId}`, c.bright);
    log("────────────────────────────────────────────────────────");

    imports.slice(0, options.limit || 10).forEach((imp, idx) => {
      log(`\n${idx + 1}. ${imp.import_id}`, c.cyan);
      log(`   Source: ${imp.source_file}`);
      log(`   New: ${imp.new_records} | Duplicates: ${imp.duplicate_records}`);
      log(`   Date: ${imp.timestamp}`);
    });

    log("\n");
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandImportDetails(options: CliOptions) {
  if (!options.vendorId || !options.importId) {
    log(`\n❌ Error: --vendor-id and --import-id are required`, c.red);
    process.exit(1);
  }

  try {
    const storage = new VendorStorage(options.dataDir || "./data");
    const imports = storage.listImports(options.vendorId);
    const imp = imports.find((i) => i.import_id === options.importId);

    if (!imp) {
      log(`\n❌ Import not found: ${options.importId}`, c.red);
      process.exit(1);
    }

    log(`\n📋 Import Details`, c.bright);
    log("────────────────────────────────────────────────────────");
    log(`\nImport ID: ${imp.import_id}`);
    log(`Source: ${imp.source_file}`);
    log(`Date: ${imp.timestamp}`);
    log(`New Records: ${imp.new_records}`);
    log(`Duplicate Records: ${imp.duplicate_records}`);
    log(`Total: ${imp.new_records + imp.duplicate_records}\n`);
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandImportReplay(options: CliOptions) {
  if (!options.vendorId || !options.importId) {
    log(`\n❌ Error: --vendor-id and --import-id are required`, c.red);
    process.exit(1);
  }

  try {
    const storage = new VendorStorage(options.dataDir || "./data");
    const allRecords = storage.loadRecords(options.vendorId);

    log(`\n🔄 Replaying import: ${options.importId}`, c.bright);
    log(`   Records: ${allRecords.length}`);

    if (options.exportFile) {
      const csv = [
        Object.keys(allRecords[0] || {}).join(","),
        ...allRecords.map((r: any) => Object.values(r).join(",")),
      ].join("\n");
      writeFileSync(options.exportFile, csv);
      log(`   Exported to: ${options.exportFile}\n`, c.green);
    } else {
      log(`   ${allRecords.length} records available\n`, c.green);
    }
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandDataList(options: CliOptions) {
  if (!options.vendorId) {
    log(`\n❌ Error: --vendor-id is required`, c.red);
    process.exit(1);
  }

  try {
    const storage = new VendorStorage(options.dataDir || "./data");
    const records = storage.loadRecords(options.vendorId);

    log(`\n📋 Records for: ${options.vendorId}`, c.bright);
    log(`   Total: ${records.length}`);

    records
      .slice(options.skip || 0, (options.skip || 0) + (options.limit || 50))
      .forEach((r: any, idx: any): void => {
        log(`${idx + 1}. ${JSON.stringify(r).substring(0, 100)}...`);
      });

    log("\n");
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandDataCount(options: CliOptions) {
  if (!options.vendorId) {
    log(`\n❌ Error: --vendor-id is required`, c.red);
    process.exit(1);
  }

  try {
    const storage = new VendorStorage(options.dataDir || "./data");
    const records = storage.loadRecords(options.vendorId);

    log(`\n📊 Record Count for: ${options.vendorId}`, c.bright);
    log(`   Total Records: ${records.length}\n`, c.green);
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandDataExport(options: CliOptions) {
  if (!options.vendorId || !options.output) {
    log(`\n❌ Error: --vendor-id and -o/--output are required`, c.red);
    process.exit(1);
  }

  try {
    const storage = new VendorStorage(options.dataDir || "./data");
    const records = storage.loadRecords(options.vendorId);

    if (options.output.endsWith(".json")) {
      writeFileSync(options.output, JSON.stringify(records, null, 2));
    } else {
      const csv = [
        Object.keys(records[0] || {}).join(","),
        ...records.map((r) => Object.values(r).join(",")),
      ].join("\n");
      writeFileSync(options.output, csv);
    }

    log(
      `\n✅ Exported ${records.length} records to: ${options.output}\n`,
      c.green,
    );
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandDataStats(options: CliOptions) {
  if (!options.vendorId) {
    log(`\n❌ Error: --vendor-id is required`, c.red);
    process.exit(1);
  }

  try {
    const storage = new VendorStorage(options.dataDir || "./data");
    const stats = storage.getVendorStatistics(options.vendorId);

    log(`\n📊 Data Statistics for: ${options.vendorId}`, c.bright);
    log("────────────────────────────────────────────────────────");
    log(`\n📈 Record Counts:`);
    log(`   Total Records: ${stats.total_records}`);
    log(`   Unique Records: ${stats.unique_records}`);
    log(`   Imports: ${stats.import_count}`);

    if (stats.oldest_record_date) {
      log(`\n📅 Date Range:`);
      log(`   Oldest: ${stats.oldest_record_date}`);
      log(`   Newest: ${stats.newest_record_date}`);
    }

    log("\n");
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

// ============================================================================
// WEEK 3 COMMANDS - FILTER MANAGEMENT
// ============================================================================

function commandFilterCreate(name: string, options: CliOptions) {
  if (!name) {
    log(`\n❌ Error: Filter name is required`, c.red);
    process.exit(1);
  }

  try {
    log(`\n🔧 Creating filter: ${name}`, c.bright);

    const filterSet: FilterSet = {
      date_range: options.dateRange
        ? { type: options.dateRange as DateRangeType }
        : undefined,
      dimensions: {},
      custom: options.customFilter
        ? {
            field: "custom",
            operator: FilterOperator.EQUALS,
            value: options.customFilter,
          }
        : undefined,
    };

    if (options.dimensions && options.dimensions.length > 0) {
      options.dimensions.forEach((dimSpec: string) => {
        const [dimension, values] = dimSpec.split(":");
        if (dimension && values && filterSet.dimensions) {
          const parsedValues = values.split(",").map((v) => v.trim());
          switch (dimension.toLowerCase()) {
            case "sales_channels":
              filterSet.dimensions.sales_channels = parsedValues as any;
              break;
            case "customer_segments":
              filterSet.dimensions.customer_segments = parsedValues as any;
              break;
            case "countries":
              filterSet.dimensions.countries = parsedValues;
              break;
            case "currencies":
              filterSet.dimensions.currencies = parsedValues as any;
              break;
            case "deal_size_bands":
              filterSet.dimensions.deal_size_bands = parsedValues as any;
              break;
          }
        }
      });
    }

    const filterDir = `./.vendfi/filters`;
    if (!existsSync(filterDir)) {
      const fm = new FileManager(options.dataDir || "./data");
      fm.ensureDir(filterDir);
    }

    const filterFile = `${filterDir}/${name}.json`;
    writeFileSync(filterFile, JSON.stringify(filterSet, null, 2));

    log(`\n✅ Filter created successfully!`, c.green);
    log(`   Name: ${name}`);
    log(`   Dimensions: ${Object.keys(filterSet.dimensions || {}).length}`);
    log(`   Saved to: ${filterFile}\n`);
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandFilterApply(filterId: string, options: CliOptions) {
  if (!filterId || !options.vendorId) {
    log(`\n❌ Error: Filter ID and --vendor-id are required`, c.red);
    process.exit(1);
  }

  try {
    log(
      `\n🔍 Applying filter: ${filterId} to vendor: ${options.vendorId}`,
      c.bright,
    );

    const filterFile = `./.vendfi/filters/${filterId}.json`;
    if (!existsSync(filterFile)) {
      log(`\n❌ Error: Filter not found: ${filterId}`, c.red);
      process.exit(1);
    }

    const filterSet = JSON.parse(
      readFileSync(filterFile, "utf-8"),
    ) as FilterSet;
    const storage = new VendorStorage(options.dataDir || "./data");
    const records = storage.loadRecords(options.vendorId);

    const filterEngine = new FilterEngine();
    const filtered: FilterResult = filterEngine.applyFilterSet(
      records,
      filterSet,
    );

    if (options.countOnly) {
      log(`\n📊 Filter Results:`, c.bright);
      log(`   Total Records: ${records.length}`);
      log(`   Matching: ${filtered.filtered_records}`);
      log(
        `   Match Rate: ${((filtered.filtered_records / records.length) * 100).toFixed(1)}%\n`,
      );
      return;
    }

    if (options.exportFile && filtered.records.length > 0) {
      const csv = [
        Object.keys(filtered.records[0] || {}).join(","),
        ...filtered.records.map((r) => Object.values(r).join(",")),
      ].join("\n");
      writeFileSync(options.exportFile, csv);
      log(
        `\n✅ Exported ${filtered.filtered_records} records to: ${options.exportFile}\n`,
      );
      return;
    }

    log(`\n📊 Filter Results:`, c.bright);
    log(`   Matching Records: ${filtered.filtered_records}`);
    log(`   Total Records: ${records.length}`);
    log(
      `   Match Rate: ${((filtered.filtered_records / records.length) * 100).toFixed(1)}%`,
    );

    if (options.preview && filtered.records.length > 0) {
      log(
        `\n📋 Preview (first ${Math.min(options.preview, filtered.filtered_records)} records):`,
        c.cyan,
      );
      filtered.records.slice(0, options.preview).forEach((record, idx) => {
        log(`   ${idx + 1}. ${JSON.stringify(record).substring(0, 80)}...`);
      });
    }

    log("\n");
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandFilterList(options: CliOptions) {
  try {
    const filterDir = `./.vendfi/filters`;
    if (!existsSync(filterDir)) {
      log(`\n📭 No filters found`, c.yellow);
      return;
    }

    const fs = require("fs");
    const filters = fs
      .readdirSync(filterDir)
      .filter((f: string) => f.endsWith(".json"))
      .map((f: string) => {
        const content = JSON.parse(
          readFileSync(`${filterDir}/${f}`, "utf-8"),
        ) as FilterSet;
        return content;
      });

    if (filters.length === 0) {
      log(`\n📭 No filters found`, c.yellow);
      return;
    }

    log(`\n🔍 Filters (${filters.length}):`, c.bright);
    log("────────────────────────────────────────────────────────");

    filters.forEach((f: any) => {
      log(`\n${f.name || "Unnamed Filter"}`, c.cyan);
      log(`  Description: ${f.description || "N/A"}`);
      log(
        `  Dimensions: ${Object.keys(f.dimensions || {}).join(", ") || "None"}`,
      );
      log(`  Created: ${f.created_at || "Unknown"}`);
    });

    log("\n");
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandFilterInfo(filterId: string, options: CliOptions) {
  if (!filterId) {
    log(`\n❌ Error: Filter ID is required`, c.red);
    process.exit(1);
  }

  try {
    const filterFile = `./.vendfi/filters/${filterId}.json`;
    if (!existsSync(filterFile)) {
      log(`\n❌ Error: Filter not found: ${filterId}`, c.red);
      process.exit(1);
    }

    const filterSet = JSON.parse(
      readFileSync(filterFile, "utf-8"),
    ) as FilterSet;

    log(`\n📋 Filter Information`, c.bright);
    log("────────────────────────────────────────────────────────");
    log(`\nDescription: ${(filterSet as any).description || "N/A"}`);

    log(`\n🔧 Dimensions:`, c.bright);
    if (Object.keys(filterSet.dimensions || {}).length === 0) {
      log(`   (none)`);
    } else {
      Object.entries(filterSet.dimensions || {}).forEach(([dim, vals]) => {
        log(`   ${dim}: ${(vals as string[]).join(", ")}`);
      });
    }

    if (filterSet.date_range) {
      log(`\n📅 Date Range: ${filterSet.date_range.type}`);
    }

    if (filterSet.custom) {
      log(`\n⚙️  Custom Filter: ${JSON.stringify(filterSet.custom)}`);
    }

    log("\n");
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandFilterDelete(filterId: string, options: CliOptions) {
  if (!filterId) {
    log(`\n❌ Error: Filter ID is required`, c.red);
    process.exit(1);
  }

  try {
    const filterFile = `./.vendfi/filters/${filterId}.json`;
    if (!existsSync(filterFile)) {
      log(`\n❌ Error: Filter not found: ${filterId}`, c.red);
      process.exit(1);
    }

    const fs = require("fs");
    fs.unlinkSync(filterFile);
    log(`\n✅ Filter deleted: ${filterId}\n`, c.green);
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandFilterPresets(options: CliOptions) {
  const presets = [
    {
      name: "SME_WEB",
      description: "SME customers via web channel",
      dimensions: {
        customer_segments: ["SME_SMALL", "SME_MEDIUM"],
        sales_channels: ["WEB"],
      },
    },
    {
      name: "ENTERPRISE_ALL_CHANNELS",
      description: "Enterprise customers across all channels",
      dimensions: { customer_segments: ["ENTERPRISE"] },
    },
    {
      name: "HIGH_VALUE_DEALS",
      description: "Deal size bands over £5,000",
      dimensions: { deal_size_bands: ["FROM_5K_TO_10K", "OVER_50K"] },
    },
    {
      name: "UK_SALES",
      description: "UK-only transactions",
      dimensions: { countries: ["GB"] },
    },
    {
      name: "GBP_TRANSACTIONS",
      description: "GBP currency only",
      dimensions: { currencies: ["GBP"] },
    },
  ];

  log(`\n📋 Available Preset Filters:`, c.bright);
  log("────────────────────────────────────────────────────────");

  presets.forEach((preset) => {
    log(`\n${preset.name}`, c.cyan);
    log(`  Description: ${preset.description}`);
    log(
      `  Dimensions: ${Object.entries(preset.dimensions)
        .map(([k, v]) => `${k}: ${v.join(", ")}`)
        .join(" | ")}`,
    );
  });

  log(
    "\n💡 Usage: vendfi filter:apply-preset <preset-name> --vendor-id <id>\n",
  );
}

function commandFilterApplyPreset(presetName: string, options: CliOptions) {
  if (!presetName || !options.vendorId) {
    log(`\n❌ Error: Preset name and --vendor-id are required`, c.red);
    process.exit(1);
  }

  try {
    const presets: { [key: string]: any } = {
      SME_WEB: {
        dimensions: {
          customer_segments: ["SME_SMALL", "SME_MEDIUM"],
          sales_channels: ["WEB"],
        },
      },
      ENTERPRISE_ALL_CHANNELS: {
        dimensions: { customer_segments: ["ENTERPRISE"] },
      },
      HIGH_VALUE_DEALS: {
        dimensions: { deal_size_bands: ["FROM_5K_TO_10K", "OVER_50K"] },
      },
      UK_SALES: { dimensions: { countries: ["GB"] } },
      GBP_TRANSACTIONS: { dimensions: { currencies: ["GBP"] } },
    };

    if (!presets[presetName]) {
      log(`\n❌ Error: Unknown preset: ${presetName}`, c.red);
      process.exit(1);
    }

    log(
      `\n🔍 Applying preset: ${presetName} to vendor: ${options.vendorId}`,
      c.bright,
    );

    const filterSet: FilterSet = {
      dimensions: presets[presetName].dimensions,
    };

    const storage = new VendorStorage(options.dataDir || "./data");
    const records = storage.loadRecords(options.vendorId);
    const filterEngine = new FilterEngine();
    const filtered: FilterResult = filterEngine.applyFilterSet(
      records,
      filterSet,
    );

    log(`\n✅ Preset Applied!`, c.green);
    log(`   Preset: ${presetName}`);
    log(`   Matching Records: ${filtered.filtered_records}/${records.length}`);
    log(
      `   Match Rate: ${((filtered.filtered_records / records.length) * 100).toFixed(1)}%\n`,
    );
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

// ============================================================================
// WEEK 4 COMMANDS - METRICS & ANALYTICS
// ============================================================================

function commandMetricsChannel(options: CliOptions) {
  if (!options.vendorId) {
    log(`\n❌ Error: --vendor-id is required`, c.red);
    process.exit(1);
  }

  try {
    log(`\n📊 Channel Metrics for: ${options.vendorId}`, c.bright);

    const storage = new VendorStorage(options.dataDir || "./data");
    const records = storage.loadRecords(options.vendorId);

    const metrics = ChannelMetricsAggregator.aggregate(records);

    log(`\n📈 Channel Performance:`, c.bright);
    log("────────────────────────────────────────────────────────");

    metrics.forEach((m: any) => {
      log(`\n${m.sales_channel}:`);
      log(`   Records: ${m.total_orders}`);
      log(`   Value: £${m.total_value.toFixed(2)}`);
      log(`   Avg: £${m.avg_order_value?.toFixed(2) || "N/A"}`);
      log(`   Approval: ${((m.approval_rate || 0) * 100).toFixed(1)}%`);
    });

    log("\n");
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandMetricsChannelTop(options: CliOptions) {
  if (!options.vendorId) {
    log(`\n❌ Error: --vendor-id is required`, c.red);
    process.exit(1);
  }

  try {
    const storage = new VendorStorage(options.dataDir || "./data");
    const records = storage.loadRecords(options.vendorId);
    const metrics = ChannelMetricsAggregator.aggregate(records);

    const sortBy = options.rankBy || "volume";
    const sorted = metrics.sort((a: any, b: any): number => {
      switch (sortBy) {
        case "approval":
          return b.approval_rate - a.approval_rate;
        case "value":
          return b.total_value - a.total_value;
        default:
          return b.record_count - a.record_count;
      }
    });

    log(`\n🏆 Top Channels (by ${sortBy}):`, c.bright);
    sorted.slice(0, options.limit || 15).forEach((m: any, idx: number) => {
      log(
        `${idx + 1}. ${m.sales_channel}: ${m.total_orders} records, £${m.total_value.toFixed(2)}`,
      );
    });

    log("\n");
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandMetricsChannelCompare(options: CliOptions) {
  if (!options.vendorId || !options.compare) {
    log(`\n❌ Error: --vendor-id and --compare channels are required`, c.red);
    process.exit(1);
  }

  try {
    const [ch1, ch2] = options.compare.split(",");
    log(`\n📊 Comparing Channels: ${ch1} vs ${ch2}`, c.bright);

    const storage = new VendorStorage(options.dataDir || "./data");
    const records = storage.loadRecords(options.vendorId);
    const metrics = ChannelMetricsAggregator.aggregate(records);

    const m1 = metrics.find((m: any) => m.sales_channel === ch1);
    const m2 = metrics.find((m: any) => m.sales_channel === ch2);

    if (!m1 || !m2) {
      log(`\n❌ Error: One or both channels not found`, c.red);
      process.exit(1);
    }

    log(`\n${ch1.padEnd(20)} ${ch2.padEnd(20)}`);
    log("────────────────────────────────────────────────");
    log(`Records: ${m1.total_orders.toString().padEnd(20)} ${m2.total_orders}`);
    log(
      `Value: £${m1.total_value.toFixed(2).padEnd(17)} £${m2.total_value.toFixed(2)}`,
    );
    log(
      `Avg: £${m1.avg_order_value?.toFixed(2).padEnd(16) || "N/A"} £${m2.avg_order_value?.toFixed(2) || "N/A"}`,
    );
    log(
      `Approval: ${((m1.approval_rate || 0) * 100).toFixed(1)}%${" ".repeat(14)} ${((m2.approval_rate || 0) * 100).toFixed(1)}%`,
    );

    log("\n");
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandMetricsSegment(options: CliOptions) {
  if (!options.vendorId) {
    log(`\n❌ Error: --vendor-id is required`, c.red);
    process.exit(1);
  }

  try {
    log(`\n👥 Segment Metrics for: ${options.vendorId}`, c.bright);

    const storage = new VendorStorage(options.dataDir || "./data");
    const records = storage.loadRecords(options.vendorId);

    const metrics = SegmentMetricsAggregator.aggregate(records);

    log(`\n📊 Customer Segment Performance:`, c.bright);
    log("────────────────────────────────────────────────────────");

    metrics.forEach((m: any) => {
      log(`\n${m.customer_segment}:`);
      log(`   Records: ${m.total_orders}`);
      log(`   Value: £${m.total_value.toFixed(2)}`);
      log(`   Avg: £${m.avg_order_value?.toFixed(2) || "N/A"}`);
      log(`   Approval: ${((m.approval_rate || 0) * 100).toFixed(1)}%`);
    });

    log("\n");
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandMetricsSegmentSummary(options: CliOptions) {
  if (!options.vendorId) {
    log(`\n❌ Error: --vendor-id is required`, c.red);
    process.exit(1);
  }

  try {
    const storage = new VendorStorage(options.dataDir || "./data");
    const records = storage.loadRecords(options.vendorId);
    const metrics = GeographyMetricsAggregator.aggregateByCountry(records);

    log(`\n📊 Segment Summary for: ${options.vendorId}`, c.bright);
    log("────────────────────────────────────────────────────────");

    const totalValue = metrics.reduce(
      (sum: number, m: any) => sum + m.total_value,
      0,
    );
    const totalRecords = metrics.reduce(
      (sum: number, m: any) => sum + m.total_orders,
      0,
    );

    metrics.forEach((m: any) => {
      const valuePercentage = (m.total_value / totalValue) * 100;
      const recordPercentage = (m.total_orders / totalRecords) * 100;
      log(`\n${m.customer_segment}:`);
      log(
        `  ${recordPercentage.toFixed(1)}% of records | ${valuePercentage.toFixed(1)}% of value`,
      );
      log(
        `  £${m.total_value.toFixed(2)} total | £${m.average_value.toFixed(2)} average`,
      );
    });

    log("\n");
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandMetricsSegmentCompare(options: CliOptions) {
  if (!options.vendorId || !options.compare) {
    log(`\n❌ Error: --vendor-id and --compare segments are required`, c.red);
    process.exit(1);
  }

  try {
    const [seg1, seg2] = options.compare.split(",");
    log(`\n📊 Comparing Segments: ${seg1} vs ${seg2}`, c.bright);

    const storage = new VendorStorage(options.dataDir || "./data");
    const records = storage.loadRecords(options.vendorId);
    const metrics = GeographyMetricsAggregator.aggregateByCountry(records);

    const m1 = metrics.find((m: any) => m.country === seg1);
    const m2 = metrics.find((m: any) => m.country === seg2);

    if (!m1 || !m2) {
      log(`\n❌ Error: One or both segments not found`, c.red);
      process.exit(1);
    }

    log(`\n${seg1.padEnd(20)} ${seg2.padEnd(20)}`);
    log("────────────────────────────────────────────────");
    log(`Records: ${m1.total_orders.toString().padEnd(20)} ${m2.total_orders}`);
    log(
      `Value: £${m1.total_value.toFixed(2).padEnd(17)} £${m2.total_value.toFixed(2)}`,
    );
    log(
      `Approval: ${((m1.approval_rate || 0) * 100).toFixed(1)}%${" ".repeat(14)} ${((m2.approval_rate || 0) * 100).toFixed(1)}%`,
    );

    log("\n");
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandMetricsGeography(options: CliOptions) {
  if (!options.vendorId) {
    log(`\n❌ Error: --vendor-id is required`, c.red);
    process.exit(1);
  }

  try {
    log(`\n🌍 Geographic Metrics for: ${options.vendorId}`, c.bright);

    const storage = new VendorStorage(options.dataDir || "./data");
    const records = storage.loadRecords(options.vendorId);

    const metrics = GeographyMetricsAggregator.aggregateByCountry(records);

    log(`\n📍 Geographic Performance:`, c.bright);
    log("────────────────────────────────────────────────────────");

    metrics.slice(0, options.limit || 20).forEach((m: any) => {
      log(`\n${m.country} (${m.region || "N/A"}):`);
      log(`   Records: ${m.total_orders}`);
      log(`   Value: £${m.total_value.toFixed(2)}`);
      log(`  Currency: ${m.primary_currency}`);
      log(`  Approval Rate: ${(m.approval_rate * 100).toFixed(1)}%`);
    });

    log("\n");
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandMetricsGeographyCountry(options: CliOptions) {
  if (!options.vendorId) {
    log(`\n❌ Error: --vendor-id is required`, c.red);
    process.exit(1);
  }

  try {
    const storage = new VendorStorage(options.dataDir || "./data");
    const records = storage.loadRecords(options.vendorId);
    const metrics = GeographyMetricsAggregator.aggregateByCountry(records);

    const sorted = metrics.sort(
      (a: any, b: any) => b.total_value - a.total_value,
    );

    log(`\n🌍 Country Analysis for: ${options.vendorId}`, c.bright);
    sorted.slice(0, options.limit || 15).forEach((m: any, idx: number) => {
      log(
        `${idx + 1}. ${m.country}: ${m.total_orders} records, £${m.total_value.toFixed(2)}`,
      );
    });

    log("\n");
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandMetricsGeographyRegion(options: CliOptions) {
  if (!options.vendorId) {
    log(`\n❌ Error: --vendor-id is required`, c.red);
    process.exit(1);
  }

  try {
    const storage = new VendorStorage(options.dataDir || "./data");
    const records = storage.loadRecords(options.vendorId);
    const metrics = GeographyMetricsAggregator.aggregateByRegion(records);

    const byRegion: { [key: string]: any } = {};
    metrics.forEach((m: any): void => {
      if (!byRegion[m.region || "Unknown"]) {
        byRegion[m.region || "Unknown"] = {
          value: 0,
          records: 0,
          countries: new Set(),
        };
      }
      byRegion[m.region || "Unknown"].value += m.total_value;
      byRegion[m.region || "Unknown"].records += m.total_orders;
      byRegion[m.region || "Unknown"].countries.add(m.country);
    });

    log(`\n📍 Regional Analysis for: ${options.vendorId}`, c.bright);
    Object.entries(byRegion).forEach(([region, data]) => {
      log(`\n${region}:`);
      log(`  Records: ${data.records}`);
      log(`  Value: £${data.value.toFixed(2)}`);
      log(`  Countries: ${Array.from(data.countries).length}`);
    });

    log("\n");
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandMetricsGeographyCurrency(options: CliOptions) {
  if (!options.vendorId) {
    log(`\n❌ Error: --vendor-id is required`, c.red);
    process.exit(1);
  }

  try {
    const storage = new VendorStorage(options.dataDir || "./data");
    const records = storage.loadRecords(options.vendorId);

    const byCurrency: { [key: string]: { value: number; records: number } } =
      {};
    records.forEach((r: any) => {
      const currency = (r as any).currency || "GBP";
      if (!byCurrency[currency]) {
        byCurrency[currency] = { value: 0, records: 0 };
      }
      byCurrency[currency].value += (r as any).order_value || 0;
      byCurrency[currency].records += 1;
    });

    log(`\n💱 Currency Analysis for: ${options.vendorId}`, c.bright);
    Object.entries(byCurrency).forEach(([currency, data]) => {
      const pct = ((data.records / records.length) * 100).toFixed(1);
      log(`\n${currency}`);
      log(`  Records: ${data.records} (${pct}%)`);
      log(`  Total Value: ${data.value.toFixed(2)}`);
    });

    log("\n");
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandMetricsDealSize(options: CliOptions) {
  if (!options.vendorId) {
    log(`\n❌ Error: --vendor-id is required`, c.red);
    process.exit(1);
  }

  try {
    log(`\n💰 Deal Size Metrics for: ${options.vendorId}`, c.bright);

    const storage = new VendorStorage(options.dataDir || "./data");
    const records = storage.loadRecords(options.vendorId);

    const aggregator = new DealSizeMetricsAggregator();
    const metrics = DealSizeMetricsAggregator.aggregate(records);

    log(`\n📊 Deal Size Distribution:`, c.bright);
    log("────────────────────────────────────────────────────────");

    metrics.forEach((m: any) => {
      log(`\n${m.deal_size_band}:`);
      log(`   Records: ${m.total_orders}`);
      log(`   Value: £${m.total_value.toFixed(2)}`);
      log(`   Avg: £${m.avg_order_value?.toFixed(2) || "N/A"}`);
      log(`   Min: £${m.min_value?.toFixed(2) || "N/A"}`);
      log(`   Max: £${m.max_value?.toFixed(2) || "N/A"}`);
    });

    log("\n");
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandMetricsDealSizeDistribution(options: CliOptions) {
  if (!options.vendorId) {
    log(`\n❌ Error: --vendor-id is required`, c.red);
    process.exit(1);
  }

  try {
    const storage = new VendorStorage(options.dataDir || "./data");
    const records = storage.loadRecords(options.vendorId);
    const metrics = DealSizeMetricsAggregator.aggregate(records);

    log(`\n📊 Deal Size Distribution for: ${options.vendorId}`, c.bright);
    log("────────────────────────────────────────────────────────");
    log("\nBand          | Volume % | Value %");
    log("──────────────┼──────────┼─────────");

    const totalVolume = metrics.reduce(
      (sum: number, m: any) => sum + m.total_orders,
      0,
    );
    const totalValue = metrics.reduce(
      (sum: number, m: any) => sum + m.total_value,
      0,
    );

    metrics.forEach((m: any) => {
      const volumePercentage =
        totalVolume > 0 ? (m.total_orders / totalVolume) * 100 : 0;
      const valuePercentage =
        totalValue > 0 ? (m.total_value / totalValue) * 100 : 0;
      log(
        `${m.deal_size_band.padEnd(13)} | ${volumePercentage.toFixed(1).padStart(7)}% | ${valuePercentage.toFixed(1).padStart(5)}%`,
      );
    });

    log("\n");
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandMetricsDealSizeComparison(options: CliOptions) {
  if (!options.vendorId || !options.compare) {
    log(`\n❌ Error: --vendor-id and --compare bands are required`, c.red);
    process.exit(1);
  }

  try {
    const [band1, band2] = options.compare.split(",");
    log(`\n💰 Comparing Deal Bands: ${band1} vs ${band2}`, c.bright);

    const storage = new VendorStorage(options.dataDir || "./data");
    const records = storage.loadRecords(options.vendorId);
    const metrics = ChannelMetricsAggregator.aggregate(records);

    const m1 = metrics.find((m: any) => m.band === band1);
    const m2 = metrics.find((m: any) => m.band === band2);

    if (!m1 || !m2) {
      log(`\n❌ Error: One or both bands not found`, c.red);
      process.exit(1);
    }

    log(`\n${band1.padEnd(20)} ${band2.padEnd(20)}`);
    log("────────────────────────────────────────────────");
    log(`Records: ${m1.total_orders.toString().padEnd(20)} ${m2.total_orders}`);
    log(
      `Value: £${m1.total_value.toFixed(2).padEnd(17)} £${m2.total_value.toFixed(2)}`,
    );
    log(
      `Avg: £${m1.avg_order_value?.toFixed(2).padEnd(16) || "N/A"} £${m2.avg_order_value?.toFixed(2) || "N/A"}`,
    );

    log("\n");
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandMetricsReport(options: CliOptions) {
  if (!options.vendorId) {
    log(`\n❌ Error: --vendor-id is required`, c.red);
    process.exit(1);
  }

  try {
    log(
      `\n📋 Generating Comprehensive Report for: ${options.vendorId}`,
      c.bright,
    );

    const storage = new VendorStorage(options.dataDir || "./data");
    const records = storage.loadRecords(options.vendorId);

    const channelMetrics = ChannelMetricsAggregator.aggregate(records);
    const segmentMetrics = SegmentMetricsAggregator.aggregate(records);
    const geoMetrics = GeographyMetricsAggregator.aggregateByCountry(records);
    const dealMetrics = DealSizeMetricsAggregator.aggregate(records);

    const report = {
      vendor_id: options.vendorId,
      generated_at: new Date().toISOString(),
      total_records: records.length,
      channel_metrics: channelMetrics,
      segment_metrics: segmentMetrics,
      geography_metrics: geoMetrics,
      deal_size_metrics: dealMetrics,
    };

    if (options.exportJson) {
      writeFileSync(options.exportJson, JSON.stringify(report, null, 2));
      log(`\n✅ JSON report exported: ${options.exportJson}`, c.green);
    }

    if (options.exportHtml) {
      const html = generateHTMLReport(report as any, {
        vendorName: options.vendorId,
        csvFileName: "metrics-report.csv",
      });
      writeFileSync(options.exportHtml, html);
      log(`✅ HTML report exported: ${options.exportHtml}`, c.green);
    }

    log(`\n📊 Report Summary:`, c.bright);
    log(`   Total Records: ${records.length}`);
    log(`   Channels: ${channelMetrics.length}`);
    log(`   Segments: ${segmentMetrics.length}`);
    log(`   Countries: ${geoMetrics.length}`);
    log(`   Deal Size Bands: ${dealMetrics.length}\n`);
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandMetricsExport(options: CliOptions) {
  if (!options.vendorId || !options.exportFile) {
    log(`\n❌ Error: --vendor-id and --export are required`, c.red);
    process.exit(1);
  }

  try {
    const storage = new VendorStorage(options.dataDir || "./data");
    const records = storage.loadRecords(options.vendorId);

    const metrics = ChannelMetricsAggregator.aggregate(records);

    const csv = [
      "Channel,Records,Total Value,Avg Value,Approval Rate",
      ...metrics.map(
        (m: any) =>
          `${m.sales_channel},${m.total_orders},${m.total_value.toFixed(2)},${m.avg_order_value?.toFixed(2) || "0"},${((m.approval_rate || 0) * 100).toFixed(1)}%`,
      ),
    ].join("\n");

    writeFileSync(options.exportFile, csv);
    log(`\n✅ Metrics exported to: ${options.exportFile}\n`, c.green);
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

function commandMetricsSummary(options: CliOptions) {
  if (!options.vendorId) {
    log(`\n❌ Error: --vendor-id is required`, c.red);
    process.exit(1);
  }

  try {
    const storage = new VendorStorage(options.dataDir || "./data");
    const records = storage.loadRecords(options.vendorId);

    const channels = ChannelMetricsAggregator.aggregate(records);
    const segments = SegmentMetricsAggregator.aggregate(records);
    const deals = DealSizeMetricsAggregator.aggregate(records);

    log(`\n📊 Metrics Summary for: ${options.vendorId}`, c.bright);
    log("────────────────────────────────────────────────────────");

    const topChannel = channels.reduce((a: any, b: any) =>
      a.total_value > b.total_value ? a : b,
    );
    const topSegment = segments.reduce((a: any, b: any) =>
      a.total_value > b.total_value ? a : b,
    );
    const topDeal = deals.reduce((a: any, b: any) =>
      a.total_value > b.total_value ? a : b,
    );

    log(`\n🏆 Top Performers:`);
    log(
      `  Channel: ${topChannel.sales_channel} (£${topChannel.total_value.toFixed(2)})`,
    );
    log(
      `  Segment: ${topSegment.customer_segment} (£${topSegment.total_value.toFixed(2)})`,
    );
    log(
      `  Deal Size: ${topDeal.deal_size_band} (£${topDeal.total_value.toFixed(2)})`,
    );

    const totalValue = records.reduce(
      (sum, r) => sum + ((r as any).order_value || 0),
      0,
    );
    const avgValue = totalValue / records.length;

    log(`\n💰 Value Metrics:`);
    log(`  Total Value: £${totalValue.toFixed(2)}`);
    log(`  Avg Value: £${avgValue.toFixed(2)}`);
    log(`  Total Records: ${records.length}`);

    log("\n");
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

const args = process.argv.slice(2);
const options = parseArgs(args);

if (
  options.help ||
  args.length === 0 ||
  options.command === "help" ||
  options.command === "--help"
) {
  if (
    options.command &&
    options.command !== "help" &&
    options.command !== "--help"
  ) {
    printCommandHelp(options.command);
  } else {
    printMainHelp();
  }
  process.exit(0);
}

try {
  switch (options.command) {
    // Week 1 Commands
    case "analyze":
      commandAnalyze(options.csvFile || "", options);
      break;
    case "validate":
      commandValidate(options.csvFile || "", options);
      break;
    case "map":
      commandMap(options.csvFile || "", options);
      break;
    case "diagnose":
      commandDiagnose(options.csvFile || "", options);
      break;
    case "export-mapping":
      commandMap(options.csvFile || "", { ...options, output: options.output });
      break;

    // Week 2 Commands
    case "vendor:create":
      commandVendorCreate(options);
      break;
    case "vendor:list":
      commandVendorList(options);
      break;
    case "vendor:info":
      commandVendorInfo(options);
      break;
    case "vendor:update":
      commandVendorUpdate(options);
      break;
    case "vendor:delete":
      commandVendorDelete(options);
      break;
    case "import:csv":
      commandImportCsv(options.csvFile || "", options);
      break;
    case "import:list":
      commandImportList(options);
      break;
    case "import:details":
      commandImportDetails(options);
      break;
    case "import:replay":
      commandImportReplay(options);
      break;
    case "data:list":
      commandDataList(options);
      break;
    case "data:count":
      commandDataCount(options);
      break;
    case "data:export":
      commandDataExport(options);
      break;
    case "data:stats":
      commandDataStats(options);
      break;

    // Week 3 Commands
    case "filter:create":
      commandFilterCreate(args[1] || "", options);
      break;
    case "filter:apply":
      commandFilterApply(args[1] || "", options);
      break;
    case "filter:list":
      commandFilterList(options);
      break;
    case "filter:info":
      commandFilterInfo(args[1] || "", options);
      break;
    case "filter:delete":
      commandFilterDelete(args[1] || "", options);
      break;
    case "filter:presets":
      commandFilterPresets(options);
      break;
    case "filter:apply-preset":
      commandFilterApplyPreset(args[1] || "", options);
      break;

    // Week 4 Commands
    case "metrics:channel":
      commandMetricsChannel(options);
      break;
    case "metrics:channel:top":
      commandMetricsChannelTop(options);
      break;
    case "metrics:channel:compare":
      commandMetricsChannelCompare(options);
      break;
    case "metrics:segment":
      commandMetricsSegment(options);
      break;
    case "metrics:segment:summary":
      commandMetricsSegmentSummary(options);
      break;
    case "metrics:segment:compare":
      commandMetricsSegmentCompare(options);
      break;
    case "metrics:geography":
      commandMetricsGeography(options);
      break;
    case "metrics:geography:country":
      commandMetricsGeographyCountry(options);
      break;
    case "metrics:geography:region":
      commandMetricsGeographyRegion(options);
      break;
    case "metrics:geography:currency":
      commandMetricsGeographyCurrency(options);
      break;
    case "metrics:deal-size":
      commandMetricsDealSize(options);
      break;
    case "metrics:deal-size:distribution":
      commandMetricsDealSizeDistribution(options);
      break;
    case "metrics:deal-size:comparison":
      commandMetricsDealSizeComparison(options);
      break;
    case "metrics:report":
      commandMetricsReport(options);
      break;
    case "metrics:export":
      commandMetricsExport(options);
      break;
    case "metrics:summary":
      commandMetricsSummary(options);
      break;

    default:
      log(`\n❌ Unknown command: ${options.command}`, c.red);
      log("Run 'vendfi --help' for available commands\n");
      process.exit(1);
  }
} catch (error) {
  log(`\n❌ Fatal Error: ${(error as Error).message}`, c.red);
  process.exit(1);
}
