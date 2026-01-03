// src/reports/html-generator.ts

import { AnalyticsReport, ProductMetrics, TermMetrics, TimeSeriesPoint } from '../types';
import { format } from 'date-fns';

interface ReportOptions {
  vendorName?: string;
  csvFileName?: string;
}

export function generateHTMLReport(report: AnalyticsReport, options: ReportOptions = {}): string {
  const g = report.global_metrics;
  const vendorName = options.vendorName || report.vendor_id;
  const fileName = options.csvFileName || 'data.csv';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Finance Analytics Report - ${vendorName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a202c;
      background: #f7fafc;
      padding: 2rem;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2.5rem 2rem;
    }
    
    .header h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }
    
    .header p {
      opacity: 0.9;
      font-size: 0.95rem;
    }
    
    .metadata {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      padding: 1.5rem 2rem;
      background: #f7fafc;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .metadata-item {
      display: flex;
      flex-direction: column;
    }
    
    .metadata-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #718096;
      margin-bottom: 0.25rem;
    }
    
    .metadata-value {
      font-size: 1rem;
      font-weight: 600;
      color: #2d3748;
    }
    
    .content {
      padding: 2rem;
    }
    
    .section {
      margin-bottom: 3rem;
    }
    
    .section-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #2d3748;
      margin-bottom: 1.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 3px solid #667eea;
    }
    
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    
    .kpi-card {
      background: #f7fafc;
      border-radius: 8px;
      padding: 1.5rem;
      border-left: 4px solid #667eea;
    }
    
    .kpi-card.highlight {
      border-left-color: #48bb78;
      background: #f0fff4;
    }
    
    .kpi-card.warning {
      border-left-color: #ed8936;
      background: #fffaf0;
    }
    
    .kpi-label {
      font-size: 0.875rem;
      color: #718096;
      margin-bottom: 0.5rem;
    }
    
    .kpi-value {
      font-size: 2rem;
      font-weight: 700;
      color: #2d3748;
    }
    
    .kpi-subtext {
      font-size: 0.875rem;
      color: #718096;
      margin-top: 0.25rem;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }
    
    thead {
      background: #f7fafc;
    }
    
    th {
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      font-size: 0.875rem;
      color: #4a5568;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 2px solid #e2e8f0;
    }
    
    td {
      padding: 1rem;
      border-bottom: 1px solid #e2e8f0;
      font-size: 0.95rem;
    }
    
    tbody tr:hover {
      background: #f7fafc;
    }
    
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .badge-success {
      background: #c6f6d5;
      color: #22543d;
    }
    
    .badge-warning {
      background: #feebc8;
      color: #7c2d12;
    }
    
    .badge-info {
      background: #bee3f8;
      color: #2c5282;
    }
    
    .insight-box {
      background: #edf2f7;
      border-left: 4px solid #4299e1;
      border-radius: 8px;
      padding: 1.5rem;
      margin: 1.5rem 0;
    }
    
    .insight-box h3 {
      font-size: 1.1rem;
      color: #2d3748;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .insight-box ul {
      list-style: none;
      padding-left: 0;
    }
    
    .insight-box li {
      padding: 0.5rem 0;
      padding-left: 1.5rem;
      position: relative;
    }
    
    .insight-box li:before {
      content: "→";
      position: absolute;
      left: 0;
      color: #4299e1;
      font-weight: bold;
    }
    
    .chart-placeholder {
      background: #f7fafc;
      border: 2px dashed #cbd5e0;
      border-radius: 8px;
      padding: 3rem;
      text-align: center;
      color: #718096;
      margin: 1rem 0;
    }
    
    .footer {
      background: #f7fafc;
      padding: 2rem;
      text-align: center;
      color: #718096;
      font-size: 0.875rem;
      border-top: 2px solid #e2e8f0;
    }
    
    @media print {
      body {
        padding: 0;
      }
      .container {
        box-shadow: none;
      }
    }
    
    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 0.5rem;
    }
    
    .progress-fill {
      height: 100%;
      background: #667eea;
      transition: width 0.3s ease;
    }
    
    .progress-fill.high {
      background: #48bb78;
    }
    
    .progress-fill.medium {
      background: #ed8936;
    }
    
    .progress-fill.low {
      background: #f56565;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Finance Performance Report</h1>
      <p>Vendor Finance Analytics • Generated ${format(report.generated_at, 'PPP')}</p>
    </div>
    
    <div class="metadata">
      <div class="metadata-item">
        <div class="metadata-label">Vendor</div>
        <div class="metadata-value">${vendorName}</div>
      </div>
      <div class="metadata-item">
        <div class="metadata-label">Source File</div>
        <div class="metadata-value">${fileName}</div>
      </div>
      <div class="metadata-item">
        <div class="metadata-label">Date Range</div>
        <div class="metadata-value">
          ${format(g.date_range.from, 'dd MMM yyyy')} - ${format(g.date_range.to, 'dd MMM yyyy')}
        </div>
      </div>
      <div class="metadata-item">
        <div class="metadata-label">Total Orders</div>
        <div class="metadata-value">${g.total_orders.toLocaleString()}</div>
      </div>
    </div>
    
    <div class="content">
      ${generateGlobalMetricsSection(g)}
      ${generateProductSection(report.product_metrics)}
      ${generateTermSection(report.term_metrics)}
      ${generateInsightsSection(report)}
      ${report.friction_hotspots.length > 0 ? generateFrictionSection(report.friction_hotspots) : ''}
    </div>
    
    <div class="footer">
      <p>Generated by VendFI Analytics Engine v1.0 • ${format(new Date(), 'PPpp')}</p>
      <p style="margin-top: 0.5rem;">Vendor Finance Analytics for Embedded Finance Providers</p>
    </div>
  </div>
</body>
</html>`;
}

function generateGlobalMetricsSection(g: any): string {
  const attachmentRate = g.attachment_rate || 0;
  const approvalRate = g.approval_rate || 0;
  
  const attachmentClass = attachmentRate > 0.5 ? 'highlight' : '';
  const approvalClass = approvalRate > 0.75 ? 'highlight' : (approvalRate < 0.6 ? 'warning' : '');
  
  return `
    <div class="section">
      <h2 class="section-title">Global Performance Metrics</h2>
      
      <div class="kpi-grid">
        <div class="kpi-card ${attachmentClass}">
          <div class="kpi-label">Finance Attachment Rate</div>
          <div class="kpi-value">${formatPercent(g.attachment_rate)}</div>
          <div class="kpi-subtext">${g.financed_orders} of ${g.total_orders} orders</div>
          <div class="progress-bar">
            <div class="progress-fill ${getProgressClass(attachmentRate)}" 
                 style="width: ${(attachmentRate * 100).toFixed(0)}%"></div>
          </div>
        </div>
        
        <div class="kpi-card ${approvalClass}">
          <div class="kpi-label">Finance Approval Rate</div>
          <div class="kpi-value">${formatPercent(g.approval_rate)}</div>
          <div class="kpi-subtext">${g.approved_applications} of ${g.financed_orders} approved</div>
          <div class="progress-bar">
            <div class="progress-fill ${getProgressClass(approvalRate)}" 
                 style="width: ${(approvalRate * 100).toFixed(0)}%"></div>
          </div>
        </div>
        
        <div class="kpi-card">
          <div class="kpi-label">Avg Order Value (Finance)</div>
          <div class="kpi-value">${formatCurrency(g.avg_order_value_finance)}</div>
          <div class="kpi-subtext">vs ${formatCurrency(g.avg_order_value_cash)} cash</div>
        </div>
        
        <div class="kpi-card">
          <div class="kpi-label">Total Order Value</div>
          <div class="kpi-value">${formatCurrency((g.avg_order_value_overall || 0) * g.total_orders)}</div>
          <div class="kpi-subtext">Avg: ${formatCurrency(g.avg_order_value_overall)}</div>
        </div>
      </div>
    </div>
  `;
}

function generateProductSection(products: ProductMetrics[]): string {
  if (products.length === 0) {
    return '<div class="section"><h2 class="section-title">Product Performance</h2><p>No product data available.</p></div>';
  }
  
  const topProducts = products.slice(0, 10);
  
  const rows = topProducts.map(p => `
    <tr>
      <td><strong>${escapeHtml(p.product_name)}</strong></td>
      <td>${p.total_orders}</td>
      <td>${p.financed_orders}</td>
      <td>
        ${formatPercent(p.attachment_rate)}
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${((p.attachment_rate || 0) * 100).toFixed(0)}%"></div>
        </div>
      </td>
      <td>
        <span class="badge ${(p.approval_rate || 0) > 0.75 ? 'badge-success' : 'badge-warning'}">
          ${formatPercent(p.approval_rate)}
        </span>
      </td>
      <td>${formatCurrency(p.avg_order_value)}</td>
    </tr>
  `).join('');
  
  return `
    <div class="section">
      <h2 class="section-title">Product Performance (Top 10)</h2>
      
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Total Orders</th>
            <th>Financed</th>
            <th>Attachment Rate</th>
            <th>Approval Rate</th>
            <th>Avg Value</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function generateTermSection(terms: TermMetrics[]): string {
  if (terms.length === 0) {
    return '<div class="section"><h2 class="section-title">Term Performance</h2><p>No term data available.</p></div>';
  }
  
  const rows = terms.map(t => `
    <tr>
      <td><strong>${t.term_months} months</strong></td>
      <td>${t.applications}</td>
      <td>${t.approved}</td>
      <td>
        <span class="badge ${(t.approval_rate || 0) > 0.75 ? 'badge-success' : 'badge-warning'}">
          ${formatPercent(t.approval_rate)}
        </span>
      </td>
      <td>${formatCurrency(t.total_value)}</td>
      <td>${formatCurrency(t.avg_order_value)}</td>
    </tr>
  `).join('');
  
  return `
    <div class="section">
      <h2 class="section-title">Repayment Term Analysis</h2>
      
      <table>
        <thead>
          <tr>
            <th>Term</th>
            <th>Applications</th>
            <th>Approved</th>
            <th>Approval Rate</th>
            <th>Total Value</th>
            <th>Avg Value</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function generateInsightsSection(report: AnalyticsReport): string {
  const insights: string[] = [];
  
  // Attachment rate insight
  const attachmentRate = report.global_metrics.attachment_rate || 0;
  if (attachmentRate < 0.3) {
    insights.push('Finance option may not be prominent enough - consider improving visibility at checkout');
  } else if (attachmentRate > 0.6) {
    insights.push('Strong finance adoption - customers are finding and using the finance option effectively');
  }
  
  // Approval rate insight
  const approvalRate = report.global_metrics.approval_rate || 0;
  if (approvalRate < 0.65) {
    insights.push('Low approval rate may indicate eligibility criteria are too strict or customer targeting needs adjustment');
  } else if (approvalRate > 0.8) {
    insights.push('Excellent approval rate indicates well-matched customer base and appropriate eligibility criteria');
  }
  
  // Term insights
  if (report.term_metrics.length > 0) {
    const topTerm = report.term_metrics[0];
    insights.push(`${topTerm.term_months}-month term is most popular with ${topTerm.applications} applications - consider making this the default option`);
  }
  
  // AOV insight
  const financeAOV = report.global_metrics.avg_order_value_finance || 0;
  const cashAOV = report.global_metrics.avg_order_value_cash || 0;
  if (financeAOV > cashAOV * 1.2) {
    insights.push('Customers using finance spend significantly more - promote finance option to increase average basket size');
  }
  
  // Product insights
  if (report.product_metrics.length > 0) {
    const topProduct = report.product_metrics[0];
    insights.push(`"${topProduct.product_name}" is your top financed product with ${topProduct.financed_orders} finance applications`);
  }
  
  if (insights.length === 0) {
    return '';
  }
  
  const insightItems = insights.map(i => `<li>${i}</li>`).join('');
  
  return `
    <div class="section">
      <div class="insight-box">
        <h3>💡 Key Insights & Recommendations</h3>
        <ul>
          ${insightItems}
        </ul>
      </div>
    </div>
  `;
}

function generateFrictionSection(hotspots: ProductMetrics[]): string {
  const rows = hotspots.map(p => `
    <tr>
      <td><strong>${escapeHtml(p.product_name)}</strong></td>
      <td>
        <span class="badge badge-info">${formatPercent(p.attachment_rate)}</span>
      </td>
      <td>
        <span class="badge badge-warning">${formatPercent(p.approval_rate)}</span>
      </td>
      <td>${p.financed_orders}</td>
      <td>Review pricing, eligibility criteria, or product positioning</td>
    </tr>
  `).join('');
  
  return `
    <div class="section">
      <h2 class="section-title">⚠️ Friction Hotspots</h2>
      <p style="margin-bottom: 1rem; color: #718096;">
        Products with high customer interest (attachment rate) but lower-than-average approval rates.
        These represent opportunities to improve conversion.
      </p>
      
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Attachment Rate</th>
            <th>Approval Rate</th>
            <th>Applications</th>
            <th>Recommendation</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

// Helper functions
function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  return (value * 100).toFixed(1) + '%';
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  return '£' + value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getProgressClass(rate: number): string {
  if (rate > 0.75) return 'high';
  if (rate > 0.5) return 'medium';
  return 'low';
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}