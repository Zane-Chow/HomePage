export type Theme = "light" | "dark";

const STORAGE_KEY = "pw-theme";

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function detectTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return systemPrefersDark() ? "dark" : "light";
}

let currentTheme: Theme = detectTheme();
const listeners = new Set<(theme: Theme) => void>();

export function getTheme(): Theme {
  return currentTheme;
}

export function setTheme(theme: Theme): void {
  currentTheme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
  document.documentElement.setAttribute("data-theme", theme);
  listeners.forEach((fn) => fn(theme));
}

export function toggleTheme(): void {
  setTheme(currentTheme === "dark" ? "light" : "dark");
}

export function onThemeChange(fn: (theme: Theme) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function initTheme(): void {
  document.documentElement.setAttribute("data-theme", currentTheme);

  // Only follow live system changes if the user has never made an explicit choice.
  if (!localStorage.getItem(STORAGE_KEY)) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      if (localStorage.getItem(STORAGE_KEY)) return;
      currentTheme = e.matches ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", currentTheme);
      listeners.forEach((fn) => fn(currentTheme));
    });
  }
}
