import type { Metadata } from "next";
import { AdminSessionProvider } from "@/components/admin/admin-session";

export const metadata: Metadata = {
  title: "Администрација",
  robots: { index: false, follow: false },
};
export default function AdminLayout({children}:{children:React.ReactNode}){return <AdminSessionProvider>{children}</AdminSessionProvider>}
