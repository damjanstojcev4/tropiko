import { Navbar, ProductCatalogServer, StoreFooter } from "@/components/storefront/storefront";
export default function VegetablesPage(){return <><Navbar/><ProductCatalogServer initialCategory="vegetable" showHero={false}/><StoreFooter/></>}
