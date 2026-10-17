# Тропико — frontend

Responsive Macedonian fruit and vegetable shop storefront with a local development admin panel.

## Run locally

```bash
npm install
npm run dev
```

Open `/` for the storefront and `/admin` for the development dashboard.

## Development data and Xano

The sample product catalog lives in `lib/data/products.ts`. Admin create, edit, availability, and delete actions use browser `localStorage` and are labeled as local development changes; they do not write to a backend. Reset that local development catalog by clearing the `tropiko-dev-products` localStorage key in the browser.

`lib/api/` holds the typed logical integration surface and `NEXT_PUBLIC_XANO_API_BASE_URL` is the configuration placeholder. The current Xano method names, paths, payloads, and authentication operations are illustrative placeholders only; they must be mapped to the supplied Xano documentation before use. No authentication/session protection is implemented yet; `/admin/login` explicitly explains that sign-in is not connected.

Shop address, phone, and business hours are intentionally placeholders in `lib/content.ts` until confirmed business information is provided. Product photos currently use remote Unsplash development imagery.
