import { supabase } from '../lib/supabaseClient';

export async function createTransfer({
  originAcId,
  destAcId,
  amount,
  date,
  time,
  description,
}) {
  if (!originAcId || !destAcId) {
    throw new Error('Debes seleccionar cuenta origen y destino.');
  }
  if (Number(originAcId) === Number(destAcId)) {
    throw new Error('La cuenta origen y destino deben ser diferentes.');
  }

  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    throw new Error('El monto de la transferencia debe ser mayor a 0.');
  }
  if (!date) {
    throw new Error('La fecha es obligatoria.');
  }

  const { data, error } = await supabase.rpc('fn_create_transfer', {
    p_origin_ac_id: Number(originAcId),
    p_dest_ac_id: Number(destAcId),
    p_amount: amt,
    p_date: date,
    p_time: time ? `${time}:00` : null,
    p_description: description?.trim() || null,
  });

  if (error) throw error;
  return data;
}

export function isTransfer(transaction) {
  if (!transaction) return false;
  const oat = transaction.other_account_transaction;
  if (Array.isArray(oat)) return oat.length > 0;
  return Boolean(oat);
}

export async function getTransferPair(trId) {
  if (!trId) return null;

  const { data: link, error } = await supabase
    .schema('ctrl_finance')
    .from('other_account_transaction')
    .select('oat_id, tr_id, oat_destination_ac_id')
    .or(`tr_id.eq.${trId}`)
    .maybeSingle();

  if (error) throw error;
  return link ?? null;
}

export async function deleteTransfer(originTrId) {
  if (!originTrId) {
    throw new Error('Falta el ID de la transferencia origen.');
  }

  const { data: link, error: linkError } = await supabase
    .schema('ctrl_finance')
    .from('other_account_transaction')
    .select('tr_id, oat_destination_ac_id')
    .eq('tr_id', originTrId)
    .maybeSingle();

  if (linkError) throw linkError;
  if (!link) {
    throw new Error('No se encontró el vínculo de transferencia.');
  }

  // Buscar pata destino: transacción Entrada en la cuenta destino vinculada
  // (Lookup heurístico: misma fecha aprox no se chequea — confiamos en oat.)
  const { data: origin } = await supabase
    .schema('ctrl_finance')
    .from('transaction')
    .select('tr_amount, tr_date, tr_time, tr_name, tr_description')
    .eq('tr_id', originTrId)
    .single();

  const { data: candidates } = await supabase
    .schema('ctrl_finance')
    .from('transaction')
    .select('tr_id')
    .eq('ac_id', link.oat_destination_ac_id)
    .eq('ty_id', 1)
    .eq('tr_amount', origin?.tr_amount)
    .eq('tr_date', origin?.tr_date)
    .eq('tr_is_active', true);

  const destTrId = candidates?.[0]?.tr_id ?? null;

  const { error: deactivateOriginError } = await supabase
    .schema('ctrl_finance')
    .from('transaction')
    .update({ tr_is_active: false })
    .eq('tr_id', originTrId);

  if (deactivateOriginError) throw deactivateOriginError;

  if (destTrId) {
    const { error: deactivateDestError } = await supabase
      .schema('ctrl_finance')
      .from('transaction')
      .update({ tr_is_active: false })
      .eq('tr_id', destTrId);

    if (deactivateDestError) throw deactivateDestError;
  }

  return { originTrId, destTrId };
}
