import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./context/ThemeContext";
import { CartProvider } from "./context/CartContext";
import { CustomerProvider } from "./context/CustomerContext";
import { siteContent } from "../lib/content-config";
import CookieBanner from "./components/CookieBanner";
import WhatsAppButton from "./components/WhatsAppButton";
import { OrganizationJsonLd } from "./components/StructuredData";
import Analytics from "./components/Analytics";
import { getSiteSeo, resolvePageSeo } from "../lib/medusa/services/site-seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"], // latin-ext = Türkçe ğ ş ı İ ö ü ç
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSiteSeo();
  const home = resolvePageSeo(seo, "home");
  const ogImage = home.ogImage || siteContent.seo.ogImage;

  return {
    metadataBase: new URL(
      seo.canonical_base_url ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        "http://localhost:3001"
    ),
    title: {
      default: home.title,
      template: seo.title_template.replace("%s", "%s"),
    },
    description: home.description,
    keywords: home.keywords || undefined,
    applicationName: seo.site_name,
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: seo.site_name,
    },
    icons: {
      icon: "/favicon.ico",
      apple: "/icon-192.png",
    },
    openGraph: {
      type: "website",
      siteName: seo.site_name,
      title: home.title,
      description: home.description,
      images: ogImage ? [{ url: ogImage }] : undefined,
      locale: seo.default_locale,
    },
    twitter: {
      card: "summary_large_image",
      title: home.title,
      description: home.description,
      images: ogImage ? [ogImage] : undefined,
      ...(seo.twitter_handle && { creator: seo.twitter_handle }),
    },
    robots: home.robots,
    // Search engine verification — Medusa Admin'den ayarlanır
    verification: {
      google: seo.google_site_verification || undefined,
      yandex: seo.yandex_site_verification || undefined,
      other: {
        ...(seo.bing_site_verification && {
          "msvalidate.01": seo.bing_site_verification,
        }),
      },
    },
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <ThemeProvider>
          <CustomerProvider>
            <CartProvider>
              {children}
              <CookieBanner />
              <WhatsAppButton />
              <OrganizationJsonLd />
              <Analytics />
            </CartProvider>
          </CustomerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
