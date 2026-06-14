import { useAuthStore } from '../store/authStore';
import { can, canAccessRoute, normalizeRole } from '../lib/permissions';

/**
 * Hook principal pour le contrôle d'accès dans les composants.
 *
 * Usage :
 *   const { can, role, isAdmin } = usePermissions();
 *   if (can('affaires.delete')) { ... }
 */
export function usePermissions() {
  const user = useAuthStore((state) => state.user);
  const rawRole = user?.role || 'huissier';
  const role = normalizeRole(rawRole);

  return {
    role,
    rawRole,
    user,

    can: (permission) => can(role, permission),
    canAccessRoute: (path) => canAccessRoute(role, path),

    // Raccourcis sur les rôles réels (après normalisation des alias hérités).
    isAdmin:        role === 'super_admin',
    isJuge:         role === 'juge',
    isProcureur:    role === 'procureur',
    isAvocat:       role === 'avocat',
    isGreffier:     role === 'greffier',
    isHuissier:     role === 'huissier',
    isNotaire:      role === 'notaire',
    isGestionnaire: role === 'gestionnaire',
  };
}
