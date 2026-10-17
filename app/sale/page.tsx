import { Navbar, ProductCatalogServer, StoreFooter } from "@/components/storefront/storefront";
export default function SalePage(){return <><Navbar/><ProductCatalogServer showHero={false} saleOnly/><StoreFooter/></>}
