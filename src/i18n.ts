import en from "./locales/en.json";
import zh from "./locales/zh.json";
import { updateSeo } from "./seo";

export type Lang = "en" | "zh";

const dictionaries: Record<Lang, Record<string, string>> = { en, zh };

const STORAGE_KEY = "pw-lang";

function detectLang(): Lang {
  if (window.location.hostname.endsWith(".cn")) return "zh";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "zh") return stored;
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

let currentLang: Lang = detectLang();
const listeners = new Set<(lang: Lang) => void>();

export function getLang(): Lang {
  return currentLang;
}

export function t(key: string): string {
  return dictionaries[currentLang][key] ?? dictionaries.en[key] ?? key;
}

export function setLang(lang: Lang): void {
  currentLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  updateSeo(lang);
  applyTranslations();
  listeners.forEach((fn) => fn(lang));
}

export function onLangChange(fn: (lang: Lang) => void): void {
  listeners.add(fn);
}

export function applyTranslations(): void {
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (!key) return;
    el.textContent = t(key);
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-attr]").forEach((el) => {
    const spec = el.dataset.i18nAttr;
    if (!spec) return;
    spec.split(",").forEach((pair) => {
      const [attr, key] = pair.split(":").map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    });
  });
}

export function initI18n(): void {
  updateSeo(currentLang);
  applyTranslations();
}
