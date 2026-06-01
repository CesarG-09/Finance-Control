import { supabase } from '../lib/supabaseClient';

// =====================================================================
// Items fijos (persistentes): ingresos y gastos
// =====================================================================

const FIXED_ITEM_SELECT = `
  bfi_id,
  cl_id,
  bfi_kind,
  bfi_label,
  bfi_amount,
  rtr_id,
  sct_id,
  bfi_notes,
  bfi_is_active,
  bfi_sort_order,
  created_at,
  modified_at,
  recurrent_transaction:recurrent_transaction (
    rtr_id,
    rtr_name,
    rtr_estimated_amount,
    frequency:frequency ( fr_id, fr_name )
  ),
  subcategory:subcategory (
    sct_id,
    sct_name,
    category:category ( ct_id, ct_name )
  )
`;

export async function getFixedItems(clientId) {
  if (!clientId) return { incomes: [], expenses: [] };

  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('budget_fixed_item')
    .select(FIXED_ITEM_SELECT)
    .eq('cl_id', clientId)
    .eq('bfi_is_active', true)
    .order('bfi_sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;

  const incomes = (data ?? []).filter((it) => it.bfi_kind === 'income');
  const expenses = (data ?? []).filter((it) => it.bfi_kind === 'expense');
  return { incomes, expenses };
}

export async function saveFixedItems(clientId, kind, items) {
  if (!clientId) throw new Error('Falta el cliente.');
  if (kind !== 'income' && kind !== 'expense') {
    throw new Error('Tipo inválido. Debe ser income o expense.');
  }

  const payload = (items ?? [])
    .filter((it) => String(it.label ?? '').trim() !== '' && Number(it.amount) >= 0)
    .map((it, idx) => ({
      label: String(it.label).trim(),
      amount: Number(it.amount) || 0,
      rtr_id: it.rtr_id ? String(it.rtr_id) : null,
      sct_id: it.sct_id ? String(it.sct_id) : null,
      notes: it.notes?.trim() || null,
      sort_order: idx,
    }));

  const { error } = await supabase.rpc('fn_replace_fixed_items', {
    p_cl_id: Number(clientId),
    p_kind: kind,
    p_items: payload,
  });

  if (error) throw error;
}

// =====================================================================
// Asignaciones mensuales (variables): restante por categoría/etiqueta
// =====================================================================

const ALLOCATION_SELECT = `
  bma_id,
  cl_id,
  bma_year,
  bma_month,
  bma_label,
  bma_amount,
  ct_id,
  sct_id,
  bma_sort_order,
  created_at,
  modified_at,
  category:category ( ct_id, ct_name ),
  subcategory:subcategory (
    sct_id,
    sct_name,
    category:category ( ct_id, ct_name )
  )
`;

export async function getMonthlyAllocations(clientId, year, month) {
  if (!clientId) return [];

  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('budget_monthly_allocation')
    .select(ALLOCATION_SELECT)
    .eq('cl_id', clientId)
    .eq('bma_year', year)
    .eq('bma_month', month)
    .order('bma_sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function saveMonthlyAllocations(clientId, year, month, items) {
  if (!clientId) throw new Error('Falta el cliente.');

  const payload = (items ?? [])
    .filter((it) => String(it.label ?? '').trim() !== '' && Number(it.amount) >= 0)
    .map((it, idx) => ({
      label: String(it.label).trim(),
      amount: Number(it.amount) || 0,
      ct_id: it.ct_id ? String(it.ct_id) : null,
      sct_id: it.sct_id ? String(it.sct_id) : null,
      sort_order: idx,
    }));

  const { error } = await supabase.rpc('fn_replace_monthly_allocations', {
    p_cl_id: Number(clientId),
    p_year: Number(year),
    p_month: Number(month),
    p_items: payload,
  });

  if (error) throw error;
}

// =====================================================================
// Resumen y evolución
// =====================================================================

export async function getBudgetSummary(clientId, year, month) {
  if (!clientId) return null;

  const { data, error } = await supabase.rpc('fn_budget_summary', {
    p_cl_id: Number(clientId),
    p_year: Number(year),
    p_month: Number(month),
  });

  if (error) throw error;
  return data ?? null;
}

export async function getBudgetEvolution(clientId, months = 6) {
  if (!clientId) return [];

  const { data, error } = await supabase.rpc('fn_budget_evolution', {
    p_cl_id: Number(clientId),
    p_months: Number(months),
  });

  if (error) throw error;
  return data ?? [];
}

export async function getDashboardBudgetSummary(clientId) {
  if (!clientId) {
    return {
      hasBudget: false,
      plannedIncome: 0,
      plannedExpense: 0,
      actualIncome: 0,
      actualExpense: 0,
      pctExpense: 0,
      unallocatedRemainder: 0,
    };
  }

  const now = new Date();
  const summary = await getBudgetSummary(clientId, now.getFullYear(), now.getMonth() + 1);
  if (!summary) {
    return {
      hasBudget: false,
      plannedIncome: 0,
      plannedExpense: 0,
      actualIncome: 0,
      actualExpense: 0,
      pctExpense: 0,
      unallocatedRemainder: 0,
    };
  }

  const plannedExpense = Number(summary.planned_expense_total ?? 0);
  const actualExpense = Number(summary.actual_expense ?? 0);
  const pctExpense = plannedExpense > 0
    ? Math.round((actualExpense / plannedExpense) * 100)
    : 0;

  return {
    hasBudget: Number(summary.planned_income ?? 0) > 0
      || Number(summary.planned_expense_total ?? 0) > 0,
    plannedIncome: Number(summary.planned_income ?? 0),
    plannedExpense,
    actualIncome: Number(summary.actual_income ?? 0),
    actualExpense,
    pctExpense,
    unallocatedRemainder: Number(summary.unallocated_remainder ?? 0),
    year: summary.year,
    month: summary.month,
  };
}

export function getCurrentMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function getMonthLabel(year, month) {
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('es-PA', { month: 'long', year: 'numeric' });
}
