# MornLark

A robot shopping storefront built with Next.js 16, React 19, and TypeScript. The design uses an editorial catalog layout, Geist typography, restrained green accents, and local robot imagery.

## Run locally

```sh
npm ci
npm run dev
```

Open http://localhost:3000. For a production check:

```sh
npm run build
npm run start
```

Use the existing Cloudflare deployment workflow. No Sites hosting or deployment configuration is added.

## Storefront

- Four sample robots with product details and specifications.
- Category filtering, text search, maximum-price filtering, and price sorting.
- Saved favorites and a shopping bag persisted in browser local storage.
- Quantity controls, item removal, calculated totals, and a robot match finder.
- Responsive layouts, keyboard-accessible dialogs, focus indicators, and reduced-motion support.
- A clearly labeled demo checkout that validates the form and completes a local preview order.

The catalog is illustrative. Checkout does not process payments or create fulfillment orders. Form details are neither sent to a server nor stored. Cart and favorites use this browser only.

## Editing

- `app/catalog.ts`: sample products, prices, descriptions, and features.
- `app/storefront.tsx`: browsing and shopping interactions.
- `app/globals.css`: responsive layout and styling.
- `app/tokens.css`: shared color, typography, spacing, and control tokens.
- `app/base.css`: foundational styles and accessibility defaults.
- `app/layout.tsx`: page metadata and fonts.
- `app/sitemap.ts`: canonical public page URLs, generated as `/sitemap.xml` at build time.
- `app/robots.txt`: crawler rules and the sitemap reference.
- `public/images/robot-hero.webp`: featured robot photograph.
- `public/images/robot-collection.webp`: four product photographs arranged in equal quadrants and displayed as a CSS image sprite.

The images are compressed WebP files, served locally without an external image service. Image generation prompts and provenance are in [docs/image-prompts.md](docs/image-prompts.md).

## Design approach

The redesign follows [Hallmark](https://github.com/Nutlope/hallmark) v2 while retaining MornLark's name, green accent, imagery, and shopping interactions. Product names, prices, and specifications lead the catalog. Sample customer ratings and unverified popularity badges are omitted, and illustrative products and policies are identified as previews.

Design decisions and copy changes are recorded in `.hallmark/`. Local before-and-after captures are available in `.hallmark/compare.html` after running Hallmark's browser checks; generated screenshots and inventories are ignored by Git.

Cart and favorites are restored from browser storage after hydration. That existing behavior has a narrowly documented lint exception so the server and initial browser render stay consistent.

## Sitemap maintenance

The storefront currently has one public page, `https://mornlark.com/`. When publishing or removing a public page, update `app/sitemap.ts` in the same change and rebuild and deploy the site. Use each page's canonical HTTPS URL. Catalog edits keep the same home page URL, so they do not require new sitemap entries.

After deployment, verify `/sitemap.xml` returns HTTP 200 with XML and `/robots.txt` includes `Sitemap: https://mornlark.com/sitemap.xml`. Run the discoverability scan:

```sh
curl https://isitagentready.com/api/scan \
  -H 'Content-Type: application/json' \
  --data '{"url":"https://mornlark.com"}'
```

Confirm `checks.discoverability.sitemap.status` is `"pass"`.
