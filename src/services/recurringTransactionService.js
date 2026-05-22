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

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getActiveRecurringTransactions() {
  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('recurrent_transaction')
    .select(RECURRING_TRANSACTION_SELECT)
    .eq('rtr_is_active', true)
    .order('rtr_start_date', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getRecurringTransactionById(rtrId) {
  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('recurrent_transaction')
    .select(RECURRING_TRANSACTION_SELECT)
    .eq('rtr_id', rtrId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

function validateRecurringTransactionPayload(transaction) {
  if (!transaction.ac_id) {
    throw new Error('Debes seleccionar una cuenta.');
  }

  if (!transaction.ty_id) {
    throw new Error('Debes seleccionar Entrada o Salida.');
  }

  if (!transaction.fr_id) {
    throw new Error('Debes seleccionar una frecuencia.');
  }

  if (!transaction.rtr_name?.trim()) {
    throw new Error('El nombre de la transacción recurrente es obligatorio.');
  }

  if (!transaction.rtr_start_date) {
    throw new Error('La fecha de inicio es obligatoria.');
  }

  if (!Array.isArray(transaction.sct_ids) || transaction.sct_ids.length === 0) {
    throw new Error('Debes seleccionar al menos una categoría/subcategoría.');
  }

  const amount = Number(transaction.rtr_estimated_amount);

  if (!Number.isFinite(amount)) {
    throw new Error('El monto debe ser un número válido.');
  }

  if (amount <= 0) {
    throw new Error('El monto debe ser mayor a 0.');
  }

  const referenceDay = Number(transaction.rtr_reference_day);
  if (!Number.isInteger(referenceDay) || referenceDay < 1 || referenceDay > 31) {
    throw new Error('El día de referencia debe estar entre 1 y 31.');
  }

  return {
    ac_id: Number(transaction.ac_id),
    ty_id: Number(transaction.ty_id),
    fr_id: Number(transaction.fr_id),
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

  const { data: newRecurringTransaction, error: rtrError } = await supabase
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

  if (rtrError) {
    throw rtrError;
  }

  const subcategoryInserts = payload.sct_ids.map(sct_id => ({
    rtr_id: newRecurringTransaction.rtr_id,
    sct_id,
    rts_is_active: true,
  }));

  const { error: subcategoryError } = await supabase
    .schema('ctrl_finance')
    .from('recurrent_transaction_subcategory')
    .insert(subcategoryInserts);

  if (subcategoryError) {
    throw subcategoryError;
  }

  return await getRecurringTransactionById(newRecurringTransaction.rtr_id);
}

export async function updateRecurringTransaction(rtrId, transaction) {
  if (!rtrId) {
    throw new Error('Falta el ID de la transacción recurrente.');
  }

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

  if (rtrError) {
    throw rtrError;
  }

  const { error: deactivateError } = await supabase
    .schema('ctrl_finance')
    .from('recurrent_transaction_subcategory')
    .update({ rts_is_active: false })
    .eq('rtr_id', rtrId);

  if (deactivateError) {
    throw deactivateError;
  }

  const subcategoryInserts = payload.sct_ids.map(sct_id => ({
    rtr_id,
    sct_id,
    rts_is_active: true,
  }));

  const { error: insertSubcategoryError } = await supabase
    .schema('ctrl_finance')
    .from('recurrent_transaction_subcategory')
    .insert(subcategoryInserts);

  if (insertSubcategoryError) {
    throw insertSubcategoryError;
  }

  return await getRecurringTransactionById(rtrId);
}

export async function deactivateRecurringTransaction(rtrId) {
  if (!rtrId) {
    throw new Error('Falta el ID de la transacción recurrente.');
  }

  const { error } = await supabase
    .schema('ctrl_finance')
    .from('recurrent_transaction')
    .update({ rtr_is_active: false })
    .eq('rtr_id', rtrId);

  if (error) {
    throw error;
  }
}

function generateDatesForFrequency(frequency, startDate, referenceDay, endDate) {
  const dates = [];
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();

  if (frequency === 'Diaria') {
    const current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
  } else if (frequency === 'Semanal') {
    const targetDayOfWeek = referenceDay;
    const current = new Date(start);
    const startDayDiff = (targetDayOfWeek - current.getDay() + 7) % 7;
    current.setDate(current.getDate() + (startDayDiff === 0 ? 0 : startDayDiff));

    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }
  } else if (frequency === 'Quincenal') {
    const current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 15);
    }
  } else if (frequency === 'Mensual') {
    const current = new Date(start.getFullYear(), start.getMonth(), referenceDay);
    if (current < start) {
      current.setMonth(current.getMonth() + 1);
    }

    while (current <= end) {
      dates.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }
  } else if (frequency === 'Anual') {
    const startMonth = start.getMonth();
    const startDay = start.getDate();
    const current = new Date(start.getFullYear(), startMonth, referenceDay);

    if (current < start) {
      current.setFullYear(current.getFullYear() + 1);
    }

    while (current <= end) {
      dates.push(new Date(current));
      current.setFullYear(current.getFullYear() + 1);
    }
  }

  return dates;
}

function formatDateForDB(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

export async function generatePendingTransactions() {
  try {
    const recurringTransactions = await getActiveRecurringTransactions();

    if (!recurringTransactions.length) {
      return;
    }

    for (const rtr of recurringTransactions) {
      const frequency = rtr.frequency.fr_name;
      const dates = generateDatesForFrequency(
        frequency,
        rtr.rtr_start_date,
        rtr.rtr_reference_day,
        rtr.rtr_finish_date
      );

      const activeSubcategories = rtr.recurrent_transaction_subcategory.filter(
        st => st.rts_is_active
      );

      if (activeSubcategories.length === 0) {
        continue;
      }

      for (const date of dates) {
        const dateStr = formatDateForDB(date).split('T')[0];
        const { data: existingTransaction, error: checkError } = await supabase
          .schema('ctrl_finance')
          .from('transaction')
          .select('tr_id')
          .eq('rtr_id', rtr.rtr_id)
          .eq('tr_date', dateStr)
          .limit(1)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking for existing transaction:', checkError);
          continue;
        }

        if (!existingTransaction) {
          const transactionData = {
            ac_id: rtr.ac_id,
            ty_id: rtr.ty_id,
            rtr_id: rtr.rtr_id,
            tr_name: rtr.rtr_name,
            tr_description: rtr.rtr_description,
            tr_amount: rtr.rtr_estimated_amount,
            tr_date: formatDateForDB(date),
            tr_time: '00:00:00',
            tr_is_active: true,
          };

          const { data: newTransaction, error: transactionError } = await supabase
            .schema('ctrl_finance')
            .from('transaction')
            .insert(transactionData)
            .select('tr_id')
            .single();

          if (transactionError) {
            console.error('Error creating transaction:', transactionError);
            continue;
          }

          for (const activeSct of activeSubcategories) {
            const { error: subcategoryError } = await supabase
              .schema('ctrl_finance')
              .from('subcategories_transaction')
              .insert({
                tr_id: newTransaction.tr_id,
                sct_id: activeSct.sct_id,
                st_is_active: true,
              });

            if (subcategoryError) {
              console.error('Error creating subcategory relationship:', subcategoryError);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in generatePendingTransactions:', error);
  }
}

export function calculateNextGenerationDate(frequency, referenceDay) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();

  if (frequency === 'Diaria') {
    const next = new Date(today);
    next.setDate(next.getDate() + 1);
    return next;
  } else if (frequency === 'Semanal') {
    const next = new Date(today);
    const daysUntilTarget = (referenceDay - next.getDay() + 7) % 7 || 7;
    next.setDate(next.getDate() + daysUntilTarget);
    return next;
  } else if (frequency === 'Quincenal') {
    const next = new Date(today);
    next.setDate(next.getDate() + 15);
    return next;
  } else if (frequency === 'Mensual') {
    const next = new Date(currentYear, currentMonth, referenceDay);
    if (next <= today) {
      next.setMonth(next.getMonth() + 1);
    }
    return next;
  } else if (frequency === 'Anual') {
    const next = new Date(currentYear, today.getMonth(), referenceDay);
    if (next <= today) {
      next.setFullYear(next.getFullYear() + 1);
    }
    return next;
  }

  return null;
}
