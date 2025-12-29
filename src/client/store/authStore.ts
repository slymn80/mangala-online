/**
 * Authentication State Management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

export interface User {
  id: number;
  username: string;
  email: string;
  display_name: string;
  is_admin: number;
  email_verified: number;
  created_at: string;
  total_games: number;
  total_wins: number;
  total_losses: number;
  total_draws: number;
  total_abandoned: number;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  register: (username: string, email: string, password: string, displayName: string) => Promise<boolean>;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      register: async (username: string, email: string, password: string, displayName: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, displayName })
          });

          const data = await response.json();

          if (!response.ok) {
            set({ error: data.error || 'Kayıt başarısız', isLoading: false });
            return false;
          }

          set({
            user: data.user,
            token: data.token,
            isLoading: false,
            error: null
          });

          return true;
        } catch (error) {
          set({
            error: 'Sunucuya bağlanılamadı',
            isLoading: false
          });
          return false;
        }
      },

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });

          const data = await response.json();

          if (!response.ok) {
            set({ error: data.error || 'Giriş başarısız', isLoading: false });
            return false;
          }

          set({
            user: data.user,
            token: data.token,
            isLoading: false,
            error: null
          });

          return true;
        } catch (error) {
          set({
            error: 'Sunucuya bağlanılamadı',
            isLoading: false
          });
          return false;
        }
      },

      logout: () => {
        set({ user: null, token: null, error: null });
      },

      clearError: () => {
        set({ error: null });
      },

      fetchUser: async () => {
        const { token } = get();
        if (!token) return;

        try {
          const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            set({ user: data.user });
          } else {
            // Token geçersiz
            set({ user: null, token: null });
          }
        } catch (error) {
          console.error('[AUTH] Fetch user error:', error);
        }
      }
    }),
    {
      name: 'mangala-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token
      })
    }
  )
);
