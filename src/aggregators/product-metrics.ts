// src/aggregators/product-metrics.ts

import { NormalizedRecord, ProductMetrics, FinanceStatus } from '../types';

export function computeProductMetrics(
  records: NormalizedRecord[],
  dateFrom?: Date,
  dateTo?: Date
): ProductMetrics[] {
  // Filter by date range
  let filtered = records;
  if (dateFrom || dateTo) {
    filtered = records.filter(r => {
      const date = r.order_date;
      if (dateFrom && date < dateFrom) return false;
      if (dateTo && date > dateTo) return false;
      return true;
    });
  }
  
  // Group by product name
  const byProduct = new Map<string, NormalizedRecord[]>();
  for (const record of filtered) {
    const productName = record.product_name;
    if (!byProduct.has(productName)) {
      byProduct.set(productName, []);
    }
    byProduct.get(productName)!.push(record);
  }
  
  // Compute metrics for each product
  const metrics: ProductMetrics[] = [];
  
  for (const [productName, productRecords] of byProduct.entries()) {
    const totalOrders = productRecords.length;
    const financed = productRecords.filter(r => r.finance_selected);
    const nFinanced = financed.length;
    
    const approved = financed.filter(
      r => r.finance_decision_status === FinanceStatus.APPROVED
    );
    const nApproved = approved.length;
    
    const withValue = productRecords.filter(r => r.order_value !== null);
    const totalValue = withValue.reduce((sum, r) => sum + (r.order_value || 0), 0);
    
    metrics.push({
      product_name: productName,
      total_orders: totalOrders,
      financed_orders: nFinanced,
      attachment_rate: totalOrders > 0 ? nFinanced / totalOrders : null,
      approved_applications: nApproved,
      approval_rate: nFinanced > 0 ? nApproved / nFinanced : null,
      total_value: totalValue,
      avg_order_value: withValue.length > 0 ? totalValue / withValue.length : null,
    });
  }
  
  // Sort by financed volume descending
  return metrics.sort((a, b) => b.financed_orders - a.financed_orders);
}

/**
 * Identify friction hotspots (high attachment, low approval)
 */
export function identifyFrictionHotspots(
  productMetrics: ProductMetrics[],
  globalApprovalRate: number | null
): ProductMetrics[] {
  if (!globalApprovalRate) return [];
  
  const avgAttachmentRate = 
    productMetrics.reduce((sum, p) => sum + (p.attachment_rate || 0), 0) / 
    productMetrics.length;
  
  return productMetrics.filter(p => {
    const hasGoodAttachment = (p.attachment_rate || 0) > avgAttachmentRate;
    const hasPoorApproval = (p.approval_rate || 0) < globalApprovalRate;
    return hasGoodAttachment && hasPoorApproval && p.financed_orders >= 3; // Min 3 orders
  });
}
