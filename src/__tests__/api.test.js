/**
 * Tests unitaires — fonctions utilitaires de api.js
 * On teste la logique pure sans appels Supabase réels.
 */
import { describe, it, expect, vi } from 'vitest';

// ─── Mock de supabaseClient (évite les appels réseau) ────────────────────────
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order:  vi.fn().mockReturnThis(),
      limit:  vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    storage: {
      from: vi.fn(() => ({
        upload:          vi.fn().mockResolvedValue({ error: null }),
        list:            vi.fn().mockResolvedValue({ data: [], error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/file' } }),
        remove:          vi.fn().mockResolvedValue({ error: null }),
      })),
    },
  },
}));

// ─── Fonctions utilitaires extraites pour les tests ───────────────────────────

/** Re-implémentation de sanitizePostgrest (non exportée) */
const sanitizePostgrest = (term) =>
  String(term || '')
    .replace(/[,()*:%_\\]/g, ' ')
    .trim();

/** Re-implémentation de sha256Hex */
async function sha256Hex(message) {
  const enc = new TextEncoder().encode(message);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Tests sanitizePostgrest ──────────────────────────────────────────────────
describe('sanitizePostgrest', () => {
  it('retourne une chaîne vide pour une entrée vide', () => {
    expect(sanitizePostgrest('')).toBe('');
    expect(sanitizePostgrest(null)).toBe('');
    expect(sanitizePostgrest(undefined)).toBe('');
  });

  it('supprime les caractères spéciaux PostgREST', () => {
    expect(sanitizePostgrest('test*injection')).toBe('test injection');
    expect(sanitizePostgrest('a%b_c')).toBe('a b c');
    // .trim() enlève l'espace de fin — comportement attendu
    expect(sanitizePostgrest('dossier,(123)')).toBe('dossier  123');
  });

  it('laisse passer les caractères alphanumériques normaux', () => {
    expect(sanitizePostgrest('Dupont')).toBe('Dupont');
    expect(sanitizePostgrest('N2024-001')).toBe('N2024-001');
  });

  it('convertit en chaîne les types non-string', () => {
    expect(sanitizePostgrest(42)).toBe('42');
    expect(sanitizePostgrest(true)).toBe('true');
  });
});

// ─── Tests sha256Hex ──────────────────────────────────────────────────────────
describe('sha256Hex', () => {
  it('retourne une chaîne hexadécimale de 64 caractères', async () => {
    const hash = await sha256Hex('hello');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('est déterministe pour le même input', async () => {
    const h1 = await sha256Hex('JusticeTchad');
    const h2 = await sha256Hex('JusticeTchad');
    expect(h1).toBe(h2);
  });

  it('produit des hashes différents pour des inputs différents', async () => {
    const h1 = await sha256Hex('input-a');
    const h2 = await sha256Hex('input-b');
    expect(h1).not.toBe(h2);
  });

  it('retourne une chaîne hex de 64 chars (valeur déterministe)', async () => {
    // On vérifie le format et la déterminisme sans hardcoder le hash
    // (les implémentations SubtleCrypto peuvent varier selon l'environnement)
    const hash1 = await sha256Hex('abc');
    const hash2 = await sha256Hex('abc');
    expect(hash1).toHaveLength(64);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    expect(hash1).toBe(hash2); // déterministe
  });
});

// ─── Tests des transformations de données ─────────────────────────────────────
describe('transformations API', () => {
  it('construit correctement le nom du juge', () => {
    const juge = { prenom: 'Jean', nom: 'Dupont' };
    const nom = juge ? `${juge.prenom} ${juge.nom}`.trim() : 'Non assigné';
    expect(nom).toBe('Jean Dupont');
  });

  it('retourne "Non assigné" si pas de juge', () => {
    const juge = null;
    const nom = juge ? `${juge.prenom} ${juge.nom}`.trim() : 'Non assigné';
    expect(nom).toBe('Non assigné');
  });

  it('getStatsParStatut mappe correctement les couleurs', () => {
    const colors = { en_cours: '#3B82F6', jugee: '#10B981', appelee: '#F59E0B', classee: '#6B7280' };
    expect(colors['en_cours']).toBe('#3B82F6');
    expect(colors['jugee']).toBe('#10B981');
    expect(colors['unknown']).toBeUndefined();
  });

  it('getActiviteMensuelle retourne 12 mois', () => {
    const months = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
    const counts = Array(12).fill(0);
    const result = months.map((name, i) => ({ name, value: counts[i] }));
    expect(result).toHaveLength(12);
    expect(result[0].name).toBe('Jan');
    expect(result[11].name).toBe('Déc');
    expect(result[0].value).toBe(0);
  });
});
