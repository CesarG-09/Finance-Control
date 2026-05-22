import { supabase } from '../lib/supabaseClient';

const RECURRING_TRANSACTION_SELECT = `
  rtr_id,
  fr_id,
  ac_id,
  ty_id,
  rtr_name,
  rtr_description,
  rtr_estimated_amount,
  rtr_reference_day,
  rtr_start_date,
  rtr_finish_date,
  rtr_is_active,
  created_at,
  modified_at,
  frequency:frequency (
    fr_id,
    fr_name
  ),
  account:account (
    ac_id,
    ac_name
  ),
  transaction_type:type_transaction (
    ty_id,
    ty_name
  ),
  recurrent_transaction_subcategory (
    rts_id,
    sct_id,
    rts_is_active,
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

export async function getFrequencies() {
  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('frequency')
    .select('fr_id, fr_name')
    .eq('fr_is_active', true)
    .order('fr_id', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getActiveRecurringTransactions() {
  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('recurrent_transaction')
    .select(RECURRING_TRANSACTION_SELECT)
    .eq('rtr_is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getRecurringTransactionById(rtrId) {
  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('recurrent_transaction')
    .select(RECURRING_TRANSACTION_SELECT)
    .eq('rtr_id', rtrId)
    .single();

  if (error) throw error;
  return data;
}

function validateRecurringTransactionPayload(transaction) {
  if (!transaction.ac_id) throw new Error('Debes seleccionar una cuenta.');
  if (!transaction.ty_id) throw new Error('Debes seleccionar Entrada o Salida.');
  if (!transaction.fr_id) throw new Error('Debes seleccionar una frecuencia.');
  if (!transaction.rtr_name?.trim()) throw new Error('El nombre es obligatorio.');
  if (!transaction.rtr_start_date) throw new Error('La fecha de inicio es obligatoria.');

  if (!Array.isArray(transaction.sct_ids) || transaction.sct_ids.length === 0) {
    throw new Error('Debes seleccionar al menos una subcategoría.');
  }

  const amount = Number(transaction.rtr_estimated_amount);
  if (!Number.isFinite(amount)) throw new Error('El monto debe ser un número válido.');
  if (amount <= 0) throw new Error('El monto debe ser mayor a 0.');

  const freqName = transaction.fr_name;

  // reference_day is required only for Semanal and Mensual
  if (freqName === 'Semanal' || freqName === 'Mensual') {
    const refDay = Number(transaction.rtr_reference_day);
    if (!Number.isInteger(refDay)) throw new Error('El día de referencia es obligatorio.');

    if (freqName === 'Semanal' && (refDay < 0 || refDay > 6)) {
      throw new Error('El día de la semana debe estar entre 0 (domingo) y 6 (sábado).');
    }
    if (freqName === 'Mensual' && (refDay < 1 || refDay > 31)) {
      throw new Error('El día del mes debe estar entre 1 y 31.');
    }
  }

  // For Anual, Quincenal and Diaria, reference_day is derived from start_date or ignored
  const referenceDay = (() => {
    if (freqName === 'Semanal') return Number(transaction.rtr_reference_day);
    if (freqName === 'Mensual') return Number(transaction.rtr_reference_day);
    if (freqName === 'Anual') {
      // Store the day-of-month from start_date so generation can use it
      return new Date(transaction.rtr_start_date).getDate();
    }
    return 1; // unused for Diaria and Quincenal
  })();

  return {
    ac_id: Number(transaction.ac_id),
    ty_id: Number(transaction.ty_id),
    fr_id: Number(transaction.fr_id),
    fr_name: freqName,
    rtr_name: transaction.rtr_name.trim(),
    rtr_description: transaction.rtr_description?.trim() || null,
    rtr_estimated_amount: amount,
    rtr_reference_day: referenceDay,
    rtr_start_date: transaction.rtr_start_date,
    rtr_finish_date: transaction.rtr_finish_date || null,
    sct_ids: transaction.sct_ids.map(id => Number(id)),
  };
}

export async function createRecurringTransaction(transaction) {
  const payload = validateRecurringTransactionPayload(transaction);

  const { data: newRtr, error: rtrError } = await supabase
    .schema('ctrl_finance')
    .from('recurrent_transaction')
    .insert({
      ac_id: payload.ac_id,
      ty_id: payload.ty_id,
      fr_id: payload.fr_id,
      rtr_name: payload.rtr_name,
      rtr_description: payload.rtr_description,
      rtr_estimated_amount: payload.rtr_estimated_amount,
      rtr_reference_day: payload.rtr_reference_day,
      rtr_start_date: payload.rtr_start_date,
      rtr_finish_date: payload.rtr_finish_date,
      rtr_is_active: true,
    })
    .select('rtr_id')
    .single();

  if (rtrError) throw rtrError;

  const subcategoryInserts = payload.sct_ids.map(sct_id => ({
    rtr_id: newRtr.rtr_id,
    sct_id,
    rts_is_active: true,
  }));

  const { error: subcategoryError } = await supabase
    .schema('ctrl_finance')
    .from('recurrent_transaction_subcategory')
    .insert(subcategoryInserts);

  if (subcategoryError) throw subcategoryError;

  return await getRecurringTransactionById(newRtr.rtr_id);
}

export async function updateRecurringTransaction(rtrId, transaction) {
  if (!rtrId) throw new Error('Falta el ID de la transacción recurrente.');

  const payload = validateRecurringTransactionPayload(transaction);

  const { error: rtrError } = await supabase
    .schema('ctrl_finance')
    .from('recurrent_transaction')
    .update({
      ac_id: payload.ac_id,
      ty_id: payload.ty_id,
      fr_id: payload.fr_id,
      rtr_name: payload.rtr_name,
      rtr_description: payload.rtr_description,
      rtr_estimated_amount: payload.rtr_estimated_amount,
      rtr_reference_day: payload.rtr_reference_day,
      rtr_start_date: payload.rtr_start_date,
      rtr_finish_date: payload.rtr_finish_date,
    })
    .eq('rtr_id', rtrId);

  if (rtrError) throw rtrError;

  await supabase
    .schema('ctrl_finance')
    .from('recurrent_transaction_subcategory')
    .update({ rts_is_active: false })
    .eq('rtr_id', rtrId);

  const subcategoryInserts = payload.sct_ids.map(sct_id => ({
    rtr_id,
    sct_id,
    rts_is_active: true,
  }));

  const { error: insertSubcategoryError } = await supabase
    .schema('ctrl_finance')
    .from('recurrent_transaction_subcategory')
    .insert(subcategoryInserts);

  if (insertSubcategoryError) throw insertSubcategoryError;

  return await getRecurringTransactionById(rtrId);
}

export async function deactivateRecurringTransaction(rtrId) {
  if (!rtrId) throw new Error('Falta el ID de la transacción recurrente.');

  const { error } = await supabase
    .schema('ctrl_finance')
    .from('recurrent_transaction')
    .update({ rtr_is_active: false })
    .eq('rtr_id', rtrId);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Date generation helpers
// ---------------------------------------------------------------------------

/**
 * Returns all dates from startDate up to endDate (exclusive of future)
 * for the given frequency. referenceDay semantics:
 *   Semanal  → 0 (sun) … 6 (sat), JavaScript getDay() convention
 *   Mensual  → 1 … 31  (day of month; clamped to last day of each month)
 *   Anual    → stored as day-of-month from rtr_start_date (month from start_date)
 *   Diaria   → unused
 *   Quincenal→ unused (always 15-day intervals from startDate)
 */
function generateDatesForFrequency(frequency, startDate, referenceDay, endDate) {
  const dates = [];
  const startTs = new Date(startDate);
  startTs.setHours(0, 0, 0, 0);
  const endTs = endDate ? new Date(endDate) : new Date();
  endTs.setHours(23, 59, 59, 999);

  if (startTs > endTs) return dates;

  if (frequency === 'Diaria') {
    const cur = new Date(startTs);
    while (cur <= endTs) {
      dates.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
  } else if (frequency === 'Semanal') {
    // Advance from startDate to first occurrence of targetDayOfWeek >= startDate
    const target = Number(referenceDay); // 0-6
    const cur = new Date(startTs);
    const diff = (target - cur.getDay() + 7) % 7;
    cur.setDate(cur.getDate() + diff);

    while (cur <= endTs) {
      dates.push(new Date(cur));
      cur.setDate(cur.getDate() + 7);
    }
  } else if (frequency === 'Quincenal') {
    const cur = new Date(startTs);
    while (cur <= endTs) {
      dates.push(new Date(cur));
      cur.setDate(cur.getDate() + 15);
    }
  } else if (frequency === 'Mensual') {
    const targetDay = Number(referenceDay); // 1-31
    // Start from the month of startDate
    const cur = new Date(startTs.getFullYear(), startTs.getMonth(), 1);

    while (cur <= endTs) {
      const lastDay = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
      const day = Math.min(targetDay, lastDay);
      const candidate = new Date(cur.getFullYear(), cur.getMonth(), day);
      candidate.setHours(0, 0, 0, 0);

      if (candidate >= startTs && candidate <= endTs) {
        dates.push(candidate);
      }

      cur.setMonth(cur.getMonth() + 1);
    }
  } else if (frequency === 'Anual') {
    // Repeat every year on the same month and day as the start_date
    const originMonth = startTs.getMonth();
    const originDay = startTs.getDate();
    const cur = new Date(startTs.getFullYear(), originMonth, originDay);
    cur.setHours(0, 0, 0, 0);

    while (cur <= endTs) {
      if (cur >= startTs) {
        dates.push(new Date(cur));
      }
      cur.setFullYear(cur.getFullYear() + 1);
    }
  }

  return dates;
}

function toDateOnlyString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function generatePendingTransactions() {
  try {
    const recurringTransactions = await getActiveRecurringTransactions();
    if (!recurringTransactions.length) return;

    for (const rtr of recurringTransactions) {
      const freqName = rtr.frequency?.fr_name;
      if (!freqName) continue;

      const activeSubcategories = (rtr.recurrent_transaction_subcategory ?? []).filter(
        st => st.rts_is_active
      );
      if (!activeSubcategories.length) continue;

      const dates = generateDatesForFrequency(
        freqName,
        rtr.rtr_start_date,
        rtr.rtr_reference_day,
        rtr.rtr_finish_date
      );

      for (const date of dates) {
        const dateStr = toDateOnlyString(date);

        const { data: existing, error: checkError } = await supabase
          .schema('ctrl_finance')
          .from('transaction')
          .select('tr_id')
          .eq('rtr_id', rtr.rtr_id)
          .gte('tr_date', `${dateStr}T00:00:00`)
          .lte('tr_date', `${dateStr}T23:59:59`)
          .limit(1)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking existing transaction:', checkError);
          continue;
        }

        if (!existing) {
          const { data: newTr, error: trError } = await supabase
            .schema('ctrl_finance')
            .from('transaction')
            .insert({
              ac_id: rtr.ac_id,
              ty_id: rtr.ty_id,
              rtr_id: rtr.rtr_id,
              tr_name: rtr.rtr_name,
              tr_description: rtr.rtr_description,
              tr_amount: rtr.rtr_estimated_amount,
              tr_date: `${dateStr}T00:00:00`,
              tr_time: '00:00:00',
              tr_is_active: true,
            })
            .select('tr_id')
            .single();

          if (trError) {
            console.error('Error creating recurring instance:', trError);
            continue;
          }

          const subcategoryInserts = activeSubcategories.map(s => ({
            tr_id: newTr.tr_id,
            sct_id: s.sct_id,
            st_is_active: true,
          }));

          const { error: sctError } = await supabase
            .schema('ctrl_finance')
            .from('subcategories_transaction')
            .insert(subcategoryInserts);

          if (sctError) {
            console.error('Error creating subcategory links:', sctError);
          }
        }
      }
    }
  } catch (err) {
    console.error('generatePendingTransactions error:', err);
  }
}

/**
 * Returns the next date this recurring rule will generate a transaction,
 * or null if it has already ended.
 */
export function calculateNextGenerationDate(freqName, referenceDay, startDate, finishDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (finishDate && new Date(finishDate) < today) return null;

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  if (freqName === 'Diaria') {
    const next = today < start ? new Date(start) : new Date(today);
    next.setDate(next.getDate() + (next.getTime() === today.getTime() ? 1 : 0));
    return next;
  }

  if (freqName === 'Semanal') {
    const target = Number(referenceDay); // 0-6
    const cur = today < start ? new Date(start) : new Date(today);
    const diff = (target - cur.getDay() + 7) % 7 || 7;
    cur.setDate(cur.getDate() + diff);
    return cur;
  }

  if (freqName === 'Quincenal') {
    // Next occurrence = start + k*15 days where the candidate > today
    const cur = new Date(start);
    while (cur <= today) {
      cur.setDate(cur.getDate() + 15);
    }
    return cur;
  }

  if (freqName === 'Mensual') {
    const targetDay = Number(referenceDay);
    const base = today < start ? new Date(start.getFullYear(), start.getMonth(), 1)
                               : new Date(today.getFullYear(), today.getMonth(), 1);

    for (let i = 0; i < 13; i++) {
      const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
      const candidate = new Date(base.getFullYear(), base.getMonth(), Math.min(targetDay, lastDay));
      if (candidate > today && candidate >= start) return candidate;
      base.setMonth(base.getMonth() + 1);
    }
    return null;
  }

  if (freqName === 'Anual') {
    const originMonth = new Date(startDate).getMonth();
    const originDay = new Date(startDate).getDate();
    const base = today < start ? new Date(start.getFullYear(), originMonth, originDay)
                               : new Date(today.getFullYear(), originMonth, originDay);

    for (let i = 0; i < 5; i++) {
      if (base > today && base >= start) return new Date(base);
      base.setFullYear(base.getFullYear() + 1);
    }
    return null;
  }

  return null;
}
