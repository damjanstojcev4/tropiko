import type { Metadata } from "next";
import { ResetPassword } from "@/components/admin/password-forms";

export const metadata: Metadata = { title: "Нова лозинка", referrer: "no-referrer" };
export default function ResetPasswordPage() { return <ResetPassword/>; }
