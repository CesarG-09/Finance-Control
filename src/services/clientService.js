import { supabase } from '../lib/supabaseClient';

export async function getClientByAuthId(authId) {
  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('client')
    .select(`
      cl_id,
      id_auth,
      cl_first_name,
      cl_middle_name,
      cl_last_name,
      cl_second_last_name,
      cl_birth_date,
      cl_profession,
      cl_gender,
      cl_is_active
    `)
    .eq('id_auth', authId)
    .eq('cl_is_active', true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createClientProfile(authId, profile) {
  const payload = {
    id_auth: authId,
    cl_first_name: profile.cl_first_name.trim(),
    cl_middle_name: profile.cl_middle_name?.trim() || null,
    cl_last_name: profile.cl_last_name.trim(),
    cl_second_last_name: profile.cl_second_last_name?.trim() || null,
    cl_birth_date: profile.cl_birth_date,
    cl_profession: profile.cl_profession.trim(),
    cl_gender: profile.cl_gender,
    cl_is_active: true,
  };

  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('client')
    .insert(payload)
    .select(`
      cl_id,
      id_auth,
      cl_first_name,
      cl_middle_name,
      cl_last_name,
      cl_second_last_name,
      cl_birth_date,
      cl_profession,
      cl_gender,
      cl_is_active
    `)
    .single();

  if (error) {
    throw error;
  }

  return data;
}