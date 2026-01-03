// src/aggregators/global-metrics.ts

import { NormalizedRecord, GlobalMetrics, FinanceStatus } from '../types';
import { startOfDay, endOfDay } from 'date-fns';

export function computeGlobalMetrics(
  records: NormalizedRecord[],
  dateFrom?: Date,
  dateTo?: Date
): GlobalMetrics {
  // Filter by date range if provided
  let filtered = records;
  if (dateFrom || dateTo) {
    filtered = records.filter(r => {
      const date = r.order_date;
      if (dateFrom && date < dateFrom) return false;
      if (dateTo && date > dateTo) return false;
      return true;
    });
  }
  
  // Determine actual date range from data
  const dates = filtered.map(r => r.order_date);
  const actualFrom = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
  const actualTo = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();
  
  const totalOrders = filtered.length;
  const financedOrders = filtered.filter(r => r.finance_selected);
  const nFinanced = financedOrders.length;
  
  const approvedOrders = financedOrders.filter(
    r => r.finance_decision_status === FinanceStatus.APPROVED
  );
  const nApproved = approvedOrders.length;
  
  // Value calculations
  const ordersWithValue = filtered.filter(r => r.order_value !== null && r.order_value !== undefined);
  const totalValue = ordersWithValue.reduce((sum, r) => sum + (r.order_value || 0), 0);
  
  const financedWithValue = financedOrders.filter(r => r.order_value !== null && r.order_value !== undefined);
  const financeValue = financedWithValue.reduce((sum, r) => sum + (r.order_value || 0), 0);
  
  const cashOrders = filtered.filter(r => !r.finance_selected && r.order_value !== null);
  const cashValue = cashOrders.reduce((sum, r) => sum + (r.order_value || 0), 0);
  
  return {
    total_orders: totalOrders,
    financed_orders: nFinanced,
    attachment_rate: totalOrders > 0 ? nFinanced / totalOrders : null,
    approved_applications: nApproved,
    approval_rate: nFinanced > 0 ? nApproved / nFinanced : null,
    cash_orders: totalOrders - nFinanced,
    avg_order_value_overall: ordersWithValue.length > 0 ? totalValue / ordersWithValue.length : null,
    avg_order_value_finance: financedWithValue.length > 0 ? financeValue / financedWithValue.length : null,
    avg_order_value_cash: cashOrders.length > 0 ? cashValue / cashOrders.length : null,
    date_range: {
      from: actualFrom,
      to: actualTo,
    },
  };
}
