export function productImageSource(source: string, width = 480, height = 360): string {
  try {
    const url = new URL(source);
    if (url.hostname === "images.unsplash.com") {
      for (const [key, value] of Object.entries({ w: String(width), h: String(height), fit: "crop", crop: "entropy", q: "72" })) url.searchParams.set(key, value);
    }
    return url.toString();
  } catch { return source; }
}
