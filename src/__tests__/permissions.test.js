// src/__tests__/permissions.test.js
import { describe, it, expect } from 'vitest';
import {
  normalizeRole,
  can,
  canAccessRoute,
  getRoleLabel,
  getRoleColor,
  ROLES,
} from '../lib/permissions';

// ─── normalizeRole ────────────────────────────────────────────────────────────
describe('normalizeRole', () => {
  it('retourne le rôle tel quel pour un rôle valide', () => {
    expect(normalizeRole('super_admin')).toBe('super_admin');
    expect(normalizeRole('juge')).toBe('juge');
    expect(normalizeRole('greffier')).toBe('greffier');
  });

  it('normalise les anciens alias', () => {
    expect(normalizeRole('magistrat')).toBe('juge');
    expect(normalizeRole('agent')).toBe('huissier');
    expect(normalizeRole('admin')).toBe('super_admin');
    expect(normalizeRole('ministre')).toBe('super_admin');
  });

  it('retourne le rôle inconnu tel quel', () => {
    expect(normalizeRole('inconnu')).toBe('inconnu');
  });
});

// ─── can ──────────────────────────────────────────────────────────────────────
describe('can', () => {
  it('super_admin peut tout faire', () => {
    expect(can('super_admin', 'affaires.delete')).toBe(true);
    expect(can('super_admin', 'audit.view')).toBe(true);
    expect(can('super_admin', 'users.delete')).toBe(true);
  });

  it('juge peut créer des décisions', () => {
    expect(can('juge', 'decisions.create')).toBe(true);
  });

  it('huissier ne peut pas créer des affaires', () => {
    expect(can('huissier', 'affaires.create')).toBe(false);
  });

  it('huissier ne peut pas voir les stats', () => {
    expect(can('huissier', 'stats.view')).toBe(false);
  });

  it('avocat peut voir les audiences', () => {
    expect(can('avocat', 'audiences.view')).toBe(true);
  });

  it('avocat ne peut pas supprimer une audience', () => {
    expect(can('avocat', 'audiences.delete')).toBe(false);
  });

  it('greffier peut créer une audience', () => {
    expect(can('greffier', 'audiences.create')).toBe(true);
  });

  it('retourne false pour une permission inconnue', () => {
    expect(can('super_admin', 'permission.inconnue')).toBe(false);
  });

  it('fonctionne avec les anciens alias', () => {
    // magistrat → juge
    expect(can('magistrat', 'decisions.create')).toBe(true);
    // agent → huissier
    expect(can('agent', 'affaires.delete')).toBe(false);
  });
});

// ─── canAccessRoute ───────────────────────────────────────────────────────────
describe('canAccessRoute', () => {
  it('tout le monde accède au dashboard', () => {
    for (const role of Object.values(ROLES)) {
      expect(canAccessRoute(role, '/dashboard')).toBe(true);
    }
  });

  it('seul super_admin accède à /audit', () => {
    expect(canAccessRoute('super_admin', '/audit')).toBe(true);
    expect(canAccessRoute('juge',        '/audit')).toBe(false);
    expect(canAccessRoute('greffier',    '/audit')).toBe(false);
  });

  it('seul super_admin accède à /users', () => {
    expect(canAccessRoute('super_admin',  '/users')).toBe(true);
    expect(canAccessRoute('gestionnaire', '/users')).toBe(false);
  });

  it('tout le monde accède à /profile et /settings', () => {
    expect(canAccessRoute('huissier', '/profile')).toBe(true);
    expect(canAccessRoute('huissier', '/settings')).toBe(true);
  });

  it('routes inconnues sont autorisées par défaut', () => {
    expect(canAccessRoute('huissier', '/une-route-inconnue')).toBe(true);
  });

  it('juge accède à /affaires (view_assigned)', () => {
    expect(canAccessRoute('juge', '/affaires')).toBe(true);
  });

  it('gestionnaire accède à /affaires (view_all)', () => {
    expect(canAccessRoute('gestionnaire', '/affaires')).toBe(true);
  });
});

// ─── getRoleLabel ─────────────────────────────────────────────────────────────
describe('getRoleLabel', () => {
  it('retourne les labels corrects', () => {
    expect(getRoleLabel('super_admin')).toBe('Super Administrateur');
    expect(getRoleLabel('juge')).toBe('Juge');
    expect(getRoleLabel('greffier')).toBe('Greffier');
    expect(getRoleLabel('magistrat')).toBe('Juge'); // alias rétrocompat
  });

  it('retourne le rôle brut pour un label inconnu', () => {
    expect(getRoleLabel('inconnu')).toBe('inconnu');
  });
});

// ─── getRoleColor ─────────────────────────────────────────────────────────────
describe('getRoleColor', () => {
  it('retourne une string non vide pour chaque rôle', () => {
    for (const role of Object.values(ROLES)) {
      expect(getRoleColor(role)).toBeTruthy();
    }
  });

  it('fonctionne avec les alias (magistrat → juge)', () => {
    expect(getRoleColor('magistrat')).toBe(getRoleColor('juge'));
  });
});
