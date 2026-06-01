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
  ),
  account_card:account_card (
    acc_id,
    ac_id,
    acc_cut_day,
    acc_pay_day,
    acc_debt_amount,
    acc_interest_rate,
    acc_credit_limit,
    acc_is_active
  )
`;

export const CREDIT_CARD_TA_ID = 1;

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
    .eq('ac_is_delete', false)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  // account_card es un array por la relación; aplanar al primer elemento
  return (data ?? []).map((account) => ({
    ...account,
    account_card: Array.isArray(account.account_card)
      ? account.account_card[0] ?? null
      : account.account_card ?? null,
  }));
}

async function createCreditCardAccount(clientId, account) {
  const creditLimit = Number(account.acc_credit_limit);
  const debtAmount = Number(account.acc_debt_amount ?? 0);
  const cutDay = Number(account.acc_cut_day);
  const payDay = Number(account.acc_pay_day);
  const interestRate = Number(account.acc_interest_rate ?? 0);

  if (!Number.isFinite(creditLimit) || creditLimit <= 0) {
    throw new Error('El límite de crédito debe ser mayor a 0.');
  }
  if (!Number.isFinite(debtAmount) || debtAmount < 0) {
    throw new Error('La deuda inicial no puede ser negativa.');
  }
  if (debtAmount > creditLimit) {
    throw new Error('La deuda inicial no puede exceder el límite de crédito.');
  }
  if (!Number.isInteger(cutDay) || cutDay < 1 || cutDay > 31) {
    throw new Error('Día de corte inválido (1-31).');
  }
  if (!Number.isInteger(payDay) || payDay < 1 || payDay > 31) {
    throw new Error('Día de pago inválido (1-31).');
  }
  if (!Number.isFinite(interestRate) || interestRate < 0 || interestRate > 100) {
    throw new Error('Tasa de interés inválida (0-100).');
  }

  const { data: acId, error } = await supabase.rpc('fn_create_credit_card_account', {
    p_cl_id: Number(clientId),
    p_ac_name: account.ac_name.trim(),
    p_ac_description: account.ac_description?.trim() || null,
    p_credit_limit: creditLimit,
    p_debt_amount: debtAmount,
    p_cut_day: cutDay,
    p_pay_day: payDay,
    p_interest_rate: interestRate,
  });

  if (error) throw error;

  const { data, error: fetchError } = await supabase
    .schema('ctrl_finance')
    .from('account')
    .select(ACCOUNT_SELECT)
    .eq('ac_id', acId)
    .single();

  if (fetchError) throw fetchError;

  return {
    ...data,
    account_card: Array.isArray(data.account_card)
      ? data.account_card[0] ?? null
      : data.account_card ?? null,
  };
}

export async function createAccount(clientId, account) {
  if (!clientId) {
    throw new Error('No existe perfil de cliente para crear la cuenta.');
  }

  const taId = Number(account.ta_id);

  if (taId === CREDIT_CARD_TA_ID) {
    return await createCreditCardAccount(clientId, account);
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
    ta_id: taId,
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

  // Si es TC, permitir actualizar metadatos de la tarjeta (excepto deuda)
  if (Number(account.ta_id) === CREDIT_CARD_TA_ID) {
    const cardPayload = {};
    if (account.acc_credit_limit !== undefined && account.acc_credit_limit !== '') {
      const limit = Number(account.acc_credit_limit);
      if (Number.isFinite(limit) && limit > 0) cardPayload.acc_credit_limit = limit;
    }
    if (account.acc_cut_day !== undefined && account.acc_cut_day !== '') {
      const day = Number(account.acc_cut_day);
      if (Number.isInteger(day) && day >= 1 && day <= 31) cardPayload.acc_cut_day = day;
    }
    if (account.acc_pay_day !== undefined && account.acc_pay_day !== '') {
      const day = Number(account.acc_pay_day);
      if (Number.isInteger(day) && day >= 1 && day <= 31) cardPayload.acc_pay_day = day;
    }
    if (account.acc_interest_rate !== undefined && account.acc_interest_rate !== '') {
      const rate = Number(account.acc_interest_rate);
      if (Number.isFinite(rate) && rate >= 0 && rate <= 100) cardPayload.acc_interest_rate = rate;
    }

    if (Object.keys(cardPayload).length > 0) {
      const { error: cardError } = await supabase
        .schema('ctrl_finance')
        .from('account_card')
        .update(cardPayload)
        .eq('ac_id', accountId);

      if (cardError) throw cardError;
    }
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

// Eliminación lógica: marca la cuenta como ac_is_delete=true. La cuenta
// desaparece de toda la UI (queries filtran ac_is_delete=false), pero el
// registro permanece en BD por trazabilidad. Sólo permitido sobre cuentas
// ya desactivadas.
export async function softDeleteAccount(clientId, accountId) {
  if (!clientId || !accountId) {
    throw new Error('Faltan datos para eliminar la cuenta.');
  }

  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('account')
    .update({ ac_is_delete: true, ac_is_active: false })
    .eq('ac_id', accountId)
    .eq('cl_id', clientId)
    .select('ac_id, ac_is_delete, ac_is_active')
    .single();

  if (error) {
    throw error;
  }

  return data;
}
