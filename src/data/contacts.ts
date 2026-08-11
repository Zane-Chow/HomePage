export interface Contact {
  icon: string;
  labelKey: string;
  href: string;
  external?: boolean;
}

export const contacts: Contact[] = [
  { icon: "ph-envelope-simple", labelKey: "contact.email", href: "mailto:me@zhouhaoze.com" },
  { icon: "ph-github-logo", labelKey: "contact.github", href: "https://github.com/YIYI-16", external: true },
  { icon: "ph-telegram-logo", labelKey: "contact.telegram", href: "https://t.me/yiyitelegram_bot", external: true },
];
