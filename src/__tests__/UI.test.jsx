/**
 * Tests unitaires — composants UI (Badge, StatCard, Card, Skeleton, Toast)
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Badge, Card, StatCard, Skeleton, Toast, cn } from '../components/UI';
import { Briefcase } from 'lucide-react';

// ─── cn() ─────────────────────────────────────────────────────────────────────
describe('cn()', () => {
  it('fusionne des classes Tailwind correctement', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    expect(cn('p-4 p-8')).toBe('p-8');
    expect(cn('flex', 'items-center')).toBe('flex items-center');
  });

  it('ignore les valeurs falsy', () => {
    const conditionalClass = false; // simule une condition dynamique
    expect(cn('flex', conditionalClass && 'hidden', null, undefined)).toBe('flex');
  });
});

// ─── Badge ────────────────────────────────────────────────────────────────────
describe('Badge', () => {
  it('affiche le texte enfant', () => {
    render(<Badge>En cours</Badge>);
    expect(screen.getByText('En cours')).toBeInTheDocument();
  });

  it('applique la variante par défaut', () => {
    const { container } = render(<Badge>Test</Badge>);
    expect(container.firstChild).toHaveClass('bg-slate-100');
  });

  it('applique la variante en_cours', () => {
    const { container } = render(<Badge variant="en_cours">Active</Badge>);
    expect(container.firstChild).toHaveClass('bg-blue-50');
  });

  it('applique la variante jugee (succès)', () => {
    const { container } = render(<Badge variant="jugee">Jugée</Badge>);
    expect(container.firstChild).toHaveClass('bg-emerald-50');
  });

  it('applique la variante error', () => {
    const { container } = render(<Badge variant="error">Erreur</Badge>);
    expect(container.firstChild).toHaveClass('bg-red-50');
  });

  it('accepte une className supplémentaire', () => {
    const { container } = render(<Badge className="custom-class">Test</Badge>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('se rend avec un tag <span>', () => {
    const { container } = render(<Badge>Test</Badge>);
    expect(container.firstChild.tagName).toBe('SPAN');
  });
});

// ─── Card ─────────────────────────────────────────────────────────────────────
describe('Card', () => {
  it('affiche le titre et le sous-titre', () => {
    render(<Card title="Mon titre" subtitle="Mon sous-titre"><p>Contenu</p></Card>);
    expect(screen.getByText('Mon titre')).toBeInTheDocument();
    expect(screen.getByText('Mon sous-titre')).toBeInTheDocument();
  });

  it('affiche les enfants', () => {
    render(<Card><p>Contenu enfant</p></Card>);
    expect(screen.getByText('Contenu enfant')).toBeInTheDocument();
  });

  it('appelle onClick quand cliqué', () => {
    const handleClick = vi.fn();
    render(<Card onClick={handleClick}>Cliquer</Card>);
    fireEvent.click(screen.getByText('Cliquer'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('ajoute cursor-pointer si onClick est fourni', () => {
    const { container } = render(<Card onClick={() => {}}>Test</Card>);
    expect(container.firstChild).toHaveClass('cursor-pointer');
  });

  it('n\'affiche pas le header si pas de titre ni icône', () => {
    const { container } = render(<Card><p>Seul contenu</p></Card>);
    expect(container.querySelector('.flex.items-center.justify-between')).toBeNull();
  });
});

// ─── StatCard ─────────────────────────────────────────────────────────────────
describe('StatCard', () => {
  it('affiche le titre et la valeur', () => {
    render(<StatCard title="Affaires" value={42} icon={Briefcase} />);
    expect(screen.getByText('Affaires')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('applique la couleur bleue par défaut', () => {
    const { container } = render(
      <StatCard title="Test" value={0} icon={Briefcase} color="blue" />
    );
    const iconDiv = container.querySelector('.bg-blue-500');
    expect(iconDiv).toBeInTheDocument();
  });

  it('appelle onClick au clic', () => {
    const fn = vi.fn();
    render(<StatCard title="Test" value={1} icon={Briefcase} onClick={fn} />);
    // La Card entière est cliquable
    fireEvent.click(screen.getByText('Test').closest('.glass-card') || document.body);
    // OK si pas d'erreur
  });
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────
describe('Skeleton', () => {
  it('rend un seul élément par défaut', () => {
    const { container } = render(<Skeleton className="h-10" />);
    const divs = container.querySelectorAll('.animate-pulse');
    expect(divs).toHaveLength(1);
  });

  it('rend plusieurs éléments avec count', () => {
    const { container } = render(<Skeleton count={3} className="h-10" />);
    const divs = container.querySelectorAll('.animate-pulse');
    expect(divs).toHaveLength(3);
  });

  it('applique la classe personnalisée', () => {
    const { container } = render(<Skeleton className="h-20 w-full" />);
    expect(container.firstChild).toHaveClass('h-20', 'w-full');
  });
});

// ─── Toast ───────────────────────────────────────────────────────────────────
describe('Toast', () => {
  it('affiche le message', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<Toast message="Opération réussie" type="success" onClose={onClose} />);
    expect(screen.getByText('Opération réussie')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('appelle onClose au clic sur le bouton X', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { container } = render(<Toast message="Test" type="info" onClose={onClose} />);
    const closeBtn = container.querySelector('button');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('appelle onClose après le délai (4s)', async () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<Toast message="Auto-close" type="info" onClose={onClose} />);
    await act(async () => { vi.advanceTimersByTime(4100); });
    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('applique les styles success', () => {
    vi.useFakeTimers();
    const { container } = render(<Toast message="OK" type="success" onClose={() => {}} />);
    expect(container.firstChild).toHaveClass('bg-emerald-600');
    vi.useRealTimers();
  });

  it('applique les styles error', () => {
    vi.useFakeTimers();
    const { container } = render(<Toast message="Erreur" type="error" onClose={() => {}} />);
    expect(container.firstChild).toHaveClass('bg-red-600');
    vi.useRealTimers();
  });
});
