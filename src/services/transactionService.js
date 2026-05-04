import { supabase } from '../lib/supabaseClient';

const TRANSACTION_SELECT = `
  tr_id,
  ac_id,
  ty_id,
  rtr_id,
  tr_name,
  tr_description,
  tr_amount,
  tr_date,
  tr_is_active,
  created_at,
  modified_at,
  account:account (
    ac_id,
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

const INITIAL_BALANCE_TRANSACTION_SELECT = `
  abh_id,
  ac_id,
  tr_id,
  abh_previous_balance,
  abh_change_amount,
  abh_new_balance,
  abh_movement_type,
  abh_description,
  created_at,
  account:account (
    ac_id,
    ac_name,
    ac_balance,
    ac_is_active
  )
`;

function validateTransactionPayload(transaction) {
  if (!transaction.ac_id) {
    throw new Error('Debes seleccionar una cuenta.');
  }

  if (!transaction.ty_id) {
    throw new Error('Debes seleccionar Entrada o Salida.');
  }

  if (!transaction.sct_id) {
    throw new Error('Debes seleccionar una categoría/subcategoría.');
  }

  if (!transaction.tr_name?.trim()) {
    throw new Error('El nombre de la transacción es obligatorio.');
  }

  if (!transaction.tr_date) {
    throw new Error('La fecha de la transacción es obligatoria.');
  }

  const amount = Number(transaction.tr_amount);

  if (!Number.isFinite(amount)) {
    throw new Error('El monto debe ser un número válido.');
  }

  if (amount <= 0) {
    throw new Error('El monto debe ser mayor a 0.');
  }

  return {
    ac_id: Number(transaction.ac_id),
    ty_id: Number(transaction.ty_id),
    sct_id: Number(transaction.sct_id),
    tr_name: transaction.tr_name.trim(),
    tr_description: transaction.tr_description?.trim() || null,
    tr_amount: amount,
    tr_date: transaction.tr_date,
  };
}

export async function getActiveTypeTransactions() {
  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('type_transaction')
    .select('ty_id, ty_name, ty_description')
    .eq('ty_is_active', true)
    .order('ty_id', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getActiveSubcategories() {
  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('subcategory')
    .select(`
      sct_id,
      sct_name,
      ct_id,
      category:category (
        ct_id,
        ct_name
      )
    `)
    .eq('sct_is_active', true)
    .order('sct_name', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getActiveTransactionsByAccountId(accountId) {
  if (!accountId) {
    return [];
  }

  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('transaction')
    .select(TRANSACTION_SELECT)
    .eq('ac_id', accountId)
    .eq('tr_is_active', true)
    .order('tr_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getInitialBalanceByAccountId(accountId) {
  if (!accountId) {
    return null;
  }

  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('account_balance_history')
    .select(INITIAL_BALANCE_TRANSACTION_SELECT)
    .eq('ac_id', accountId)
    .eq('abh_movement_type', 'initial_balance')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    movement_source: 'initial_balance',
  };
}

export async function getAccountTransactionsWithInitialBalance(accountId) {
  if (!accountId) {
    return [];
  }

  const [initialBalance, transactions] = await Promise.all([
    getInitialBalanceByAccountId(accountId),
    getActiveTransactionsByAccountId(accountId),
  ]);

  const normalizedTransactions = transactions.map((transaction) => ({
    ...transaction,
    movement_source: 'transaction',
  }));

  const result = initialBalance
    ? [initialBalance, ...normalizedTransactions]
    : normalizedTransactions;

  return result.sort((a, b) => {
    const dateA = new Date(a.tr_date || a.created_at).getTime();
    const dateB = new Date(b.tr_date || b.created_at).getTime();

    return dateB - dateA;
  });
}

export async function getTransactionById(transactionId) {
  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('transaction')
    .select(TRANSACTION_SELECT)
    .eq('tr_id', transactionId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function createTransaction(transaction) {
  const payload = validateTransactionPayload(transaction);

  const { data: newTransaction, error: transactionError } = await supabase
    .schema('ctrl_finance')
    .from('transaction')
    .insert({
      ac_id: payload.ac_id,
      ty_id: payload.ty_id,
      rtr_id: null,
      tr_name: payload.tr_name,
      tr_description: payload.tr_description,
      tr_amount: payload.tr_amount,
      tr_date: payload.tr_date,
      tr_is_active: true,
    })
    .select('tr_id')
    .single();

  if (transactionError) {
    throw transactionError;
  }

  const { error: subcategoryError } = await supabase
    .schema('ctrl_finance')
    .from('subcategories_transaction')
    .insert({
      tr_id: newTransaction.tr_id,
      sct_id: payload.sct_id,
      st_is_active: true,
    });

  if (subcategoryError) {
    throw subcategoryError;
  }

  return await getTransactionById(newTransaction.tr_id);
}

export async function updateTransaction(transactionId, transaction) {
  if (!transactionId) {
    throw new Error('Falta el ID de la transacción.');
  }

  const payload = validateTransactionPayload(transaction);

  const { error: transactionError } = await supabase
    .schema('ctrl_finance')
    .from('transaction')
    .update({
      ac_id: payload.ac_id,
      ty_id: payload.ty_id,
      tr_name: payload.tr_name,
      tr_description: payload.tr_description,
      tr_amount: payload.tr_amount,
      tr_date: payload.tr_date,
    })
    .eq('tr_id', transactionId);

  if (transactionError) {
    throw transactionError;
  }

  const { error: deactivateError } = await supabase
    .schema('ctrl_finance')
    .from('subcategories_transaction')
    .update({ st_is_active: false })
    .eq('tr_id', transactionId);

  if (deactivateError) {
    throw deactivateError;
  }

  const { error: insertSubcategoryError } = await supabase
    .schema('ctrl_finance')
    .from('subcategories_transaction')
    .insert({
      tr_id: transactionId,
      sct_id: payload.sct_id,
      st_is_active: true,
    });

  if (insertSubcategoryError) {
    throw insertSubcategoryError;
  }

  return await getTransactionById(transactionId);
}

export async function deactivateTransaction(transactionId) {
  if (!transactionId) {
    throw new Error('Falta el ID de la transacción.');
  }

  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('transaction')
    .update({ tr_is_active: false })
    .eq('tr_id', transactionId)
    .select(TRANSACTION_SELECT)
    .single();

  if (error) {
    throw error;
  }

  return data;
}