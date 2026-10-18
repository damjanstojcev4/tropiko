import type { Metadata } from "next";
import { Navbar, ProductCatalogServer, StoreFooter } from "@/components/storefront/storefront";
export const metadata: Metadata = { title: "Сезонски акции" };
export default function SalePage(){return <><Navbar/><ProductCatalogServer showHero={false} saleOnly/><StoreFooter/></>}
