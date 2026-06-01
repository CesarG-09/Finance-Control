import { supabase } from '../lib/supabaseClient';

const CARD_SELECT = `
  acc_id,
  ac_id,
  acc_cut_day,
  acc_pay_day,
  acc_debt_amount,
  acc_interest_rate,
  acc_credit_limit,
  acc_is_active,
  created_at,
  modified_at
`;

export async function getCardByAccountId(accountId) {
  if (!accountId) return null;

  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('account_card')
    .select(CARD_SELECT)
    .eq('ac_id', accountId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function updateCard(accountId, payload) {
  if (!accountId) {
    throw new Error('Falta el ID de cuenta.');
  }

  const updatePayload = {};

  if (payload.acc_credit_limit !== undefined) {
    const limit = Number(payload.acc_credit_limit);
    if (!Number.isFinite(limit) || limit <= 0) {
      throw new Error('El límite de crédito debe ser mayor a 0.');
    }
    updatePayload.acc_credit_limit = limit;
  }

  if (payload.acc_cut_day !== undefined) {
    const day = Number(payload.acc_cut_day);
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      throw new Error('Día de corte inválido.');
    }
    updatePayload.acc_cut_day = day;
  }

  if (payload.acc_pay_day !== undefined) {
    const day = Number(payload.acc_pay_day);
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      throw new Error('Día de pago inválido.');
    }
    updatePayload.acc_pay_day = day;
  }

  if (payload.acc_interest_rate !== undefined) {
    const rate = Number(payload.acc_interest_rate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      throw new Error('Tasa de interés inválida.');
    }
    updatePayload.acc_interest_rate = rate;
  }

  if (Object.keys(updatePayload).length === 0) {
    return await getCardByAccountId(accountId);
  }

  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('account_card')
    .update(updatePayload)
    .eq('ac_id', accountId)
    .select(CARD_SELECT)
    .single();

  if (error) throw error;
  return data;
}

function lastDayOfMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function clampDayToMonth(day, year, monthIndex) {
  return Math.min(day, lastDayOfMonth(year, monthIndex));
}

function nextOccurrence(referenceDay, fromDate = new Date()) {
  const year = fromDate.getFullYear();
  const month = fromDate.getMonth();
  const day = fromDate.getDate();

  const thisMonthDay = clampDayToMonth(referenceDay, year, month);

  if (day <= thisMonthDay) {
    return new Date(year, month, thisMonthDay);
  }

  const nextMonth = month + 1;
  const nextMonthDay = clampDayToMonth(referenceDay, year, nextMonth);
  return new Date(year, nextMonth, nextMonthDay);
}

export function getUtilizationStats(card) {
  if (!card) {
    return {
      limit: 0,
      debt: 0,
      available: 0,
      utilizationPct: 0,
      nextCutDate: null,
      nextPayDate: null,
    };
  }

  const limit = Number(card.acc_credit_limit ?? 0);
  const debt = Number(card.acc_debt_amount ?? 0);
  const available = Math.max(limit - debt, 0);
  const utilizationPct = limit > 0 ? Math.min((debt / limit) * 100, 100) : 0;

  return {
    limit,
    debt,
    available,
    utilizationPct,
    nextCutDate: nextOccurrence(Number(card.acc_cut_day)),
    nextPayDate: nextOccurrence(Number(card.acc_pay_day)),
  };
}

export { clampDayToMonth, lastDayOfMonth };
