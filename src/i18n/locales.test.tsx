// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nProvider, useI18n } from './index';
import { ca } from './ca';
import { es } from './es';
import { en } from './en';
import { Translations } from './types';

function placeholderTokens(value: string): string[] {
  return [...value.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1]).sort();
}

function LanguageProbe() {
  const { language, setLanguage, t } = useI18n();
  return (
    <div>
      <p data-testid="language">{language}</p>
      <p data-testid="detected">{t('knockDetected', { count: 2, next: 3 })}</p>
      <p data-testid="window">{t('eatDaysRange', { from: 0, until: 2 })}</p>
      <p data-testid="finish">{t('knockFinishWithCount', { count: 1, plural: '' })}</p>
      <p data-testid="back">{t('back', { count: 9 })}</p>
      <button type="button" onClick={() => setLanguage('es')}>
        switch
      </button>
    </div>
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  document.documentElement.lang = '';
});

describe('locale catalogs', () => {
  it('has the same non-empty keys in ca, es, and en', () => {
    const keys = Object.keys(en).sort();
    expect(Object.keys(ca).sort()).toEqual(keys);
    expect(Object.keys(es).sort()).toEqual(keys);
    expect(keys.length).toBeGreaterThan(0);

    for (const key of keys) {
      for (const dict of [ca, es, en]) {
        const value = dict[key as keyof Translations];
        expect(typeof value, key).toBe('string');
        expect(value.trim().length, `${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('keeps the same placeholder tokens in every locale', () => {
    for (const key of Object.keys(en) as (keyof Translations)[]) {
      expect(placeholderTokens(ca[key]), `ca.${key}`).toEqual(placeholderTokens(en[key]));
      expect(placeholderTokens(es[key]), `es.${key}`).toEqual(placeholderTokens(en[key]));
    }
  });
});

describe('language selection', () => {
  it('uses a saved language before the browser language', () => {
    localStorage.setItem('sindria.lang', 'en');
    Object.defineProperty(navigator, 'language', { value: 'ca-ES', configurable: true });
    render(
      <I18nProvider>
        <LanguageProbe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('language').textContent).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it.each([
    ['ca-ES', 'ca'],
    ['es-MX', 'es'],
    ['en-GB', 'en'],
    ['de-DE', 'ca'],
  ] as const)('maps navigator %s to %s when nothing is saved', (browserLanguage, expected) => {
    Object.defineProperty(navigator, 'language', { value: browserLanguage, configurable: true });
    render(
      <I18nProvider>
        <LanguageProbe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('language').textContent).toBe(expected);
  });

  it('ignores an unknown saved code and uses the browser language', () => {
    localStorage.setItem('sindria.lang', 'fr');
    Object.defineProperty(navigator, 'language', { value: 'es-MX', configurable: true });
    render(
      <I18nProvider>
        <LanguageProbe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('language').textContent).toBe('es');
  });

  it('falls back to Catalan when storage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('storage disabled');
      },
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    });
    Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true });
    render(
      <I18nProvider>
        <LanguageProbe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('language').textContent).toBe('ca');
  });

  it('persists a language change and updates the document lang', () => {
    localStorage.setItem('sindria.lang', 'en');
    render(
      <I18nProvider>
        <LanguageProbe />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'switch' }));
    expect(screen.getByTestId('language').textContent).toBe('es');
    expect(localStorage.getItem('sindria.lang')).toBe('es');
    expect(document.documentElement.lang).toBe('es');
    expect(screen.getByTestId('detected').textContent).toBe(
      es.knockDetected.replace('{count}', '2').replace('{next}', '3'),
    );
  });

  it('still switches language when persisting the choice throws', () => {
    localStorage.setItem('sindria.lang', 'ca');
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    render(
      <I18nProvider>
        <LanguageProbe />
      </I18nProvider>,
    );
    expect(() => fireEvent.click(screen.getByRole('button', { name: 'switch' }))).not.toThrow();
    expect(screen.getByTestId('language').textContent).toBe('es');
    expect(document.documentElement.lang).toBe('es');
    setItem.mockRestore();
  });
});

describe('translation replacement', () => {
  it('substitutes numeric zero and leaves unused placeholders untouched', () => {
    localStorage.setItem('sindria.lang', 'en');
    render(
      <I18nProvider>
        <LanguageProbe />
      </I18nProvider>,
    );

    expect(screen.getByTestId('window').textContent).toBe(
      en.eatDaysRange.replace('{from}', '0').replace('{until}', '2'),
    );
    expect(screen.getByTestId('window').textContent).not.toContain('{');
    expect(screen.getByTestId('finish').textContent).toBe('Finish with 1 knock');
    expect(screen.getByTestId('detected').textContent).toBe('Detected knock #2! Knock #3…');
    expect(screen.getByTestId('back').textContent).toBe(en.back);
  });

  it('uses the Catalan catalog outside a provider', () => {
    function Outside() {
      const { language, t, dict } = useI18n();
      return <span>{`${language}:${t('back')}:${dict.appTitle}`}</span>;
    }
    expect(renderToStaticMarkup(<Outside />)).toContain(`ca:${ca.back}:${ca.appTitle}`);
  });
});
