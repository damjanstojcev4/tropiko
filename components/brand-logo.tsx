import Image from "next/image";
import { copy } from "@/lib/content";

// Current placements are all visible header, login, or recovery-page branding.
export function BrandLogo({ priority = true }: { priority?: boolean }) {
  return <Image className="brand-logo" src="/brand/banana-makovo-logo.webp" alt={copy.shopName} width={424} height={265} unoptimized priority={priority}/>;
}
