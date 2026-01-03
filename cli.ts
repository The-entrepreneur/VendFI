#!/usr/bin/env node
// cli.ts - Main CLI entry point

import { readFileSync, writeFileSync, existsSync } from "fs";
import { basename } from "path";
import { CSVProcessor, FieldMapping } from "./src/index";
import { generateHTMLReport } from "./src/reports/html-generator";

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function printBanner() {
  log(
    "\n╔════════════════════════════════════════════════════════════╗",
    colors.cyan,
  );
  log(
    "║         Vendor Finance Analytics CLI v1.0                 ║",
    colors.cyan,
  );
  log(
    "║         CSV Processing Engine for Embedded Finance        ║",
    colors.cyan,
  );
  log(
    "╚════════════════════════════════════════════════════════════╝\n",
    colors.cyan,
  );
}

function printUsage() {
  log("Usage:", colors.bright);
  log("  vendfi analyze <csv-file> [options]", colors.cyan);
  log(
    "  vendfi map <csv-file>                Show inferred mapping",
    colors.cyan,
  );
  log("  vendfi help                          Show this help", colors.cyan);

  log("\nOptions:", colors.bright);
  log(
    "  -o, --output <file>       Output HTML report file (default: report.html)",
  );
  log("  -j, --json <file>         Also save JSON report");
  log("  -v, --vendor-id <id>      Vendor ID (default: vendor-001)");
  log(
    "  -f, --finance-only        Assume all rows are financed (for provider exports)",
  );
  log("  -m, --mapping <file>      Use custom mapping JSON file");
  log("  --date-from <date>        Filter from date (YYYY-MM-DD)");
  log("  --date-to <date>          Filter to date (YYYY-MM-DD)");

  log("\nExamples:", colors.bright);
  log("  # Analyze with auto-inference", colors.cyan);
  log("  vendfi analyze vendor-export.csv");

  log("\n  # Analyze finance-only export", colors.cyan);
  log("  vendfi analyze propel-export.csv --finance-only");

  log("\n  # Save to custom location with JSON", colors.cyan);
  log(
    "  vendfi analyze data.csv -o reports/nov-2024.html -j reports/nov-2024.json",
  );

  log("\n  # Check mapping before processing", colors.cyan);
  log("  vendfi map messy-export.csv\n");
}

// Parse command line arguments
function parseArgs(args: string[]): any {
  const options: any = {
    command: args[0] || "help",
    file: args[1] || "",
    output: "report.html",
    vendorId: "vendor-001",
    financeOnly: false,
    json: null,
    mapping: null,
    dateFrom: null,
    dateTo: null,
  };

  for (let i = 2; i < args.length; i++) {
    const arg = args[i];

    if (arg === "-o" || arg === "--output") {
      options.output = args[++i];
    } else if (arg === "-j" || arg === "--json") {
      options.json = args[++i];
    } else if (arg === "-v" || arg === "--vendor-id") {
      options.vendorId = args[++i];
    } else if (arg === "-f" || arg === "--finance-only") {
      options.financeOnly = true;
    } else if (arg === "-m" || arg === "--mapping") {
      options.mapping = args[++i];
    } else if (arg === "--date-from") {
      options.dateFrom = new Date(args[++i]);
    } else if (arg === "--date-to") {
      options.dateTo = new Date(args[++i]);
    }
  }

  return options;
}

// Command: Show inferred mapping
function commandMap(csvFile: string) {
  log(`\n📄 Analyzing CSV structure: ${basename(csvFile)}`, colors.bright);

  if (!existsSync(csvFile)) {
    log(`❌ Error: File not found: ${csvFile}`, colors.red);
    process.exit(1);
  }

  const csvContent = readFileSync(csvFile, "utf-8");
  const processor = new CSVProcessor("temp");
  processor.loadFromString(csvContent);

  const headers = processor.getHeaders();
  log(`\n📋 Found ${headers.length} columns:`, colors.cyan);
  headers.forEach((h, i) => log(`  ${i + 1}. ${h}`));

  const { inference, validation } = processor.inferMapping();

  log(`\n🤖 Auto-Inferred Mapping:`, colors.bright);
  log(
    `   Confidence: ${(inference.confidence * 100).toFixed(1)}%`,
    inference.confidence > 0.8 ? colors.green : colors.yellow,
  );
  log(
    `   Validation: ${validation.valid ? "✅ Valid" : "❌ Invalid"}`,
    validation.valid ? colors.green : colors.red,
  );

  if (!validation.valid) {
    log(`\n❌ Missing required fields:`, colors.red);
    validation.missing.forEach((f) => log(`   - ${f}`));
  }

  log(`\n📊 Field Mappings:`, colors.bright);
  const mappingEntries = Object.entries(inference.suggested_mapping);
  if (mappingEntries.length === 0) {
    log("   (No mappings inferred)", colors.yellow);
  } else {
    mappingEntries.forEach(([canonical, source]) => {
      log(`   ${canonical.padEnd(30)} ← "${source}"`, colors.cyan);
    });
  }

  if (inference.unmapped_canonical_fields.length > 0) {
    log(`\n⚠️  Unmapped canonical fields:`, colors.yellow);
    inference.unmapped_canonical_fields.forEach((f) => log(`   - ${f}`));
  }

  if (inference.unmapped_source_columns.length > 0) {
    log(`\n📌 Unmapped source columns (will be ignored):`, colors.yellow);
    inference.unmapped_source_columns.forEach((c) => log(`   - ${c}`));
  }

  log(
    "\n💡 Tip: If mapping looks wrong, create a manual mapping JSON file:",
    colors.cyan,
  );
  log("   {");
  log('     "order_id": "Deal ID",');
  log('     "order_date": "Date",');
  log('     "product_name": "Item"');
  log("   }");
  log("   Then use: vendfi analyze file.csv -m mapping.json\n");
}

// Command: Analyze CSV and generate report
function commandAnalyze(options: any) {
  log(`\n🔍 Analyzing: ${basename(options.file)}`, colors.bright);

  if (!existsSync(options.file)) {
    log(`❌ Error: File not found: ${options.file}`, colors.red);
    process.exit(1);
  }

  // Load CSV
  const csvContent = readFileSync(options.file, "utf-8");
  const processor = new CSVProcessor(options.vendorId);
  processor.loadFromString(csvContent);

  // Handle mapping
  if (options.mapping) {
    if (!existsSync(options.mapping)) {
      log(`❌ Error: Mapping file not found: ${options.mapping}`, colors.red);
      process.exit(1);
    }
    log(`📂 Loading custom mapping: ${options.mapping}`, colors.cyan);
    const mappingJson = JSON.parse(readFileSync(options.mapping, "utf-8"));
    processor.setMapping(mappingJson);
  } else {
    log(`🤖 Auto-inferring field mapping...`, colors.cyan);
    const { inference, validation } = processor.inferMapping();

    if (!validation.valid) {
      log(`❌ Mapping validation failed!`, colors.red);
      log(
        `Missing required fields: ${validation.missing.join(", ")}`,
        colors.red,
      );
      log(
        `\nTip: Use "vendfi map ${options.file}" to see detailed mapping info`,
        colors.yellow,
      );
      process.exit(1);
    }

    log(
      `✅ Mapping inferred (${(inference.confidence * 100).toFixed(1)}% confidence)`,
      colors.green,
    );
  }

  // Import data
  log(`📥 Importing and normalizing data...`, colors.cyan);
  const importResult = processor.import({
    assumeFinanceSelected: options.financeOnly,
  });

  log(`\n📊 Import Results:`, colors.bright);
  log(`   Total Rows: ${importResult.total_rows}`);
  log(
    `   ✅ Successfully Processed: ${importResult.successfully_normalized}`,
    colors.green,
  );
  if (importResult.failed_rows > 0) {
    log(`   ❌ Failed: ${importResult.failed_rows}`, colors.red);
    if (importResult.errors.length > 0) {
      log(`\n   First few errors:`, colors.yellow);
      importResult.errors.slice(0, 3).forEach((err) => {
        log(`   - Row ${err.row_number}: ${err.error}`, colors.yellow);
      });
    }
  }

  if (importResult.successfully_normalized === 0) {
    log(`\n❌ No valid records to analyze!`, colors.red);
    process.exit(1);
  }

  // Generate analytics
  log(`\n📈 Computing analytics...`, colors.cyan);
  const report = processor.generateReport(options.dateFrom, options.dateTo);

  // Display summary
  displayReportSummary(report);

  // Generate HTML
  log(`\n📝 Generating HTML report...`, colors.cyan);
  const html = generateHTMLReport(report, {
    vendorName: options.vendorId,
    csvFileName: basename(options.file),
  });
  writeFileSync(options.output, html);
  log(`✅ HTML report saved: ${options.output}`, colors.green);

  // Save JSON if requested
  if (options.json) {
    writeFileSync(options.json, JSON.stringify(report, null, 2));
    log(`✅ JSON report saved: ${options.json}`, colors.green);
  }

  log(
    `\n🎉 Analysis complete! Open ${options.output} in your browser.\n`,
    colors.bright,
  );
}

// Display quick summary in terminal
function displayReportSummary(report: any) {
  const g = report.global_metrics;

  log(
    `\n═══════════════════════════════════════════════════════════`,
    colors.bright,
  );
  log(`  QUICK SUMMARY`, colors.bright);
  log(
    `═══════════════════════════════════════════════════════════`,
    colors.bright,
  );

  log(
    `\n📅 Date Range: ${g.date_range.from.toISOString().split("T")[0]} to ${g.date_range.to.toISOString().split("T")[0]}`,
  );

  log(`\n💰 Orders & Revenue:`, colors.bright);
  log(`   Total Orders: ${g.total_orders}`);
  log(`   Financed Orders: ${g.financed_orders}`);
  log(`   Cash Orders: ${g.cash_orders}`);

  log(`\n📊 Key Metrics:`, colors.bright);
  const attachmentColor =
    (g.attachment_rate || 0) > 0.5 ? colors.green : colors.yellow;
  const approvalColor =
    (g.approval_rate || 0) > 0.75 ? colors.green : colors.yellow;
  log(
    `   Finance Attachment Rate: ${formatPercent(g.attachment_rate)}`,
    attachmentColor,
  );
  log(
    `   Finance Approval Rate: ${formatPercent(g.approval_rate)}`,
    approvalColor,
  );
  log(
    `   Avg Order Value (Overall): ${formatCurrency(g.avg_order_value_overall)}`,
  );
  log(
    `   Avg Order Value (Finance): ${formatCurrency(g.avg_order_value_finance)}`,
  );

  if (report.product_metrics.length > 0) {
    log(`\n🏆 Top 3 Products by Finance Volume:`, colors.bright);
    report.product_metrics.slice(0, 3).forEach((p: any, i: number) => {
      log(
        `   ${i + 1}. ${p.product_name} (${p.financed_orders} financed, ${formatPercent(p.approval_rate)} approved)`,
        colors.cyan,
      );
    });
  }

  if (report.term_metrics.length > 0) {
    log(`\n📆 Most Popular Term:`, colors.bright);
    const topTerm = report.term_metrics[0];
    log(
      `   ${topTerm.term_months} months (${topTerm.applications} applications, ${formatPercent(topTerm.approval_rate)} approved)`,
      colors.cyan,
    );
  }

  if (report.friction_hotspots.length > 0) {
    log(
      `\n⚠️  Friction Hotspots (High Interest, Low Approval):`,
      colors.yellow,
    );
    report.friction_hotspots.slice(0, 3).forEach((p: any) => {
      log(
        `   - ${p.product_name}: ${formatPercent(p.attachment_rate)} attachment, ${formatPercent(p.approval_rate)} approval`,
      );
    });
  }

  log(`\n═══════════════════════════════════════════════════════════\n`);
}

function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return "N/A";
  return (value * 100).toFixed(1) + "%";
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "N/A";
  return "£" + value.toFixed(2);
}

// Main CLI entry point
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "help" || args[0] === "--help") {
    printBanner();
    printUsage();
    return;
  }

  const options = parseArgs(args);

  printBanner();

  try {
    if (options.command === "map") {
      if (!options.file) {
        log("❌ Error: CSV file required", colors.red);
        log("Usage: vendfi map <csv-file>\n", colors.yellow);
        process.exit(1);
      }
      commandMap(options.file);
    } else if (options.command === "analyze") {
      if (!options.file) {
        log("❌ Error: CSV file required", colors.red);
        log("Usage: vendfi analyze <csv-file> [options]\n", colors.yellow);
        process.exit(1);
      }
      commandAnalyze(options);
    } else {
      log(`❌ Unknown command: ${options.command}`, colors.red);
      log('Run "vendfi help" for usage information\n', colors.yellow);
      process.exit(1);
    }
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, colors.red);
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
}

// Run CLI
main();
