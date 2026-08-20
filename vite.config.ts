import { rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { defineConfig, loadEnv, type Plugin, type ResolvedConfig } from "vite";
import { generateNodeLocations, type NodeLocationBuildOptions } from "./build/node-locations.ts";

type SiteVariant = "com" | "cn";

const SITE_CONFIG = {
  com: {
    origin: "https://www.zhouhaoze.com",
    lang: "en",
    locale: "en_US",
    alternateLocale: "zh_CN",
    title: "ZaneChow | Computer Science Student & Developer",
    description:
      "ZaneChow is a Computer Science undergraduate at Universiti Malaya building software, self-hosted infrastructure, and open-source projects.",
    imageAlt: "ZaneChow personal website",
  },
  cn: {
    origin: "https://www.zhouhaoze.cn",
    lang: "zh-CN",
    locale: "zh_CN",
    alternateLocale: "en_US",
    title: "周昊泽 | 计算机科学学生与开发者",
    description: "周昊泽是马来亚大学计算机科学本科生，专注于软件开发、自建基础设施和开源项目。",
    imageAlt: "周昊泽个人网站",
  },
} as const;

function resolveVariant(value: string | undefined): SiteVariant {
  const variant = value?.toLowerCase() || "com";
  if (variant !== "com" && variant !== "cn") {
    throw new Error(`SITE_VARIANT must be "com" or "cn"; received "${value}".`);
  }
  return variant;
}

function siteAssetsPlugin(variant: SiteVariant, nodeLocationOptions: NodeLocationBuildOptions): Plugin {
  const site = SITE_CONFIG[variant];
  const siteUrl = `${site.origin}/`;
  let resolvedConfig: ResolvedConfig;

  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}sitemap.xml\n`;
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}</loc>
    <lastmod>2026-08-20</lastmod>
  </url>
</urlset>
`;

  return {
    name: "site-variant-assets",
    configResolved(config) {
      resolvedConfig = config;
    },
    transformIndexHtml(html) {
      const replacements: Record<string, string> = {
        SITE_LANG: site.lang,
        SITE_TITLE: site.title,
        SITE_DESCRIPTION: site.description,
        SITE_URL: siteUrl,
        SITE_LOCALE: site.locale,
        SITE_ALTERNATE_LOCALE: site.alternateLocale,
        SITE_IMAGE_ALT: site.imageAlt,
      };

      return Object.entries(replacements).reduce(
        (result, [key, value]) => result.replaceAll(`%${key}%`, value),
        html,
      );
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url === "/robots.txt") {
          response.setHeader("Content-Type", "text/plain; charset=utf-8");
          response.end(robots);
          return;
        }
        if (request.url === "/sitemap.xml") {
          response.setHeader("Content-Type", "application/xml; charset=utf-8");
          response.end(sitemap);
          return;
        }
        next();
      });
    },
    async closeBundle() {
      const outDir = resolve(resolvedConfig.root, resolvedConfig.build.outDir);
      let nodeLocations;
      try {
        nodeLocations = await generateNodeLocations(nodeLocationOptions);
        console.info(
          `[node-locations] Resolved ${nodeLocations.locations.length}/${nodeLocations.nodes.length} precise node locations.`,
        );
      } catch (error) {
        console.warn(`[node-locations] ${error instanceof Error ? error.message : String(error)}`);
        nodeLocations = { version: 1, generatedAt: null, nodes: [], locations: [] } as const;
      }
      await Promise.all([
        writeFile(resolve(outDir, "robots.txt"), robots, "utf8"),
        writeFile(resolve(outDir, "sitemap.xml"), sitemap, "utf8"),
        rm(resolve(outDir, "sitemap-cn.xml"), { force: true }),
        writeFile(resolve(outDir, "node-locations.json"), `${JSON.stringify(nodeLocations)}\n`, "utf8"),
      ]);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const variant = resolveVariant(process.env.SITE_VARIANT ?? env.SITE_VARIANT);
  const nodeLocationOptions = {
    komariBaseUrl: process.env.KOMARI_BASE_URL ?? env.KOMARI_BASE_URL ?? "https://ops.zhouhaoze.top",
    komariApiKey: process.env.KOMARI_API_KEY ?? env.KOMARI_API_KEY,
    ipinfoToken: process.env.IPINFO_TOKEN ?? env.IPINFO_TOKEN,
  };

  return {
    define: {
      __SITE_VARIANT__: JSON.stringify(variant),
    },
    plugins: [siteAssetsPlugin(variant, nodeLocationOptions)],
  };
});
