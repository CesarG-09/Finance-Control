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

    setSession(data.session);
    setUser(data.user);

    const profile = await loadClientProfile(data.user);

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
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const currentUser = newSession?.user ?? null;

      setSession(newSession);
      setUser(currentUser);

      if (!currentUser) {
        setClientProfile(null);
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