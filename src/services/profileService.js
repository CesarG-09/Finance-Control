import { supabase } from '../lib/supabaseClient';

const CLIENT_SELECT = `
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
`;

export async function updateClientProfile(clientId, profile) {
  if (!clientId) {
    throw new Error('No existe perfil de cliente para actualizar.');
  }

  const payload = {
    cl_first_name: profile.cl_first_name.trim(),
    cl_middle_name: profile.cl_middle_name?.trim() || null,
    cl_last_name: profile.cl_last_name.trim(),
    cl_second_last_name: profile.cl_second_last_name?.trim() || null,
    cl_birth_date: profile.cl_birth_date,
    cl_profession: profile.cl_profession.trim(),
    cl_gender: profile.cl_gender,
  };

  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('client')
    .update(payload)
    .eq('cl_id', clientId)
    .select(CLIENT_SELECT)
    .single();

  if (error) throw error;

  return data;
}

export async function updateUserEmail(email) {
  const { data, error } = await supabase.auth.updateUser({
    email: email.trim(),
  });

  if (error) throw error;

  return data;
}

export async function updateUserPassword(password) {
  const { data, error } = await supabase.auth.updateUser({
    password,
  });

  if (error) throw error;

  return data;
}

export async function deactivateClientProfile(clientId) {
  if (!clientId) {
    throw new Error('No existe perfil de cliente para desactivar.');
  }

  const { data, error } = await supabase
    .schema('ctrl_finance')
    .from('client')
    .update({
      cl_is_active: false,
    })
    .eq('cl_id', clientId)
    .select(CLIENT_SELECT)
    .single();

  if (error) throw error;

  return data;
}