// src/aggregators/time-series.ts

import { NormalizedRecord, TimeSeriesPoint, FinanceStatus } from '../types';
import { startOfWeek, startOfMonth, format } from 'date-fns';

export type TimeSeriesPeriod = 'weekly' | 'monthly';

export function computeTimeSeries(
  records: NormalizedRecord[],
  period: TimeSeriesPeriod = 'weekly'
): TimeSeriesPoint[] {
  // Group by period
  const byPeriod = new Map<string, NormalizedRecord[]>();
  
  for (const record of records) {
    const periodStart = period === 'weekly' 
      ? startOfWeek(record.order_date, { weekStartsOn: 1 }) // Monday
      : startOfMonth(record.order_date);
    
    const key = format(periodStart, 'yyyy-MM-dd');
    
    if (!byPeriod.has(key)) {
      byPeriod.set(key, []);
    }
    byPeriod.get(key)!.push(record);
  }
  
  // Compute metrics for each period
  const points: TimeSeriesPoint[] = [];
  
  for (const [periodKey, periodRecords] of byPeriod.entries()) {
    const totalOrders = periodRecords.length;
    const financed = periodRecords.filter(r => r.finance_selected);
    const nFinanced = financed.length;
    
    const approved = financed.filter(
      r => r.finance_decision_status === FinanceStatus.APPROVED
    );
    const nApproved = approved.length;
    
    points.push({
      period: periodKey,
      total_orders: totalOrders,
      financed_orders: nFinanced,
      attachment_rate: totalOrders > 0 ? nFinanced / totalOrders : null,
      approval_rate: nFinanced > 0 ? nApproved / nFinanced : null,
    });
  }
  
  // Sort chronologically
  return points.sort((a, b) => a.period.localeCompare(b.period));
}