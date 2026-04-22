// Tiny i18n helper for PicnicPlus. No build, no deps.
//
// Usage:
//   import { t, tp, setLocale, getLocale, onLocaleChange, applyDomTranslations } from './i18n.js';
//   t('nav.map')                       => "Map"
//   t('status.creating', { name })     => "Creating Alex's Birthday…"
//   tp('results.spots_found', count)   => "1 spot found" / "5 spots found"
//
// HTML (applied by applyDomTranslations()):
//   <span data-i18n="nav.map"></span>
//   <input data-i18n-attr="placeholder:search.placeholder,aria-label:search.aria">
//
// Locale files live at js/locales/<code>.js and export `default` (a flat
// object of string keys). Plural keys use `<key>_one` and `<key>_other`.

import en from './locales/en.js';
import fr from './locales/fr.js';

export const LOCALES = {
    en: { name: 'English', flag: '🇬🇧', dict: en },
    fr: { name: 'Français', flag: '🇫🇷', dict: fr },
};

const STORAGE_KEY = 'pp-locale';
const FALLBACK = 'en';
const _listeners = new Set();
let _current = FALLBACK;

const detectInitialLocale = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && LOCALES[stored]) return stored;
    } catch (_) {}
    const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return LOCALES[nav] ? nav : FALLBACK;
};

export const getLocale = () => _current;

export const setLocale = (code) => {
    if (!LOCALES[code] || code === _current) return;
    _current = code;
    try { localStorage.setItem(STORAGE_KEY, code); } catch (_) {}
    document.documentElement.setAttribute('lang', code);
    applyDomTranslations(document);
    _listeners.forEach(fn => { try { fn(code); } catch (_) {} });
    window.dispatchEvent(new CustomEvent('localeChange', { detail: { locale: code } }));
};

export const onLocaleChange = (fn) => {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
};

const interpolate = (str, params) => {
    if (!params) return str;
    return str.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in params ? params[k] : `{{${k}}}`));
};

export const t = (key, params) => {
    const dict = LOCALES[_current]?.dict || {};
    const fallback = LOCALES[FALLBACK].dict;
    const raw = (key in dict ? dict[key] : fallback[key]);
    if (raw == null) return key; // key missing — surface for dev
    return interpolate(raw, params);
};

// Plural helper. Picks `<key>_one` for count===1 else `<key>_other`.
// Always passes `count` to the interpolator.
export const tp = (key, count, params = {}) => {
    const variant = count === 1 ? `${key}_one` : `${key}_other`;
    return t(variant, { count, ...params });
};

// Walk a root element and apply translations for [data-i18n] and
// [data-i18n-attr]. Safe to call multiple times.
export const applyDomTranslations = (root = document) => {
    root.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) el.textContent = t(key);
    });
    root.querySelectorAll('[data-i18n-attr]').forEach(el => {
        const spec = el.getAttribute('data-i18n-attr');
        // "placeholder:search.placeholder, aria-label:search.aria"
        spec.split(',').map(s => s.trim()).filter(Boolean).forEach(pair => {
            const [attr, key] = pair.split(':').map(s => s.trim());
            if (attr && key) el.setAttribute(attr, t(key));
        });
    });
};

// Initialise immediately (synchronous since locales are imported statically).
_current = detectInitialLocale();
document.documentElement.setAttribute('lang', _current);
