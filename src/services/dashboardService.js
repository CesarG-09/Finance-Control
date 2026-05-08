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

const INITIAL_BALANCE_SELECT = `
  abh_id,
  ac_id,
  tr_id,
  abh_previous_balance,
  abh_change_amount,
  abh_new_balance,
  abh_movement_type,
  abh_description,
  created_at,
  account:account!inner (
    ac_id,
    cl_id,
    ac_name,
    ac_balance,
    ac_is_active
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

export function getMovementSignedAmount(movement) {
  if (movement?.movement_source === 'initial_balance') {
    return Number(movement?.abh_change_amount ?? 0);
  }

  const amount = Number(movement?.tr_amount ?? 0);

  if (isExpenseTransaction(movement)) {
    return amount * -1;
  }

  return amount;
}

export function getMovementCategory(movement) {
  if (movement?.movement_source === 'initial_balance') {
    return 'Balance inicial';
  }

  const activeRelation = movement?.subcategories_transaction?.find(
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

async function getInitialBalanceMovementsByClientId(clientId, filters = {}, dateRange) {
  if (!clientId) {
    return [];
  }

  if (filters.typeId) {
    return [];
  }

  let query = supabase
    .schema('ctrl_finance')
    .from('account_balance_history')
    .select(INITIAL_BALANCE_SELECT)
    .eq('account.cl_id', clientId)
    .eq('account.ac_is_active', true)
    .eq('abh_movement_type', 'initial_balance')
    .gte('created_at', `${dateRange.startDate}T00:00:00`)
    .lte('created_at', `${dateRange.endDate}T23:59:59`);

  if (filters.accountId) {
    query = query.eq('ac_id', Number(filters.accountId));
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map((movement) => ({
    ...movement,
    movement_source: 'initial_balance',
  }));
}

export async function getMonthMovementsByClientId(clientId, filters = {}) {
  if (!clientId) {
    return [];
  }

  const dateRange = getMonthRange(filters.month);
  const { startDate, endDate } = dateRange;

  let transactionQuery = supabase
    .schema('ctrl_finance')
    .from('transaction')
    .select(MOVEMENT_SELECT)
    .eq('tr_is_active', true)
    .eq('account.cl_id', clientId)
    .eq('account.ac_is_active', true)
    .gte('tr_date', startDate)
    .lte('tr_date', endDate);

  if (filters.accountId) {
    transactionQuery = transactionQuery.eq('ac_id', Number(filters.accountId));
  }

  if (filters.typeId) {
    transactionQuery = transactionQuery.eq('ty_id', Number(filters.typeId));
  }

  const { data: transactionData, error: transactionError } = await transactionQuery;

  if (transactionError) {
    throw transactionError;
  }

  const transactions = (transactionData ?? []).map((movement) => ({
    ...movement,
    movement_source: 'transaction',
  }));

  const initialBalances = await getInitialBalanceMovementsByClientId(
    clientId,
    filters,
    dateRange
  );

  const sortDirection = filters.sortDirection === 'asc' ? 'asc' : 'desc';

  const movements = [...transactions, ...initialBalances].sort((a, b) => {
    const dateA = new Date(a.tr_date || a.created_at).getTime();
    const dateB = new Date(b.tr_date || b.created_at).getTime();

    if (dateA !== dateB) {
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    }

    const createdA = new Date(a.created_at).getTime();
    const createdB = new Date(b.created_at).getTime();

    return sortDirection === 'asc' ? createdA - createdB : createdB - createdA;
  });

  if (filters.limit) {
    return movements.slice(0, Number(filters.limit));
  }

  return movements;
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

  const [accounts, typeTransactions, monthlyMovements] = await Promise.all([
    getAccountsByClientId(clientId),
    getActiveTypeTransactions(),
    getMonthMovementsByClientId(clientId, {
      sortDirection: 'desc',
    }),
  ]);

  const activeAccounts = accounts.filter((account) => account.ac_is_active);

  const balanceTotal = activeAccounts.reduce(
    (total, account) => total + Number(account.ac_balance ?? 0),
    0
  );

  const transactionMovements = monthlyMovements.filter(
    (movement) => movement.movement_source !== 'initial_balance'
  );

  const monthlyIncome = transactionMovements
    .filter(isIncomeTransaction)
    .reduce((total, transaction) => total + Number(transaction.tr_amount ?? 0), 0);

  const monthlyExpense = transactionMovements
    .filter(isExpenseTransaction)
    .reduce((total, transaction) => total + Number(transaction.tr_amount ?? 0), 0);

  return {
    balanceTotal,
    monthlyIncome,
    monthlyExpense,
    monthlyNet: monthlyIncome - monthlyExpense,
    latestMovements: monthlyMovements.slice(0, 10),
    typeTransactions,
  };
}