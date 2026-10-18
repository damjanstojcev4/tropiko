import type { Metadata } from "next";
import { Navbar, ContactPage, StoreFooter } from "@/components/storefront/storefront";
export const metadata: Metadata = { title: "Контакт" };
export default function Contact(){return <><Navbar/><ContactPage/><StoreFooter/></>}
