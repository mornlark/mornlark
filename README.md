# robo

A robot shopping storefront built with Next.js 16, React 19, and TypeScript. The design uses warm neutrals, sage accents, and custom robot product photography.

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
- `app/layout.tsx`: page metadata and fonts.
- `public/images/robot-hero.webp`: featured robot photograph.
- `public/images/robot-collection.webp`: four product photographs arranged in equal quadrants and displayed as a CSS image sprite.

The images are compressed WebP files, served locally without an external image service. Image generation prompts and provenance are in [docs/image-prompts.md](docs/image-prompts.md).
