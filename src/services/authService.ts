import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export function clearSession(): void {
  Object.keys(localStorage)
    .filter(key => key.startsWith('sb-'))
    .forEach(key => localStorage.removeItem(key));
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    if (error.message?.toLowerCase().includes('session_not_found')) {
      clearSession();
    }
    return null;
  }
  return data.user;
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
}

export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return subscription;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export const authService = {
  getCurrentUser,
  getSession,
  onAuthStateChange,
  signOut,
  clearSession,
};
