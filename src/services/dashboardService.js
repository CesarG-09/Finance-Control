import { supabase } from '../lib/supabaseClient';
import { getAccountsByClientId } from './accountService';
import { getActiveTypeTransactions } from './transactionService';

const MOVEMENT_SELECT = `
  tr_id,
  ac_id,
  ty_id,
  tr_name,
  tr_description,
  tr_amount,
  tr_date,
  tr_is_active,
  created_at,
  account:account!inner (
    ac_id,
    cl_id,
    ac_name,
    ac_balance,
    ac_is_active
  ),
  transaction_type:type_transaction (
    ty_id,
    ty_name
  ),
  subcategories_transaction (
    st_id,
    sct_id,
    tr_id,
    st_is_active,
    subcategory:subcategory (
      sct_id,
      sct_name,
      category:category (
        ct_id,
        ct_name
      )
    )
  )
`;

function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getMonthRange(monthValue, referenceDate = new Date()) {
  if (!monthValue) {
    const year = referenceDate.getFullYear();
    const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
    monthValue = `${year}-${month}`;
  }

  const [year, month] = monthValue.split('-').map(Number);

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  return {
    startDate: toDateString(startDate),
    endDate: toDateString(endDate),
  };
}

export function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function isIncomeTransaction(transaction) {
  return normalizeText(transaction?.transaction_type?.ty_name) === 'entrada';
}

export function isExpenseTransaction(transaction) {
  return normalizeText(transaction?.transaction_type?.ty_name) === 'salida';
}

export function getMovementSignedAmount(transaction) {
  const amount = Number(transaction?.tr_amount ?? 0);

  if (isExpenseTransaction(transaction)) {
    return amount * -1;
  }

  return amount;
}

export function getMovementCategory(transaction) {
  const activeRelation = transaction?.subcategories_transaction?.find(
    (item) => item.st_is_active
  );

  const categoryName = activeRelation?.subcategory?.category?.ct_name;
  const subcategoryName = activeRelation?.subcategory?.sct_name;

  if (!categoryName && !subcategoryName) {
    return 'Sin categoría';
  }

  return `${categoryName || 'Sin categoría'} - ${
    subcategoryName || 'Sin subcategoría'
  }`;
}

export async function getMonthMovementsByClientId(clientId, filters = {}) {
  if (!clientId) {
    return [];
  }

  const { startDate, endDate } = getMonthRange(filters.month);

  let query = supabase
    .schema('ctrl_finance')
    .from('transaction')
    .select(MOVEMENT_SELECT)
    .eq('tr_is_active', true)
    .eq('account.cl_id', clientId)
    .gte('tr_date', startDate)
    .lte('tr_date', endDate)
    .order('tr_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters.accountId) {
    query = query.eq('ac_id', Number(filters.accountId));
  }

  if (filters.typeId) {
    query = query.eq('ty_id', Number(filters.typeId));
  }

  if (filters.limit) {
    query = query.limit(Number(filters.limit));
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getDashboardSummary(clientId) {
  if (!clientId) {
    return {
      balanceTotal: 0,
      monthlyIncome: 0,
      monthlyExpense: 0,
      monthlyNet: 0,
      latestMovements: [],
    };
  }

  const [accounts, typeTransactions, movements] = await Promise.all([
    getAccountsByClientId(clientId),
    getActiveTypeTransactions(),
    getMonthMovementsByClientId(clientId, { limit: 10 }),
  ]);

  const activeAccounts = accounts.filter((account) => account.ac_is_active);

  const balanceTotal = activeAccounts.reduce(
    (total, account) => total + Number(account.ac_balance ?? 0),
    0
  );

  const monthlyIncome = movements
    .filter(isIncomeTransaction)
    .reduce((total, transaction) => total + Number(transaction.tr_amount ?? 0), 0);

  const monthlyExpense = movements
    .filter(isExpenseTransaction)
    .reduce((total, transaction) => total + Number(transaction.tr_amount ?? 0), 0);

  return {
    balanceTotal,
    monthlyIncome,
    monthlyExpense,
    monthlyNet: monthlyIncome - monthlyExpense,
    latestMovements: movements,
    typeTransactions,
  };
}