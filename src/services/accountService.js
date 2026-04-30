import { supabase } from '../lib/supabaseClient';

const ACCOUNT_SELECT = `
  ac_id,
  cl_id,
  ta_id,
  ac_name,
  ac_description,
  ac_balance,
  ac_is_active,
  created_at,
  modified_at,
  account_type:type_account (
    ta_id,
    ta_name
  )
`;

export async function getActiveTypeAccounts() {
  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('type_account')
    .select('ta_id, ta_name, ta_description')
    .eq('ta_is_active', true)
    .order('ta_name', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getAccountsByClientId(clientId) {
  if (!clientId) {
    return [];
  }

  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('account')
    .select(ACCOUNT_SELECT)
    .eq('cl_id', clientId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createAccount(clientId, account) {
  if (!clientId) {
    throw new Error('No existe perfil de cliente para crear la cuenta.');
  }

    const initialBalance = Number(account.ac_balance);

    if (!Number.isFinite(initialBalance)) {
    throw new Error('El balance inicial debe ser un número válido.');
    }

    if (initialBalance < 0) {
    throw new Error('El balance inicial no puede ser negativo.');
    }

  const payload = {
    cl_id: clientId,
    ta_id: Number(account.ta_id),
    ac_name: account.ac_name.trim(),
    ac_description: account.ac_description?.trim() || null,
    ac_balance: initialBalance,
    ac_is_active: true,
  };

  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('account')
    .insert(payload)
    .select(ACCOUNT_SELECT)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateAccount(clientId, accountId, account) {
  if (!clientId || !accountId) {
    throw new Error('Faltan datos para actualizar la cuenta.');
  }

  const payload = {
    ta_id: Number(account.ta_id),
    ac_name: account.ac_name.trim(),
    ac_description: account.ac_description?.trim() || null,
  };

  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('account')
    .update(payload)
    .eq('ac_id', accountId)
    .eq('cl_id', clientId)
    .select(ACCOUNT_SELECT)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deactivateAccount(clientId, accountId) {
  if (!clientId || !accountId) {
    throw new Error('Faltan datos para desactivar la cuenta.');
  }

  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('account')
    .update({ ac_is_active: false })
    .eq('ac_id', accountId)
    .eq('cl_id', clientId)
    .select(ACCOUNT_SELECT)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function reactivateAccount(clientId, accountId) {
  if (!clientId || !accountId) {
    throw new Error('Faltan datos para reactivar la cuenta.');
  }

  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('account')
    .update({ ac_is_active: true })
    .eq('ac_id', accountId)
    .eq('cl_id', clientId)
    .select(ACCOUNT_SELECT)
    .single();

  if (error) {
    throw error;
  }

  return data;
}