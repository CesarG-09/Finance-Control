import { supabase } from '../lib/supabaseClient';

const TRANSFER_CATEGORY_NAME = 'Transferencias';
const TRANSFER_SUBCATEGORY_NAME = 'Transferencia entre cuentas';

let cachedTransferSctId = null;
let pendingLookup = null;

export async function getTransferSubcategoryId() {
  if (cachedTransferSctId !== null) {
    return cachedTransferSctId;
  }

  if (pendingLookup) {
    return pendingLookup;
  }

  pendingLookup = (async () => {
    const { data, error } = await supabase
      .schema('ctrl_finance')
      .from('subcategory')
      .select('sct_id, sct_name, category:category!inner(ct_id, ct_name)')
      .eq('sct_name', TRANSFER_SUBCATEGORY_NAME)
      .eq('category.ct_name', TRANSFER_CATEGORY_NAME)
      .maybeSingle();

    if (error) {
      pendingLookup = null;
      throw error;
    }

    cachedTransferSctId = data?.sct_id ?? null;
    return cachedTransferSctId;
  })();

  return pendingLookup;
}

export function getCachedTransferSubcategoryId() {
  return cachedTransferSctId;
}

export function isTransferSubcategoryId(sctId) {
  if (cachedTransferSctId === null || sctId == null) return false;
  return String(sctId) === String(cachedTransferSctId);
}

export { TRANSFER_CATEGORY_NAME, TRANSFER_SUBCATEGORY_NAME };
