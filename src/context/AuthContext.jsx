import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { createClientProfile, getClientByAuthId } from '../services/clientService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [clientProfile, setClientProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadClientProfile(currentUser) {
    if (!currentUser) {
      setClientProfile(null);
      return null;
    }

    const profile = await getClientByAuthId(currentUser.id);
    setClientProfile(profile);
    return profile;
  }

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    if (!data.session || !data.user) {
      throw new Error('No se pudo iniciar sesión correctamente.');
    }

    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });

    const profile = await getClientByAuthId(data.user.id);

    if (profile && !profile.cl_is_active) {
      await supabase.auth.signOut();

      setSession(null);
      setUser(null);
      setClientProfile(null);

      throw new Error('Este perfil está desactivado. Contacta soporte para reactivarlo.');
    }

    setSession(data.session);
    setUser(data.user);
    setClientProfile(profile);

    return {
      user: data.user,
      session: data.session,
      profile,
    };
  }

  async function register(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    setSession(data.session ?? null);
    setUser(data.user ?? null);

    return data;
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    setSession(null);
    setUser(null);
    setClientProfile(null);
  }

  async function createProfile(profile) {
    if (!user) {
      throw new Error('No hay usuario autenticado');
    }

    const newProfile = await createClientProfile(user.id, profile);
    setClientProfile(newProfile);

    return newProfile;
  }

  async function refreshProfile() {
    return await loadClientProfile(user);
  }

  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        const currentSession = data.session ?? null;
        const currentUser = currentSession?.user ?? null;

        if (!isMounted) return;

        setSession(currentSession);
        setUser(currentUser);

        if (currentUser) {
          const profile = await getClientByAuthId(currentUser.id);

          if (profile && !profile.cl_is_active) {
            await supabase.auth.signOut();

            if (isMounted) {
              setSession(null);
              setUser(null);
              setClientProfile(null);
            }

            return;
          }

          if (isMounted) {
            setClientProfile(profile);
          }
        }
      } catch (error) {
        console.error('Error validando sesión:', error.message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initSession();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, newSession) => {
    if (event === 'SIGNED_OUT') {
      setSession(null);
      setUser(null);
      setClientProfile(null);
      return;
    }

    if (event === 'TOKEN_REFRESHED') {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    }
  });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user,
    clientProfile,
    loading,
    login,
    register,
    logout,
    createProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}