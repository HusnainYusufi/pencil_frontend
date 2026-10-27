import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Arabic, Instrument_Serif, Noto_Naskh_Arabic } from "next/font/google";
import { cookies } from "next/headers";
import { I18nProvider } from "@/i18n/client";
import { directionOf } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { THEME_COOKIE, type Theme } from "@/lib/theme";
import "./globals.css";

/*
 * Latin and Arabic faces are paired per role and stacked in one font-family,
 * so each script falls through to its own face glyph by glyph (mixed
 * Arabic/English lines just work). Arabic files download only when Arabic
 * glyphs are on the page (unicode-range subsets).
 */
const display = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });
const displayArabic = Noto_Naskh_Arabic({ variable: "--font-naskh", subsets: ["arabic"], weight: ["500", "600"] });
const sans = IBM_Plex_Sans({ variable: "--font-plex-sans", subsets: ["latin"], weight: ["400", "500", "600"] });
const sansArabic = IBM_Plex_Sans_Arabic({ variable: "--font-plex-arabic", subsets: ["arabic"], weight: ["400", "500", "600"] });
const mono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return {
    title: { default: dict.common.appName, template: `%s · ${dict.common.appName}` },
    description: dict.auth.tagline,
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Theme and language are server-rendered from cookies: no flash, no inline script (strict CSP).
  const theme: Theme = (await cookies()).get(THEME_COOKIE)?.value === "dark" ? "dark" : "light";
  const { locale, dict } = await getI18n();
  const fonts = [display, displayArabic, sans, sansArabic, mono].map((f) => f.variable).join(" ");

  return (
    <html lang={locale} dir={directionOf(locale)} data-theme={theme} className={fonts}>
      <body className="bg-bg text-ink text-[14px] leading-relaxed">
        <I18nProvider locale={locale} dict={dict}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
