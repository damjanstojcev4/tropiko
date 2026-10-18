"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageOff } from "lucide-react";

export function ProductPhoto({ src, alt, width = 480, height = 360, compact = false }: { src: string; alt: string; width?: number; height?: number; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span className={`product-photo-fallback ${compact ? "compact" : ""}`} role="img" aria-label={`${alt} — нема фотографија`}><ImageOff size={compact ? 16 : 26} aria-hidden="true"/>{!compact && <span>Нема фотографија</span>}</span>;
  return <Image src={src} alt={alt} width={width} height={height} unoptimized loading="lazy" onError={() => setFailed(true)}/>;
}
