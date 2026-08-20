export type SiteVariant = "com" | "cn";

export const SITE_VARIANT: SiteVariant = __SITE_VARIANT__;
export const IS_CN_SITE = SITE_VARIANT === "cn";
export const SITE_ORIGIN = IS_CN_SITE ? "https://www.zhouhaoze.cn" : "https://www.zhouhaoze.com";
export const SITE_URL = `${SITE_ORIGIN}/`;
