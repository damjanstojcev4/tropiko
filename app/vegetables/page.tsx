import type { Metadata } from "next";
import { Navbar, ProductCatalogServer, StoreFooter } from "@/components/storefront/storefront";
export const metadata: Metadata = { title: "Свеж зеленчук" };
export default function VegetablesPage(){return <><Navbar/><ProductCatalogServer initialCategory="vegetable" showHero={false}/><StoreFooter/></>}
