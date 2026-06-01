import { supabase } from '../lib/supabaseClient';
import { clampDayToMonth } from './accountCardService';

function pad(n) {
  return String(n).padStart(2, '0');
}

function isoDate(year, monthIndex, day) {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

function frequencyToOccurrences(freqName, startDate, finishDate, refDay, year, monthIndex) {
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);
  const startsAt = startDate ? new Date(startDate) : monthStart;
  const endsAt = finishDate ? new Date(finishDate) : null;

  const dates = [];

  const name = (freqName || '').toLowerCase();

  if (name.includes('diar')) {
    const cursor = new Date(Math.max(monthStart.getTime(), startsAt.getTime()));
    while (cursor <= monthEnd && (!endsAt || cursor <= endsAt)) {
      dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  } else if (name.includes('seman')) {
    const dow = startsAt.getDay();
    const cursor = new Date(monthStart);
    while (cursor.getDay() !== dow) cursor.setDate(cursor.getDate() + 1);
    while (cursor <= monthEnd && (!endsAt || cursor <= endsAt)) {
      if (cursor >= startsAt) dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }
  } else if (name.includes('quincen')) {
    const day = clampDayToMonth(refDay || 1, year, monthIndex);
    const d1 = new Date(year, monthIndex, day);
    const d2 = new Date(year, monthIndex, clampDayToMonth(day + 15, year, monthIndex));
    [d1, d2].forEach((d) => {
      if (d >= startsAt && (!endsAt || d <= endsAt) && d.getMonth() === monthIndex) {
        dates.push(d);
      }
    });
  } else if (name.includes('mensual') || name === '') {
    const day = clampDayToMonth(refDay || 1, year, monthIndex);
    const d = new Date(year, monthIndex, day);
    if (d >= startsAt && (!endsAt || d <= endsAt)) dates.push(d);
  } else if (name.includes('anual')) {
    if (startsAt.getMonth() === monthIndex) {
      const day = clampDayToMonth(refDay || startsAt.getDate(), year, monthIndex);
      const d = new Date(year, monthIndex, day);
      if (d >= startsAt && (!endsAt || d <= endsAt)) dates.push(d);
    }
  }

  return dates;
}

export async function getMonthEvents(clientId, year, monthIndex) {
  if (!clientId) return [];

  const monthStart = isoDate(year, monthIndex, 1);
  const monthEnd = isoDate(year, monthIndex, new Date(year, monthIndex + 1, 0).getDate());

  // Tarjetas de crédito activas del cliente
  const cardsPromise = supabase
    .schema('ctrl_finance')
    .from('account_card')
    .select(`
      acc_id, ac_id, acc_cut_day, acc_pay_day, acc_is_active,
      account:account!inner ( ac_id, cl_id, ac_name, ac_is_active, ta_id )
    `)
    .eq('acc_is_active', true)
    .eq('account.cl_id', clientId)
    .eq('account.ac_is_active', true)
    .eq('account.ac_is_delete', false)
    .eq('account.ta_id', 1);

  // Transacciones del mes
  const txPromise = supabase
    .schema('ctrl_finance')
    .from('transaction')
    .select(`
      tr_id, tr_name, tr_date, tr_amount, ty_id, ac_id,
      account:account!inner ( ac_id, cl_id, ac_name ),
      transaction_type:type_transaction ( ty_id, ty_name )
    `)
    .eq('tr_is_active', true)
    .eq('account.cl_id', clientId)
    .eq('account.ac_is_active', true)
    .eq('account.ac_is_delete', false)
    .gte('tr_date', monthStart)
    .lte('tr_date', monthEnd);

  // Transacciones recurrentes activas (sólo cuentas activas y no eliminadas)
  const recurrentPromise = supabase
    .schema('ctrl_finance')
    .from('recurrent_transaction')
    .select(`
      rtr_id, rtr_name, rtr_reference_day, rtr_start_date, rtr_finish_date,
      rtr_estimated_amount, rtr_is_active, fr_id,
      frequency:frequency ( fr_id, fr_name ),
      account:account!inner ( ac_id, cl_id, ac_name )
    `)
    .eq('rtr_is_active', true)
    .eq('account.cl_id', clientId)
    .eq('account.ac_is_active', true)
    .eq('account.ac_is_delete', false);

  const [cardsRes, txRes, recRes] = await Promise.all([cardsPromise, txPromise, recurrentPromise]);

  if (cardsRes.error) throw cardsRes.error;
  if (txRes.error) throw txRes.error;
  if (recRes.error) throw recRes.error;

  const events = [];

  // Cortes y pagos de TC
  for (const card of cardsRes.data ?? []) {
    const cutDay = clampDayToMonth(Number(card.acc_cut_day), year, monthIndex);
    const payDay = clampDayToMonth(Number(card.acc_pay_day), year, monthIndex);
    events.push({
      date: isoDate(year, monthIndex, cutDay),
      type: 'cut',
      label: `Corte ${card.account?.ac_name ?? ''}`.trim(),
      color: 'orange',
      refId: card.ac_id,
    });
    events.push({
      date: isoDate(year, monthIndex, payDay),
      type: 'pay',
      label: `Pago ${card.account?.ac_name ?? ''}`.trim(),
      color: 'red',
      refId: card.ac_id,
    });
  }

  // Recurrentes
  for (const rec of recRes.data ?? []) {
    const dates = frequencyToOccurrences(
      rec.frequency?.fr_name,
      rec.rtr_start_date,
      rec.rtr_finish_date,
      Number(rec.rtr_reference_day),
      year,
      monthIndex
    );
    for (const d of dates) {
      events.push({
        date: isoDate(d.getFullYear(), d.getMonth(), d.getDate()),
        type: 'recurrent',
        label: rec.rtr_name,
        color: 'blue',
        refId: rec.rtr_id,
      });
    }
  }

  // Transacciones ejecutadas
  for (const tx of txRes.data ?? []) {
    const dateStr = String(tx.tr_date).slice(0, 10);
    events.push({
      date: dateStr,
      type: 'tx',
      label: tx.tr_name,
      color: 'gray',
      refId: tx.tr_id,
      txType: tx.transaction_type?.ty_name,
    });
  }

  return events;
}
