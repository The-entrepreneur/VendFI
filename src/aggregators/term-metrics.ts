// src/aggregators/term-metrics.ts

import { NormalizedRecord, TermMetrics, FinanceStatus } from '../types';

export function computeTermMetrics(
  records: NormalizedRecord[],
  dateFrom?: Date,
  dateTo?: Date
): TermMetrics[] {
  // Filter by date range and financed only
  let filtered = records.filter(r => r.finance_selected);
  
  if (dateFrom || dateTo) {
    filtered = filtered.filter(r => {
      const date = r.order_date;
      if (dateFrom && date < dateFrom) return false;
      if (dateTo && date > dateTo) return false;
      return true;
    });
  }
  
  // Filter out records without term info
  filtered = filtered.filter(r => r.finance_term_months !== null);
  
  // Group by term
  const byTerm = new Map<number, NormalizedRecord[]>();
  for (const record of filtered) {
    const term = record.finance_term_months!;
    if (!byTerm.has(term)) {
      byTerm.set(term, []);
    }
    byTerm.get(term)!.push(record);
  }
  
  // Compute metrics for each term
  const metrics: TermMetrics[] = [];
  
  for (const [term, termRecords] of byTerm.entries()) {
    const applications = termRecords.length;
    const approved = termRecords.filter(
      r => r.finance_decision_status === FinanceStatus.APPROVED
    );
    const nApproved = approved.length;
    
    const withValue = termRecords.filter(r => r.order_value !== null);
    const totalValue = withValue.reduce((sum, r) => sum + (r.order_value || 0), 0);
    
    metrics.push({
      term_months: term,
      applications: applications,
      approved: nApproved,
      approval_rate: applications > 0 ? nApproved / applications : null,
      total_value: totalValue,
      avg_order_value: withValue.length > 0 ? totalValue / withValue.length : null,
    });
  }
  
  // Sort by applications descending
  return metrics.sort((a, b) => b.applications - a.applications);
}
