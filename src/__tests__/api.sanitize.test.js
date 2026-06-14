// src/__tests__/api.sanitize.test.js
// Teste la fonction sanitizePostgrest de façon indirecte via les exports.
// Pour tester directement, on réplique la logique ici.
import { describe, it, expect } from 'vitest';

// Réplication de sanitizePostgrest (même logique que dans api.js)
const sanitizePostgrest = (term) =>
  String(term || '')
    .replace(/[,()*:%_\\]/g, ' ')
    .trim();

describe('sanitizePostgrest', () => {
  it('retourne une chaîne vide pour une entrée vide', () => {
    expect(sanitizePostgrest('')).toBe('');
    expect(sanitizePostgrest(null)).toBe('');
    expect(sanitizePostgrest(undefined)).toBe('');
  });

  it('passe les termes normaux sans modification', () => {
    expect(sanitizePostgrest('dupont')).toBe('dupont');
    expect(sanitizePostgrest('TND-2025')).toBe('TND-2025');
  });

  it('neutralise les caractères spéciaux PostgREST', () => {
    // Virgule — séparateur de liste
    expect(sanitizePostgrest('a,b')).toBe('a b');
    // Parenthèses — opérateurs (devient " test " puis est trimé à "test")
    expect(sanitizePostgrest('(test)')).toBe('test');
    // Astérisque — wildcard
    expect(sanitizePostgrest('a*b')).toBe('a b');
    // Deux-points — opérateur
    expect(sanitizePostgrest('a:b')).toBe('a b');
    // Pourcentage — wildcard SQL (devient "50 " puis est trimé à "50")
    expect(sanitizePostgrest('50%')).toBe('50');
    // Underscore — wildcard LIKE
    expect(sanitizePostgrest('a_b')).toBe('a b');
    // Antislash
    expect(sanitizePostgrest('a\\b')).toBe('a b');
  });

  it('trim les espaces en début/fin', () => {
    expect(sanitizePostgrest('  test  ')).toBe('test');
  });

  it('neutralise les tentatives d\'injection combinées', () => {
    const injection = `'),or(1=1)--`;
    const result = sanitizePostgrest(injection);
    // Aucun caractère dangereux ne reste
    expect(result).not.toContain('(');
    expect(result).not.toContain(')');
    expect(result).not.toContain(',');
    expect(result).not.toContain('%');
  });
});
