import type { Metadata } from "next";
import { Navbar, ProductCatalogServer, StoreFooter } from "@/components/storefront/storefront";
export const metadata: Metadata = { title: "Свежо овошје" };
export default function FruitPage(){return <><Navbar/><ProductCatalogServer initialCategory="fruit" showHero={false}/><StoreFooter/></>}
