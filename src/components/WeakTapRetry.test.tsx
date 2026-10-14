// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '../i18n';
import { ca } from '../i18n/ca';
import { es } from '../i18n/es';
import { en } from '../i18n/en';
import { WeakTapRetry } from './WeakTapRetry';

const WEAK_TAP_KEYS = [
  'weakTapTitle',
  'weakTapSubline',
  'weakTapSublineCalm',
  'weakTapRetry',
  'weakTapRestart',
] as const;

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function renderRetry(count: number, lang: 'ca' | 'es' | 'en' = 'ca') {
  localStorage.setItem('sindria.lang', lang);
  const onRetry = vi.fn();
  const onRestart = vi.fn();
  const view = render(
    <I18nProvider>
      <WeakTapRetry count={count} onRetry={onRetry} onRestart={onRestart} />
    </I18nProvider>,
  );
  return { ...view, onRetry, onRestart };
}

describe('WeakTapRetry', () => {
  it('shows the firm line for the first weak taps and no restart', () => {
    const { container, onRetry } = renderRetry(1);
    expect(screen.getByRole('heading', { name: ca.weakTapTitle }).textContent).toBe(
      "No t'he sentit bé",
    );
    expect(screen.getByText('Dona-li un cop més ferm, a prop del mòbil')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Comença de nou' })).toBeNull();
    expect(container.textContent).not.toMatch(/\d/);
    expect(container.innerHTML).not.toMatch(/text-unripe|bg-unripe|text-accent|bg-accent/);

    fireEvent.click(screen.getByRole('button', { name: 'Torna-ho a provar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('the 3rd weak tap shows the alternate subline and Comença de nou', () => {
    const { container, onRestart } = renderRetry(3);
    expect(screen.getByRole('heading', { name: "No t'he sentit bé" })).toBeTruthy();
    expect(screen.getByText('Prova en un lloc més tranquil i pica a prop del centre')).toBeTruthy();
    expect(screen.queryByText('Dona-li un cop més ferm, a prop del mòbil')).toBeNull();
    const restart = screen.getByRole('button', { name: 'Comença de nou' });
    expect(restart.className).toContain('text-ink-muted');
    expect(restart.className).not.toMatch(/text-unripe|bg-accent/);
    expect(container.textContent).not.toMatch(/\d/);
    expect(container.querySelector('svg')).toBeNull();

    fireEvent.click(restart);
    expect(onRestart).toHaveBeenCalledTimes(1);

    cleanup();
    renderRetry(4);
    expect(screen.getByRole('button', { name: 'Comença de nou' })).toBeTruthy();
    expect(screen.getByText(ca.weakTapSublineCalm)).toBeTruthy();
  });

  it('ca, es and en strings are all present', () => {
    for (const dict of [ca, es, en]) {
      for (const key of WEAK_TAP_KEYS) {
        expect(dict[key].trim().length).toBeGreaterThan(0);
      }
      const blob = WEAK_TAP_KEYS.map((key) => dict[key]).join(' ').toLowerCase();
      expect(blob).not.toMatch(/brix|sweetness|dolçor|dulzor|hz|%/);
    }

    expect(ca.weakTapTitle).toBe("No t'he sentit bé");
    expect(ca.weakTapSubline).toBe('Dona-li un cop més ferm, a prop del mòbil');
    expect(ca.weakTapRetry).toBe('Torna-ho a provar');
    expect(ca.weakTapSublineCalm).toBe('Prova en un lloc més tranquil i pica a prop del centre');
    expect(ca.weakTapRestart).toBe('Comença de nou');

    expect(es.weakTapTitle).not.toBe(ca.weakTapTitle);
    expect(en.weakTapTitle).not.toBe(ca.weakTapTitle);
    expect(en.weakTapRetry).toBe('Try again');
    expect(es.weakTapRestart).toBe('Empieza de nuevo');
  });
});
