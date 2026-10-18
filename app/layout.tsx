import type { Metadata, Viewport } from "next";
import { copy } from "@/lib/content";
import "./globals.css";

const title = `${copy.shopName} — Свежо овошје и зеленчук`;
const description = `${copy.shopName}: свежо овошје и зеленчук со одличен квалитет и цена. Погледнете ја сезонската понуда и акциите.`;
const socialImage = { url: "/brand/banana-makovo-social.jpg", width: 1200, height: 630, alt: `${copy.shopName} — овошје и зеленчук` };

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: title, template: `%s | ${copy.shopName}` },
  description,
  applicationName: copy.shopName,
  manifest: "/site.webmanifest",
  openGraph: { type: "website", locale: "mk_MK", siteName: copy.shopName, title, description, images: [socialImage] },
  twitter: { card: "summary_large_image", title, description, images: [socialImage] },
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { themeColor: "#173f30" };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="mk">
    {/* Browser extensions such as Grammarly add body attributes before hydration.
        Suppress only attribute mismatches here; descendants still report mismatches. */}
    <body suppressHydrationWarning>{children}</body>
  </html>;
}
