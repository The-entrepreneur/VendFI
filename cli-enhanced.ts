#!/usr/bin/env node
// cli-enhanced.ts - Enhanced CLI with diagnostics, validation, and interactive features

import { readFileSync, writeFileSync, existsSync } from "fs";
import { basename } from "path";
import {
  EnhancedCSVProcessor,
  ProcessorConfig,
} from "./src/core/processor-enhanced";

import { generateHTMLReport } from "./src/reports/html-generator";

// Colors
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
    "\n╔════════════════════════════════════════════════════════════════╗",
    c.cyan,
  );
  log(
    "║         VendFI Analytics CLI v2.0 (Enhanced)                  ║",
    c.cyan,
  );
  log(
    "║         Robust CSV Processing with Advanced Diagnostics       ║",
    c.cyan,
  );
  log(
    "╚════════════════════════════════════════════════════════════════╝\n",
    c.cyan,
  );
}

function printUsage() {
  log("Usage:", c.bright);
  log("  vendfi analyze <csv-file> [options]", c.cyan);
  log("  vendfi validate <csv-file>            Validate CSV quality", c.cyan);
  log("  vendfi map <csv-file>                 Show inferred mapping", c.cyan);
  log("  vendfi diagnose <csv-file>            Full diagnostic report", c.cyan);
  log("  vendfi export-mapping <csv-file>      Export mapping to JSON", c.cyan);
  log("  vendfi help                           Show this help", c.cyan);

  log("\nOptions:", c.bright);
  log(
    "  -o, --output <file>         Output HTML report file (default: report.html)",
  );
  log("  -j, --json <file>           Also save JSON report");
  log("  -v, --vendor-id <id>        Vendor ID (default: vendor-001)");
  log("  -f, --finance-only          Assume all rows are financed");
  log("  -m, --mapping <file>        Use custom mapping JSON file");
  log("  --date-from <date>          Filter from date (YYYY-MM-DD)");
  log("  --date-to <date>            Filter to date (YYYY-MM-DD)");
  log("  --max-errors <n>            Stop after N errors (default: unlimited)");
  log("  --continue-on-error         Continue processing even with errors");
  log("  --allow-duplicates          Allow duplicate order IDs");
  log(
    "  --confidence <n>            Min mapping confidence 0-1 (default: 0.6)",
  );
  log("  --cache-key <key>           Cache key for mapping reuse");

  log("\nExamples:", c.bright);
  log("  # Full analysis with diagnostics", c.cyan);
  log("  vendfi analyze vendor-export.csv");

  log("\n  # Validate data quality before processing", c.cyan);
  log("  vendfi validate messy-export.csv");

  log("\n  # Diagnose issues with detailed report", c.cyan);
  log("  vendfi diagnose problematic-export.csv");

  log("\n  # Save and reuse mapping", c.cyan);
  log("  vendfi export-mapping vendor-export.csv -o mapping.json");
  log("  vendfi analyze new-export.csv -m mapping.json");

  log("\n  # Continue processing despite errors", c.cyan);
  log(
    "  vendfi analyze partial-data.csv --continue-on-error --max-errors 100\n",
  );
}

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
    maxErrors: undefined,
    continueOnError: true,
    allowDuplicates: false,
    confidence: 0.6,
    cacheKey: null,
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
    } else if (arg === "--max-errors") {
      options.maxErrors = parseInt(args[++i]);
    } else if (arg === "--continue-on-error") {
      options.continueOnError = true;
    } else if (arg === "--allow-duplicates") {
      options.allowDuplicates = true;
    } else if (arg === "--confidence") {
      options.confidence = parseFloat(args[++i]);
    } else if (arg === "--cache-key") {
      options.cacheKey = args[++i];
    }
  }

  return options;
}

// Command: Validate CSV quality
function commandValidate(csvFile: string, options: any) {
  log(`\n🔍 Validating CSV: ${basename(csvFile)}`, c.bright);

  if (!existsSync(csvFile)) {
    log(`❌ Error: File not found: ${csvFile}`, c.red);
    process.exit(1);
  }

  const csvContent = readFileSync(csvFile, "utf-8");

  const config: ProcessorConfig = {
    vendorId: options.vendorId,
    parseOptions: {
      assumeFinanceSelected: options.financeOnly,
      continueOnError: true,
      maxErrors: undefined,
      allowDuplicateOrderIds: options.allowDuplicates,
    },
    mappingConfidenceThreshold: options.confidence,
    cacheKey: options.cacheKey,
  };

  const processor = new EnhancedCSVProcessor(config);
  processor.loadFromString(csvContent);

  log(`\n📊 CSV Structure:`, c.bright);
  const headers = processor.getHeaders();
  log(`   Columns: ${headers.length}`, c.cyan);
  log(`   Rows: ${csvContent.split("\n").length - 1}`, c.cyan);

  log(`\n🤖 Analyzing field mappings...`, c.cyan);
  const { inference, validation, source } = processor.inferOrLoadMapping();

  log(`\n📋 Mapping Quality:`, c.bright);
  log(`   Source: ${source}`, source === "cached" ? c.green : c.yellow);
  log(
    `   Confidence: ${(inference.confidence * 100).toFixed(1)}%`,
    inference.confidence > 0.8
      ? c.green
      : inference.confidence > 0.6
        ? c.yellow
        : c.red,
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
  try {
    const importResult = processor.import();

    log(`\n✅ Import Results:`, c.bright);
    log(`   Total Rows: ${importResult.total_rows}`);
    log(`   ✅ Successful: ${importResult.successfully_normalized}`, c.green);
    log(
      `   ❌ Failed: ${importResult.failed_rows}`,
      importResult.failed_rows > 0 ? c.red : c.dim,
    );
    log(`   ⏭️  Skipped: ${importResult.statistics.skippedRows}`, c.dim);
    log(`   📊 Empty: ${importResult.statistics.emptyRows}`, c.dim);

    if (importResult.statistics.duplicateOrderIds > 0) {
      log(
        `   ⚠️  Duplicates: ${importResult.statistics.duplicateOrderIds}`,
        c.yellow,
      );
    }

    // Data quality score
    const successRate =
      importResult.successfully_normalized / importResult.total_rows;
    log(
      `\n📈 Data Quality Score: ${(successRate * 100).toFixed(1)}%`,
      successRate > 0.9 ? c.green : successRate > 0.7 ? c.yellow : c.red,
    );

    // Show first few errors
    if (importResult.errors.length > 0) {
      log(`\n⚠️  Sample Errors (first 5):`, c.yellow);
      importResult.errors.slice(0, 5).forEach((err) => {
        log(`   Row ${err.row_number}: ${err.error}`, c.yellow);
      });

      if (importResult.errors.length > 5) {
        log(`   ... and ${importResult.errors.length - 5} more`, c.dim);
      }
    }

    // Show warnings
    if (importResult.warnings.length > 0) {
      log(`\n💡 Warnings (first 3):`, c.cyan);
      importResult.warnings.slice(0, 3).forEach((warn) => {
        log(
          `   Row ${warn.row_number} [${warn.field}]: ${warn.message}`,
          c.cyan,
        );
      });

      if (importResult.warnings.length > 3) {
        log(`   ... and ${importResult.warnings.length - 3} more`, c.dim);
      }
    }

    // Recommendations
    log(`\n💡 Recommendations:`, c.bright);
    if (successRate < 0.9) {
      log(
        `   • ${((1 - successRate) * 100).toFixed(1)}% of rows failed - review CSV export settings`,
        c.yellow,
      );
    }
    if (importResult.statistics.duplicateOrderIds > 0) {
      log(
        `   • Found duplicate order IDs - ensure unique transaction IDs`,
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
    log(`\n❌ Import Failed: ${(error as Error).message}`, c.red);
    process.exit(1);
  }
}

// Command: Full diagnostic report
function commandDiagnose(csvFile: string, options: any) {
  log(`\n🔬 Running full diagnostics: ${basename(csvFile)}`, c.bright);

  if (!existsSync(csvFile)) {
    log(`❌ Error: File not found: ${csvFile}`, c.red);
    process.exit(1);
  }

  const csvContent = readFileSync(csvFile, "utf-8");

  const config: ProcessorConfig = {
    vendorId: options.vendorId,
    parseOptions: {
      assumeFinanceSelected: options.financeOnly,
      continueOnError: options.continueOnError,
      maxErrors: options.maxErrors,
      allowDuplicateOrderIds: options.allowDuplicates,
    },
    mappingConfidenceThreshold: options.confidence,
    cacheKey: options.cacheKey,
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
  log(`   Throughput: ${perf.rowsPerSecond.toLocaleString()} rows/sec`, c.cyan);

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
      if (issue.affectedRows) {
        log(`      Affected: ${issue.affectedRows} rows`, c.dim);
      }
    });
  }

  if (result.recommendations.length > 0) {
    log(`\n💡 Recommendations:`, c.bright);
    result.recommendations.forEach((rec, i) => {
      log(`   ${i + 1}. ${rec}`, c.cyan);
    });
  }

  log(`\n═══════════════════════════════════════════════════════════════\n`);

  // Offer to continue with analysis if successful
  if (result.success && result.report) {
    log(`✅ Diagnostics complete. Data quality is sufficient.`, c.green);
    log(
      `Would you like to generate the full HTML report? (This was a diagnostic run)\n`,
      c.cyan,
    );
  }
}

// Command: Export mapping
function commandExportMapping(csvFile: string, options: any) {
  log(`\n💾 Exporting mapping configuration: ${basename(csvFile)}`, c.bright);

  if (!existsSync(csvFile)) {
    log(`❌ Error: File not found: ${csvFile}`, c.red);
    process.exit(1);
  }

  const csvContent = readFileSync(csvFile, "utf-8");

  const config: ProcessorConfig = {
    vendorId: options.vendorId,
    mappingConfidenceThreshold: options.confidence,
  };

  const processor = new EnhancedCSVProcessor(config);
  processor.loadFromString(csvContent);

  const { inference, validation } = processor.inferOrLoadMapping();

  if (!validation.valid) {
    log(`\n❌ Cannot export invalid mapping`, c.red);
    log(`Missing required fields: ${validation.missing.join(", ")}`, c.red);
    process.exit(1);
  }

  const savedMapping = processor.exportMapping();
  const outputFile = options.output || `mapping-${options.vendorId}.json`;

  writeFileSync(outputFile, JSON.stringify(savedMapping, null, 2));

  log(`\n✅ Mapping exported to: ${outputFile}`, c.green);
  log(`   Confidence: ${(savedMapping.confidence * 100).toFixed(1)}%`, c.cyan);
  log(`   Fields mapped: ${Object.keys(savedMapping.mapping).length}`, c.cyan);
  log(`\nUse this mapping with: vendfi analyze file.csv -m ${outputFile}\n`);
}

// Enhanced analyze command with diagnostics
function commandAnalyze(options: any) {
  log(`\n🔍 Analyzing: ${basename(options.file)}`, c.bright);

  if (!existsSync(options.file)) {
    log(`❌ Error: File not found: ${options.file}`, c.red);
    process.exit(1);
  }

  const csvContent = readFileSync(options.file, "utf-8");

  const config: ProcessorConfig = {
    vendorId: options.vendorId,
    parseOptions: {
      assumeFinanceSelected: options.financeOnly,
      continueOnError: options.continueOnError,
      maxErrors: options.maxErrors,
      allowDuplicateOrderIds: options.allowDuplicates,
    },
    mappingConfidenceThreshold: options.confidence,
    cacheKey: options.cacheKey || options.vendorId,
  };

  const processor = new EnhancedCSVProcessor(config);
  processor.loadFromString(csvContent);

  // Handle mapping
  if (options.mapping) {
    log(`📂 Loading custom mapping: ${options.mapping}`, c.cyan);
    const mappingJson = JSON.parse(readFileSync(options.mapping, "utf-8"));
    processor.setMapping(mappingJson.mapping || mappingJson);
  } else {
    log(`🤖 Auto-inferring field mapping...`, c.cyan);
  }

  // Process with diagnostics
  const result = processor.process(options.dateFrom, options.dateTo);

  if (!result.success) {
    log(`\n❌ Processing failed!`, c.red);
    log(`Error: ${result.importResult.errors[0]?.error}`, c.red);
    log(
      `\nRun diagnostics for more details: vendfi diagnose ${options.file}\n`,
      c.yellow,
    );
    process.exit(1);
  }

  // Show brief summary
  const ir = result.importResult;
  log(`\n📊 Import Summary:`, c.bright);
  log(
    `   ✅ Processed: ${ir.successfully_normalized} / ${ir.total_rows} rows`,
    c.green,
  );
  if (ir.failed_rows > 0) {
    log(`   ⚠️  Failed: ${ir.failed_rows} rows`, c.yellow);
  }
  log(
    `   ⚡ Performance: ${ir.statistics.rowsPerSecond.toLocaleString()} rows/sec`,
    c.cyan,
  );
  log(
    `   📈 Data Quality: ${(result.diagnostics.dataQuality.accuracy * 100).toFixed(1)}%`,
    result.diagnostics.dataQuality.accuracy > 0.85 ? c.green : c.yellow,
  );

  // Generate HTML report
  log(`\n📝 Generating HTML report...`, c.cyan);
  const html = generateHTMLReport(result.report!, {
    vendorName: options.vendorId,
    csvFileName: basename(options.file),
  });
  writeFileSync(options.output, html);
  log(`✅ HTML report saved: ${options.output}`, c.green);

  // Save JSON if requested
  if (options.json) {
    writeFileSync(options.json, JSON.stringify(result.report, null, 2));
    log(`✅ JSON report saved: ${options.json}`, c.green);
  }

  // Show recommendations
  if (result.recommendations.length > 0) {
    log(`\n💡 Recommendations:`, c.bright);
    result.recommendations.forEach((rec, i) => {
      log(`   ${i + 1}. ${rec}`, c.cyan);
    });
  }

  log(
    `\n🎉 Analysis complete! Open ${options.output} in your browser.\n`,
    c.bright,
  );
}

// Main
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
    if (options.command === "validate") {
      if (!options.file) {
        log("❌ Error: CSV file required", c.red);
        process.exit(1);
      }
      commandValidate(options.file, options);
    } else if (options.command === "diagnose") {
      if (!options.file) {
        log("❌ Error: CSV file required", c.red);
        process.exit(1);
      }
      commandDiagnose(options.file, options);
    } else if (options.command === "export-mapping") {
      if (!options.file) {
        log("❌ Error: CSV file required", c.red);
        process.exit(1);
      }
      commandExportMapping(options.file, options);
    } else if (options.command === "analyze") {
      if (!options.file) {
        log("❌ Error: CSV file required", c.red);
        process.exit(1);
      }
      commandAnalyze(options);
    } else if (options.command === "map") {
      if (!options.file) {
        log("❌ Error: CSV file required", c.red);
        process.exit(1);
      }
      // Use original map command from basic CLI
      commandValidate(options.file, options);
    } else {
      log(`❌ Unknown command: ${options.command}`, c.red);
      log('Run "vendfi help" for usage information\n', c.yellow);
      process.exit(1);
    }
  } catch (error) {
    log(`\n❌ Error: ${(error as Error).message}`, c.red);
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
}

main();
