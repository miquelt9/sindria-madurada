import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Language, Translations } from './types';
import { ca } from './ca';
import { es } from './es';
import { en } from './en';

const LANGUAGE_KEY = 'sindria.lang';

const dictionaries: Record<Language, Translations> = {
  ca,
  es,
  en,
};

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Translations, params?: Record<string, string | number>) => string;
  dict: Translations;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved === 'ca' || saved === 'es' || saved === 'en') {
      return saved;
    }
    const nav = navigator.language.toLowerCase();
    if (nav.startsWith('ca')) return 'ca';
    if (nav.startsWith('es')) return 'es';
    if (nav.startsWith('en')) return 'en';
  } catch {
    // ignore
  }
  return 'ca';
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const dict = useMemo(() => dictionaries[language] || dictionaries.ca, [language]);

  const t = useCallback(
    (key: keyof Translations, params?: Record<string, string | number>): string => {
      let text = dict[key] || dictionaries.ca[key] || (key as string);
      if (params) {
        Object.entries(params).forEach(([paramKey, val]) => {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
        });
      }
      return text;
    },
    [dict]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      dict,
    }),
    [language, setLanguage, t, dict]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback if rendered outside provider
    return {
      language: 'ca',
      setLanguage: () => {},
      t: (key: keyof Translations) => dictionaries.ca[key] || (key as string),
      dict: dictionaries.ca,
    };
  }
  return ctx;
}

export * from './types';
