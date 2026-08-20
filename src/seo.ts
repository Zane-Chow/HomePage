import type { Lang } from "./i18n";
import { IS_CN_SITE, SITE_ORIGIN, SITE_URL } from "./site-config";

const SEO = {
  en: {
    title: "ZaneChow | Computer Science Student & Developer",
    description: "ZaneChow is a Computer Science undergraduate at Universiti Malaya building software, self-hosted infrastructure, and open-source projects.",
    imageAlt: "ZaneChow personal website",
  },
  zh: {
    title: "周昊泽 | 计算机科学学生与开发者",
    description: "周昊泽是马来亚大学计算机科学本科生，专注于软件开发、自建基础设施和开源项目。",
    imageAlt: "周昊泽个人网站",
  },
} as const;

const EN_URL = "https://www.zhouhaoze.com/";
const ZH_URL = "https://www.zhouhaoze.cn/";

function currentUrl(): string {
  return `${SITE_ORIGIN}${window.location.pathname}`;
}

function setMeta(selector: string, content: string): void {
  const element = document.querySelector<HTMLMetaElement>(selector);
  if (element) element.content = content;
}

export function updateSeo(lang: Lang): void {
  const copy = SEO[lang];
  const canonical = currentUrl();

  document.title = copy.title;
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute("href", canonical);
  document.querySelector<HTMLLinkElement>('link[rel="alternate"][hreflang="en"]')?.setAttribute("href", EN_URL);
  document.querySelector<HTMLLinkElement>('link[rel="alternate"][hreflang="zh-CN"]')?.setAttribute("href", ZH_URL);
  document.querySelector<HTMLLinkElement>('link[rel="alternate"][hreflang="x-default"]')?.setAttribute("href", EN_URL);
  setMeta('meta[name="description"]', copy.description);
  setMeta('meta[property="og:title"]', copy.title);
  setMeta('meta[property="og:description"]', copy.description);
  setMeta('meta[property="og:url"]', canonical);
  setMeta('meta[property="og:image"]', `${SITE_URL}favicon.png`);
  setMeta('meta[property="og:image:alt"]', copy.imageAlt);
  setMeta('meta[property="og:locale"]', lang === "zh" ? "zh_CN" : "en_US");
  setMeta('meta[property="og:locale:alternate"]', lang === "zh" ? "en_US" : "zh_CN");
  setMeta('meta[name="twitter:title"]', copy.title);
  setMeta('meta[name="twitter:description"]', copy.description);
  setMeta('meta[name="twitter:image"]', `${SITE_URL}favicon.png`);

  const sameAs = ["https://github.com/YIYI-16"];
  if (!IS_CN_SITE) sameAs.push("https://t.me/yiyitelegram_bot");

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${canonical}#person`,
        name: lang === "zh" ? "周昊泽" : "ZaneChow",
        alternateName: lang === "zh" ? "ZaneChow" : "周昊泽",
        url: canonical,
        email: "mailto:me@zhouhaoze.com",
        sameAs,
        jobTitle: lang === "zh" ? "计算机科学本科生" : "Computer Science undergraduate",
        affiliation: { "@type": "CollegeOrUniversity", name: "Universiti Malaya" },
      },
      {
        "@type": "WebSite",
        "@id": `${canonical}#website`,
        url: canonical,
        name: copy.title,
        description: copy.description,
        inLanguage: lang === "zh" ? "zh-CN" : "en",
        author: { "@id": `${canonical}#person` },
      },
      {
        "@type": "SoftwareSourceCode",
        name: "AuthRouter",
        description:
          lang === "zh"
            ? "将多个身份提供方整合到统一登录入口的开源项目。"
            : "An open-source gateway that unifies multiple identity providers behind one login endpoint.",
        codeRepository: "https://github.com/YIYI-16/AuthRouter",
        programmingLanguage: "Go",
        author: { "@id": `${canonical}#person` },
      },
    ],
  };
  let jsonLd = document.querySelector<HTMLScriptElement>('script[data-seo="jsonld"]');
  if (!jsonLd) {
    jsonLd = document.createElement("script");
    jsonLd.type = "application/ld+json";
    jsonLd.dataset.seo = "jsonld";
    document.head.appendChild(jsonLd);
  }
  jsonLd.textContent = JSON.stringify(structuredData);

}
