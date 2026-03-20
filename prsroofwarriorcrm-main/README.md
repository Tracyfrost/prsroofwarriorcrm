# Warrior Command / PRS CRM

Warrior Command CRM is a Vite + React + Supabase web application used to manage roofing jobs, customers, production, and financials.

## Tech stack

- Vite + React + TypeScript  
- shadcn-ui + Tailwind CSS  
- Supabase (Postgres, Auth, Storage)  
- TanStack Query for data fetching/caching

## Getting started (local dev)

1. **Install Node.js** (18+ recommended).
2. Install dependencies:

   ```sh
   npm install
   # or
   yarn
   ```

3. Create `.env.local` in the project root and configure your Supabase keys and URLs (copy from your Supabase project; all Vite vars must be prefixed with `VITE_`).

4. Start the dev server:

   ```sh
   npm run dev
   # or
   yarn dev
   ```

5. Open the app in your browser at `http://localhost:8080/`.

## Scripts

- `npm run dev` / `yarn dev` – start the Vite dev server  
- `npm run build` / `yarn build` – create a production build  
- `npm run preview` / `yarn preview` – preview the production build locally  
- `npm run lint` – run ESLint  
- `npm run test` – run Vitest tests

## Deployment

You can deploy the built app to any static hosting that supports Vite builds, such as:

- Vercel  
- Netlify  
- Render  
- Static hosting behind Nginx/Apache

Typical steps:

1. Set your environment variables in the hosting platform (matching `.env.local` but using their UI).
2. Build:

   ```sh
   npm run build
   ```

3. Point your host to the `dist` directory as the build output.

## Customization

- **Branding & colors**: managed via the in-app Settings → Branding screen (white-label config stored in Supabase).  
- **Status/production config**: managed via Settings → Customizations / Production tabs.

For deeper code changes, open the project in your preferred IDE and edit the TypeScript/React files under `src/`.*** End Patch```} ***!
