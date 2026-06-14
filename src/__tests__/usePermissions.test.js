/**
 * Tests unitaires — hook usePermissions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// ─── Mock du store auth ────────────────────────────────────────────────────────
vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

import { useAuthStore } from '../store/authStore';
import { usePermissions } from '../hooks/usePermissions';

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('usePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * useAuthStore est appelé avec un sélecteur : useAuthStore(state => state.user)
   * On simule donc une fonction qui prend un sélecteur et l'appelle avec le state.
   */
  const setup = (role) => {
    useAuthStore.mockImplementation((selector) => {
      const state = { user: { role } };
      return typeof selector === 'function' ? selector(state) : state;
    });
    return renderHook(() => usePermissions());
  };

  // ── super_admin ─────────────────────────────────────────────────────────────
  describe('super_admin', () => {
    it('peut voir toutes les affaires', () => {
      const { result } = setup('super_admin');
      expect(result.current.can('affaires.view_all')).toBe(true);
    });

    it('peut supprimer une affaire', () => {
      const { result } = setup('super_admin');
      expect(result.current.can('affaires.delete')).toBe(true);
    });

    it('peut accéder aux logs d\'audit', () => {
      const { result } = setup('super_admin');
      expect(result.current.can('audit.view')).toBe(true);
    });

    it('peut gérer les utilisateurs', () => {
      const { result } = setup('super_admin');
      expect(result.current.can('users.edit')).toBe(true);
    });

    it('peut voir les demandes', () => {
      const { result } = setup('super_admin');
      expect(result.current.can('demandes.view')).toBe(true);
    });
  });

  // ── juge ────────────────────────────────────────────────────────────────────
  describe('juge', () => {
    it('peut voir ses dossiers assignés', () => {
      const { result } = setup('juge');
      expect(result.current.can('affaires.view_assigned')).toBe(true);
    });

    it('ne peut PAS voir tous les dossiers', () => {
      const { result } = setup('juge');
      expect(result.current.can('affaires.view_all')).toBe(false);
    });

    it('peut rendre un verdict', () => {
      const { result } = setup('juge');
      expect(result.current.can('decisions.create')).toBe(true);
    });

    it('ne peut PAS supprimer une affaire', () => {
      const { result } = setup('juge');
      expect(result.current.can('affaires.delete')).toBe(false);
    });

    it('ne peut PAS accéder aux logs d\'audit', () => {
      const { result } = setup('juge');
      expect(result.current.can('audit.view')).toBe(false);
    });
  });

  // ── avocat ──────────────────────────────────────────────────────────────────
  describe('avocat', () => {
    it('peut voir ses dossiers assignés', () => {
      const { result } = setup('avocat');
      expect(result.current.can('affaires.view_assigned')).toBe(true);
    });

    it('ne peut PAS créer une affaire', () => {
      const { result } = setup('avocat');
      expect(result.current.can('affaires.create')).toBe(false);
    });

    it('peut voir les audiences', () => {
      const { result } = setup('avocat');
      expect(result.current.can('audiences.view')).toBe(true);
    });

    it('ne peut PAS gérer les utilisateurs', () => {
      const { result } = setup('avocat');
      expect(result.current.can('users.view')).toBe(false);
    });
  });

  // ── gestionnaire ────────────────────────────────────────────────────────────
  describe('gestionnaire', () => {
    it('peut voir les demandes', () => {
      const { result } = setup('gestionnaire');
      expect(result.current.can('demandes.view')).toBe(true);
    });

    it('peut approuver les demandes', () => {
      const { result } = setup('gestionnaire');
      expect(result.current.can('demandes.approuver')).toBe(true);
    });

    it('ne peut PAS accéder aux logs d\'audit', () => {
      const { result } = setup('gestionnaire');
      expect(result.current.can('audit.view')).toBe(false);
    });
  });

  // ── huissier ────────────────────────────────────────────────────────────────
  describe('huissier', () => {
    it('peut voir ses dossiers assignés', () => {
      const { result } = setup('huissier');
      expect(result.current.can('affaires.view_assigned')).toBe(true);
    });

    it('ne peut PAS voir les statistiques', () => {
      const { result } = setup('huissier');
      expect(result.current.can('stats.view')).toBe(false);
    });
  });

  // ── Rôles legacy ────────────────────────────────────────────────────────────
  describe('rôles legacy (normalisation)', () => {
    it('magistrat est traité comme juge', () => {
      const { result } = setup('magistrat');
      expect(result.current.can('decisions.create')).toBe(true);
    });

    it('agent est traité comme huissier', () => {
      const { result } = setup('agent');
      expect(result.current.can('affaires.view_assigned')).toBe(true);
    });

    it('admin est traité comme super_admin', () => {
      const { result } = setup('admin');
      expect(result.current.can('audit.view')).toBe(true);
    });
  });

  // ── Permissions inconnues ────────────────────────────────────────────────────
  describe('permissions inconnues', () => {
    it('retourne false pour une permission inexistante', () => {
      const { result } = setup('super_admin');
      expect(result.current.can('permission.inexistante')).toBe(false);
    });
  });
});
