import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { normalizeRole } from '../lib/permissions';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      // Connexion (après signInWithPassword)
      login: (userData) => {
        set({
          user: { ...userData, role: normalizeRole(userData.role || 'huissier') },
          isAuthenticated: true,
        });
      },

      // Déconnexion
      logout: async () => {
        try { await supabase.auth.signOut(); } catch (err) { console.error(err); }
        // Vider le cache de vérification de statut
        try { sessionStorage.removeItem('prot_route_cache'); } catch { /* ignore */ }
        set({ user: null, isAuthenticated: false });
      },

      // Rafraîchir le rôle depuis la table profils (optionnel, appelé manuellement)
      refreshProfile: async () => {
        try {
          const { data } = await supabase.auth.getUser();
          const user = data?.user;
          if (!user) return;

          const { data: profil } = await supabase
            .from('profils')
            .select('nom, prenom, role, avatar_url')
            .eq('id', user.id)
            .single();

          set((state) => ({
            user: {
              ...state.user,
              id: user.id,
              email: user.email,
              nom:    profil?.nom    || user.user_metadata?.nom    || state.user?.nom    || '',
              prenom: profil?.prenom || user.user_metadata?.prenom || state.user?.prenom || '',
              role:   normalizeRole(profil?.role || user.user_metadata?.role || state.user?.role || 'huissier'),
              avatar_url: profil?.avatar_url || state.user?.avatar_url || null,
            },
            isAuthenticated: true,
          }));
        } catch (err) {
          console.warn('refreshProfile silencieux:', err?.message || err);
        }
      },
    }),
    {
      name: 'auth-storage',
      // Ne persiste que les champs nécessaires — exclut les fonctions et données dérivées
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user
          ? {
              id:         state.user.id,
              email:      state.user.email,
              role:       state.user.role,
              nom:        state.user.nom,
              prenom:     state.user.prenom,
              avatar_url: state.user.avatar_url,
            }
          : null,
      }),
    }
  )
);
