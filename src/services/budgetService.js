import { supabase } from '../lib/supabaseClient';
import {
  getMonthRange,
  getMonthMovementsByClientId,
  isExpenseTransaction,
  isIncomeTransaction,
  isTransferMovement,
} from './dashboardService';
import { TRANSFER_SUBCATEGORY_NAME } from '../constants/specialSubcategories';

const BUDGET_SELECT = `
  bg_id,
  cl_id,
  bg_year,
  bg_month,
  bg_planned_income,
  bg_planned_expense_total,
  bg_notes,
  bg_is_active,
  created_at,
  modified_at,
  budget_item (
    bgi_id,
    bg_id,
    ct_id,
    sct_id,
    bgi_planned_amount,
    category:category (
      ct_id,
      ct_name
    ),
    subcategory:subcategory (
      sct_id,
      sct_name,
      ct_id
    )
  )
`;

function todayMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export async function getBudgetByMonth(clientId, year, month) {
  if (!clientId) return null;

  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('budget')
    .select(BUDGET_SELECT)
    .eq('cl_id', clientId)
    .eq('bg_year', year)
    .eq('bg_month', month)
    .eq('bg_is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function upsertBudgetHeader(clientId, { year, month, plannedIncome, plannedExpenseTotal, notes }) {
  if (!clientId) {
    throw new Error('Falta el cliente.');
  }
  const income = Number(plannedIncome);
  const expense = Number(plannedExpenseTotal);
  if (!Number.isFinite(income) || income < 0) {
    throw new Error('El ingreso planeado debe ser un número ≥ 0.');
  }
  if (!Number.isFinite(expense) || expense < 0) {
    throw new Error('El gasto planeado debe ser un número ≥ 0.');
  }

  const { data: bgId, error } = await supabase.rpc('fn_upsert_budget', {
    p_cl_id: Number(clientId),
    p_year: Number(year),
    p_month: Number(month),
    p_planned_income: income,
    p_planned_expense_total: expense,
    p_notes: notes?.trim() || null,
  });

  if (error) throw error;
  return bgId;
}

export async function saveBudgetItems(bgId, items) {
  if (!bgId) throw new Error('Falta el ID del presupuesto.');

  const payload = (items ?? [])
    .filter((it) => Number(it.planned_amount) >= 0 && (it.ct_id || it.sct_id))
    .map((it) => ({
      ct_id: it.ct_id ? String(it.ct_id) : null,
      sct_id: it.sct_id ? String(it.sct_id) : null,
      planned_amount: Number(it.planned_amount) || 0,
    }));

  const { error } = await supabase.rpc('fn_replace_budget_items', {
    p_bg_id: Number(bgId),
    p_items: payload,
  });

  if (error) throw error;
}

export async function getBudgetVsActual(clientId, year, month) {
  if (!clientId) return [];

  const { data, error } = await supabase.rpc('fn_budget_vs_actual', {
    p_cl_id: Number(clientId),
    p_year: Number(year),
    p_month: Number(month),
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
      categoriesOver: [],
    };
  }

  const { year, month } = todayMonth();

  const [budget, vsActual, monthly] = await Promise.all([
    getBudgetByMonth(clientId, year, month),
    getBudgetVsActual(clientId, year, month),
    getMonthMovementsByClientId(clientId, { sortDirection: 'desc' }),
  ]);

  const transactionMovements = monthly.filter(
    (m) => m.movement_source !== 'initial_balance' && !isTransferMovement(m)
  );

  const actualIncome = transactionMovements
    .filter(isIncomeTransaction)
    .reduce((acc, t) => acc + Number(t.tr_amount ?? 0), 0);

  const actualExpense = transactionMovements
    .filter(isExpenseTransaction)
    .reduce((acc, t) => acc + Number(t.tr_amount ?? 0), 0);

  // Categorías excedidas
  const overByCategory = new Map();
  for (const row of vsActual) {
    if (row.status === 'over') {
      const label = row.level === 'subcategory'
        ? `${row.ct_name ?? '—'} / ${row.sct_name ?? '—'}`
        : row.ct_name ?? '—';
      overByCategory.set(label, true);
    }
  }

  const plannedExpense = Number(budget?.bg_planned_expense_total ?? 0);
  const plannedIncome = Number(budget?.bg_planned_income ?? 0);
  const pctExpense = plannedExpense > 0
    ? Math.round((actualExpense / plannedExpense) * 100)
    : 0;

  return {
    hasBudget: Boolean(budget),
    plannedIncome,
    plannedExpense,
    actualIncome,
    actualExpense,
    pctExpense,
    categoriesOver: Array.from(overByCategory.keys()),
    year,
    month,
  };
}

export async function copyBudgetFromPreviousMonth(clientId, year, month) {
  const prev = new Date(Number(year), Number(month) - 2, 1);
  const prevYear = prev.getFullYear();
  const prevMonth = prev.getMonth() + 1;

  const previous = await getBudgetByMonth(clientId, prevYear, prevMonth);
  if (!previous) {
    throw new Error(`No hay presupuesto del mes anterior (${prevMonth}/${prevYear}).`);
  }

  const bgId = await upsertBudgetHeader(clientId, {
    year,
    month,
    plannedIncome: previous.bg_planned_income,
    plannedExpenseTotal: previous.bg_planned_expense_total,
    notes: previous.bg_notes,
  });

  const items = (previous.budget_item ?? []).map((it) => ({
    ct_id: it.ct_id,
    sct_id: it.sct_id,
    planned_amount: it.bgi_planned_amount,
  }));

  await saveBudgetItems(bgId, items);
  return bgId;
}

export function getCurrentMonth() {
  return todayMonth();
}

export function getMonthLabel(year, month) {
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('es-PA', { month: 'long', year: 'numeric' });
}

export { getMonthRange, TRANSFER_SUBCATEGORY_NAME };
