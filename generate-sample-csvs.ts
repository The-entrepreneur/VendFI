// generate-sample-csvs.ts
// Generates realistic vendor finance CSVs based on actual embedded finance provider formats

import { writeFileSync } from 'fs';
import { format, subDays, addDays } from 'date-fns';

// Product catalog for realistic data
const PRODUCTS = [
  { name: 'MacBook Pro 14" M3', sku: 'MBP14-M3-512', price: 1899, category: 'Laptops' },
  { name: 'MacBook Pro 16" M3 Max', sku: 'MBP16-M3MAX-1TB', price: 3199, category: 'Laptops' },
  { name: 'MacBook Air 15" M2', sku: 'MBA15-M2-512', price: 1499, category: 'Laptops' },
  { name: 'MacBook Air 13" M2', sku: 'MBA13-M2-256', price: 1199, category: 'Laptops' },
  { name: 'iPad Pro 12.9" M2', sku: 'IPAD-PRO-12-256', price: 1249, category: 'Tablets' },
  { name: 'iPad Air 11"', sku: 'IPAD-AIR-11-128', price: 649, category: 'Tablets' },
  { name: 'iPad 10th Gen', sku: 'IPAD-10-64', price: 449, category: 'Tablets' },
  { name: 'iPhone 15 Pro Max', sku: 'IP15-PROMAX-256', price: 1199, category: 'Phones' },
  { name: 'iPhone 15 Pro', sku: 'IP15-PRO-128', price: 999, category: 'Phones' },
  { name: 'iPhone 15', sku: 'IP15-128', price: 799, category: 'Phones' },
  { name: 'Mac Mini M2 Pro', sku: 'MINI-M2PRO-512', price: 1299, category: 'Desktops' },
  { name: 'Mac Studio M2 Ultra', sku: 'STUDIO-M2ULTRA-1TB', price: 4299, category: 'Desktops' },
  { name: 'iMac 24" M3', sku: 'IMAC24-M3-512', price: 1699, category: 'Desktops' },
  { name: 'Apple Watch Ultra 2', sku: 'WATCH-ULTRA2', price: 799, category: 'Wearables' },
  { name: 'AirPods Pro 2', sku: 'AIRPODS-PRO2', price: 249, category: 'Audio' },
  { name: 'Dell XPS 15', sku: 'DELL-XPS15-512', price: 1799, category: 'Laptops' },
  { name: 'Surface Laptop 5', sku: 'SURF-LAP5-512', price: 1399, category: 'Laptops' },
  { name: 'ThinkPad X1 Carbon', sku: 'TP-X1C-512', price: 1899, category: 'Laptops' },
  { name: 'Samsung Galaxy Tab S9', sku: 'SAMS-TABS9-256', price: 899, category: 'Tablets' },
  { name: 'Sony WH-1000XM5', sku: 'SONY-WH1000XM5', price: 399, category: 'Audio' },
];

const CUSTOMER_SEGMENTS = ['SME', 'Enterprise', 'Sole Trader', 'Startup', 'Education'];
const FINANCE_PROVIDERS = ['PropelPay', 'Embedded Finance Ltd', 'B2B BNPL Co'];
const TERMS = [12, 24, 36, 48];

// Approval rates by term (realistic distribution)
const APPROVAL_RATES = {
  12: 0.88,
  24: 0.82,
  36: 0.75,
  48: 0.65,
};

// Finance selection rate by product price
function getFinanceSelectionRate(price: number): number {
  if (price < 500) return 0.15;
  if (price < 1000) return 0.35;
  if (price < 2000) return 0.65;
  return 0.75;
}

// Generate random weighted choice
function weightedRandom(rate: number): boolean {
  return Math.random() < rate;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// ============================================================================
// CSV Type 1: Full Vendor E-commerce Export (Ideal Format)
// What vendors get from Shopify/WooCommerce with embedded finance plugin
// ============================================================================

function generateVendorEcommerceExport(numOrders: number = 200): string {
  const rows: string[] = [];
  const headers = [
    'order_id',
    'order_date',
    'customer_id',
    'customer_segment',
    'product_name',
    'product_sku',
    'product_category',
    'order_value',
    'finance_selected',
    'finance_provider',
    'finance_term_months',
    'finance_decision_status',
    'finance_decision_date',
  ];
  
  rows.push(headers.join(','));
  
  const startDate = subDays(new Date(), 90);
  const endDate = new Date();
  
  for (let i = 1; i <= numOrders; i++) {
    const product = randomChoice(PRODUCTS);
    const orderDate = randomDate(startDate, endDate);
    const financeSelected = weightedRandom(getFinanceSelectionRate(product.price));
    
    let financeProvider = '';
    let term = '';
    let status = '';
    let decisionDate = '';
    
    if (financeSelected) {
      financeProvider = randomChoice(FINANCE_PROVIDERS);
      const termMonths = randomChoice(TERMS);
      term = String(termMonths);
      
      const approved = weightedRandom(APPROVAL_RATES[termMonths as keyof typeof APPROVAL_RATES]);
      status = approved ? 'approved' : (Math.random() > 0.9 ? 'pending' : 'declined');
      
      if (status !== 'pending') {
        decisionDate = format(addDays(orderDate, Math.floor(Math.random() * 2)), 'yyyy-MM-dd');
      }
    }
    
    const row = [
      `ORD${String(i).padStart(5, '0')}`,
      format(orderDate, 'yyyy-MM-dd'),
      `CUST${String(Math.floor(Math.random() * 500)).padStart(4, '0')}`,
      randomChoice(CUSTOMER_SEGMENTS),
      `"${product.name}"`,
      product.sku,
      product.category,
      product.price.toFixed(2),
      financeSelected ? 'yes' : 'no',
      financeProvider,
      term,
      status,
      decisionDate,
    ];
    
    rows.push(row.join(','));
  }
  
  return rows.join('\n');
}

// ============================================================================
// CSV Type 2: Finance Provider Portal Export (Finance-Only, Messy Headers)
// What vendors download from PropelPay/similar provider merchant dashboard
// ============================================================================

function generateFinanceProviderExport(numApplications: number = 150): string {
  const rows: string[] = [];
  const headers = [
    'Application Reference',
    'Submission Date',
    'Merchant Name',
    'Asset Description',
    'Asset Value',
    'Repayment Term',
    'Decision',
    'Decision Date',
    'Customer Type',
    'Monthly Payment',
  ];
  
  rows.push(headers.join(','));
  
  const startDate = subDays(new Date(), 90);
  const endDate = new Date();
  
  for (let i = 1; i <= numApplications; i++) {
    const product = randomChoice(PRODUCTS);
    const submissionDate = randomDate(startDate, endDate);
    const termMonths = randomChoice(TERMS);
    
    const approved = weightedRandom(APPROVAL_RATES[termMonths as keyof typeof APPROVAL_RATES]);
    const status = approved ? 'APPROVED' : (Math.random() > 0.85 ? 'PENDING' : 'DECLINED');
    
    const decisionDate = status !== 'PENDING' 
      ? format(addDays(submissionDate, Math.floor(Math.random() * 3)), 'dd/MM/yyyy')
      : '';
    
    // Calculate monthly payment
    const monthlyPayment = status === 'APPROVED' 
      ? (product.price / termMonths).toFixed(2)
      : '';
    
    const row = [
      `APP-2024-${String(i).padStart(4, '0')}`,
      format(submissionDate, 'dd/MM/yyyy'),
      'TechVendor Ltd',
      `"${product.name}"`,
      `£${product.price.toFixed(2)}`,
      `${termMonths} months`,
      status,
      decisionDate,
      randomChoice(CUSTOMER_SEGMENTS),
      monthlyPayment ? `£${monthlyPayment}` : '',
    ];
    
    rows.push(row.join(','));
  }
  
  return rows.join('\n');
}

// ============================================================================
// CSV Type 3: Real-World Messy Export (Inconsistent, Missing Fields)
// What you actually get from small vendors with manual processes
// ============================================================================

function generateMessyRealWorldExport(numOrders: number = 100): string {
  const rows: string[] = [];
  const headers = [
    'Deal ID',
    'Date',
    'Item',
    'SKU',
    'Amount',
    'Funded?',
    'Term',
    'Status',
    'Notes',
  ];
  
  rows.push(headers.join(','));
  
  const startDate = subDays(new Date(), 60);
  const endDate = new Date();
  
  for (let i = 1; i <= numOrders; i++) {
    const product = randomChoice(PRODUCTS);
    const orderDate = randomDate(startDate, endDate);
    const financeSelected = weightedRandom(getFinanceSelectionRate(product.price));
    
    // Inconsistent date format
    const dateFormats = ['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'];
    const dateFormat = randomChoice(dateFormats);
    
    // Inconsistent currency format
    const priceFormats = [
      `£${product.price.toFixed(2)}`,
      `£${product.price.toLocaleString()}`,
      `${product.price}`,
      `£ ${product.price.toFixed(2)}`,
    ];
    
    let funded = '';
    let term = '';
    let status = '';
    let notes = '';
    
    if (financeSelected) {
      funded = randomChoice(['Y', 'Yes', 'TRUE', '1']);
      const termMonths = randomChoice(TERMS);
      term = randomChoice([
        `${termMonths}`,
        `${termMonths} months`,
        `${termMonths}m`,
        `${termMonths} mths`,
      ]);
      
      const approved = weightedRandom(APPROVAL_RATES[termMonths as keyof typeof APPROVAL_RATES]);
      const statusOptions = approved 
        ? ['approved', 'APPROVED', 'Funded', 'OK', 'Accepted']
        : ['declined', 'DECLINED', 'Rejected', 'FAIL', 'Not approved'];
      
      status = randomChoice(statusOptions);
      
      if (!approved) {
        notes = randomChoice([
          'Credit score too low',
          'Insufficient trading history',
          'High debt ratio',
          'Customer withdrew',
          '',
        ]);
      }
    } else {
      funded = randomChoice(['N', 'No', 'FALSE', '0', '']);
    }
    
    // Sometimes missing SKU
    const sku = Math.random() > 0.2 ? product.sku : '';
    
    const row = [
      `D-${i}`,
      format(orderDate, dateFormat),
      `"${product.name}"`,
      sku,
      randomChoice(priceFormats),
      funded,
      term,
      status,
      `"${notes}"`,
    ];
    
    rows.push(row.join(','));
  }
  
  return rows.join('\n');
}

// ============================================================================
// Generate all sample files
// ============================================================================

console.log('🔄 Generating realistic sample CSV files...\n');

// Generate samples
const vendorExport = generateVendorEcommerceExport(200);
const providerExport = generateFinanceProviderExport(150);
const messyExport = generateMessyRealWorldExport(100);

// Save files
writeFileSync('test-data/vendor-ecommerce-export.csv', vendorExport);
console.log('✅ Generated: test-data/vendor-ecommerce-export.csv (200 orders)');
console.log('   Format: Clean e-commerce export with all fields');
console.log('   Use case: Ideal scenario - vendor has good data');

writeFileSync('test-data/finance-provider-export.csv', providerExport);
console.log('\n✅ Generated: test-data/finance-provider-export.csv (150 applications)');
console.log('   Format: Finance provider merchant portal export');
console.log('   Use case: Vendor downloads from PropelPay/similar dashboard');

writeFileSync('test-data/messy-real-world-export.csv', messyExport);
console.log('\n✅ Generated: test-data/messy-real-world-export.csv (100 orders)');
console.log('   Format: Inconsistent formatting, missing fields');
console.log('   Use case: Small vendor with manual processes');

console.log('\n📊 Sample Statistics:');
console.log('   Total Orders: 450');
console.log('   Date Range: Last 90 days');
console.log('   Products: 20 different items');
console.log('   Terms: 12, 24, 36, 48 months');
console.log('   Realistic approval rates by term');

console.log('\n🚀 Ready to test! Run:');
console.log('   npm run cli -- analyze test-data/vendor-ecommerce-export.csv');
console.log('\n');