# VendFI CLI Setup Guide

## Overview

This guide provides step-by-step instructions for setting up the VendFI CLI tool on your system. The CLI is available in two versions:
1. **Basic CLI** (`cli.ts`) - Simple CSV processing
2. **Enhanced CLI** (`cli-enhanced.ts`) - Production-ready with advanced features

## Prerequisites

### System Requirements
- **Node.js**: Version 16 or higher
- **npm**: Version 8 or higher (comes with Node.js)
- **TypeScript**: Version 5.3.3 or higher (installed automatically)
- **Memory**: At least 2GB RAM (4GB recommended for large files)

### Verify Prerequisites
```bash
# Check Node.js version
node --version  # Should show v16.x or higher

# Check npm version
npm --version   # Should show v8.x or higher

# Check TypeScript (will be installed if missing)
npx tsc --version
```

## Installation Methods

### Method 1: Development Setup (Recommended for Contributors)

1. **Clone or Download the Project**
```bash
# Navigate to your projects directory
cd ~/projects  # or your preferred location

# Clone the repository (if using Git)
git clone <repository-url>
cd VendFI/processor-core

# OR if you already have the files
cd /path/to/VendFI/processor-core
```

2. **Install Dependencies**
```bash
npm install
```

3. **Build TypeScript**
```bash
npm run build
```

4. **Test the Setup**
```bash
# Test basic CLI
npx ts-node cli.ts --help

# Test enhanced CLI
npx ts-node cli-enhanced.ts --help

# Test with built version
node dist/cli-enhanced.js --help
```

### Method 2: Global Installation (For Regular Users)

1. **Navigate to Project Directory**
```bash
cd /path/to/VendFI/processor-core
```

2. **Complete Setup**
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Install globally
npm link
```

3. **Verify Global Installation**
```bash
# Should show help menu
vendfi --help

# Should show enhanced CLI version
vendfi analyze --help
```

### Method 3: Quick Start (For Testing)

```bash
# One-liner setup
cd /path/to/VendFI/processor-core && npm install && npm run build

# Use without global installation
node dist/cli-enhanced.js analyze sample.csv

# Or use ts-node directly
npx ts-node cli-enhanced.ts analyze sample.csv
```

## Platform-Specific Instructions

### Windows Setup

1. **Using PowerShell (Recommended)**
```powershell
# Navigate to project
cd "C:\Users\YourUser\Documents\VendFI\processor-core"

# Install and build
npm install
npm run build

# Link globally
npm link

# If 'vendfi' not recognized, check PATH
$env:Path -split ';' | Select-String npm

# Alternative: Add to PATH manually
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";$env:APPDATA\npm", "User")
```

2. **Using Command Prompt**
```cmd
cd "C:\Users\YourUser\Documents\VendFI\processor-core"
npm install
npm run build
npm link

# Restart CMD after linking
```

### macOS/Linux Setup

```bash
# Navigate to project
cd ~/projects/VendFI/processor-core

# Install dependencies
npm install

# Build TypeScript
npm run build

# Install globally
sudo npm link  # May need sudo for global installation

# Alternative without sudo (local user install)
npm link
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

## Verification Steps

### Step 1: Check Installation
```bash
# Method A: Direct test
npx ts-node cli-enhanced.ts --help

# Method B: Built version test
node dist/cli-enhanced.js --help

# Method C: Global installation test
vendfi --help
```

### Step 2: Test with Sample Data
```bash
# Navigate to project directory
cd /path/to/VendFI/processor-core

# Test mapping with sample file
vendfi map test-data/vendor-ecommerce-export.csv

# Test analysis (will create report.html)
vendfi analyze test-data/vendor-ecommerce-export.csv -o test-report.html
```

### Step 3: Verify Output
Check that:
1. `report.html` (or `test-report.html`) is created
2. No error messages appear in console
3. Processing completes successfully

## Troubleshooting Common Issues

### Issue 1: "vendfi is not recognized"
**Symptoms**: Command not found error
**Solutions**:
```bash
# 1. Ensure build completed
npm run build

# 2. Relink
npm unlink -g
npm link

# 3. Restart terminal
# 4. Check PATH
echo $PATH  # Linux/Mac
echo %PATH% # Windows

# 5. Use absolute path
node "C:\Users\YourUser\AppData\Roaming\npm\node_modules\VendFI\dist\cli-enhanced.js" --help
```

### Issue 2: "Cannot find module"
**Symptoms**: Module import errors
**Solutions**:
```bash
# 1. Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# 2. Rebuild
npm run build

# 3. Check TypeScript compilation
npx tsc --noEmit
```

### Issue 3: Shebang Line Errors (Windows)
**Symptoms**: "#!/usr/bin/env node" errors
**Solutions**:
```bash
# Run with node explicitly
node dist/cli-enhanced.js analyze file.csv

# OR fix file associations
assoc .js=JSFile
ftype JSFile="C:\Program Files\nodejs\node.exe" "%1" %*
```

### Issue 4: Memory Errors with Large Files
**Symptoms**: "JavaScript heap out of memory"
**Solutions**:
```bash
# Increase memory limit
NODE_OPTIONS="--max-old-space-size=4096" vendfi analyze large-file.csv

# Use streaming for large files
vendfi analyze large-file.csv --streaming-threshold 10000
```

## Development Workflow

### For CLI Development
```bash
# 1. Make changes to TypeScript files
# 2. Test with ts-node
npx ts-node cli-enhanced.ts analyze test-file.csv

# 3. Rebuild
npm run build

# 4. Test built version
node dist/cli-enhanced.js analyze test-file.csv

# 5. Update global installation
npm unlink
npm link
```

### Using Watch Mode
```bash
# Auto-rebuild on changes
npm run watch

# In another terminal, test changes
npx ts-node cli-enhanced.ts --help
```

## Production Deployment

### Docker Setup
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
ENTRYPOINT ["node", "dist/cli-enhanced.js"]
```

### CI/CD Pipeline Example
```yaml
# GitHub Actions example
name: VendFI CLI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm test
```

## Uninstallation

### Remove Global Installation
```bash
# Unlink globally
npm unlink -g

# Remove from npm global
npm rm -g VendFI

# Clean up local files
cd /path/to/VendFI/processor-core
rm -rf node_modules dist
```

### Complete Cleanup
```bash
# Windows
rd /s /q node_modules
rd /s /q dist
del package-lock.json

# macOS/Linux
rm -rf node_modules dist package-lock.json
```

## Performance Optimization

### For Large-Scale Processing
```bash
# 1. Increase memory
export NODE_OPTIONS="--max-old-space-size=8192"

# 2. Use caching
vendfi analyze file.csv --cache-key vendor-001

# 3. Process in batches
for file in *.csv; do
  vendfi analyze "$file" --cache-key batch-processing
done

# 4. Schedule during off-peak
# Add to crontab (Linux/Mac)
0 2 * * * /path/to/vendfi analyze /data/daily.csv
```

### Monitoring Setup
```bash
# Track memory usage
/usr/bin/time -v vendfi analyze large-file.csv

# Log performance metrics
vendfi analyze file.csv 2>&1 | tee processing.log
```

## Getting Help

### Diagnostic Commands
```bash
# Check system information
node --version
npm --version
npx tsc --version

# Check project structure
ls -la dist/cli-enhanced.js
ls -la node_modules/.bin/

# Test with verbose output
DEBUG=true vendfi analyze test-file.csv
```

### Support Resources
1. **Check Documentation**: Refer to `CLI_REFERENCE.md`
2. **Run Tests**: `npm test`
3. **Generate Sample Data**: `npm run generate-samples`
4. **Check Issues**: Look for similar problems in issue tracker

## Quick Reference

### Essential Commands
```bash
# Setup
npm install
npm run build
npm link

# Basic Usage
vendfi analyze file.csv
vendfi map file.csv
vendfi diagnose file.csv

# Development
npx ts-node cli-enhanced.ts --help
npm run watch
npm test
```

### Common Options
```bash
# Output control
-o report.html          # HTML output
-j data.json           # JSON output

# Vendor configuration
-v vendor-001          # Vendor ID
--confidence 0.8       # Mapping confidence

# Error handling
--continue-on-error    # Continue despite errors
--max-errors 100       # Stop after N errors
```

## Next Steps

After successful setup:
1. **Test with your data**: `vendfi analyze your-file.csv`
2. **Create vendor profiles**: Use `-v` option consistently
3. **Set up automation**: Create scripts for batch processing
4. **Monitor performance**: Use `--cache-key` for optimization
5. **Explore advanced features**: Try diagnostic and validation modes

## Support

If you encounter issues:
1. Check this guide for troubleshooting steps
2. Verify all prerequisites are met
3. Test with sample data in `test-data/` directory
4. Check console output for specific error messages
5. Refer to comprehensive documentation in `PRODUCTION_SYSTEM_GUIDE.md`

---

*Last Updated: 2024-01-15*
*Setup Guide Version: 1.0.0*
*Compatible with VendFI CLI v2.0.0*