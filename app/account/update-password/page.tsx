import type { Metadata } from "next";
import { ResetPassword } from "@/components/admin/password-forms";
export const metadata: Metadata = { title: "Нова лозинка", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function UpdatePasswordPage() { return <ResetPassword/>; }
