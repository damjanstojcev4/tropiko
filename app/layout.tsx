import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Тропико — Свежина секој ден", description: "Свежо овошје и зеленчук со одличен квалитет и цена." };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="mk"><body>{children}</body></html>; }
