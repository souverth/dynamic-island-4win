import translationsJson from './i18n.json';

export const translations = translationsJson;

export type Language = 'en' | 'vi';

export function getTranslation(lang: Language = 'en') {
  return translations[lang] || translations['en'];
}
