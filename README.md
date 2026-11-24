# Portage USE Manager

A web-based configuration manager for Gentoo Linux Portage USE flags, `USE_EXPAND` variables, and `/etc/portage/package.use/*` rules with `REQUIRED_USE` conflict checking.

## Prerequisites

- **Node.js** (v20 or newer recommended)
- **npm** (included with Node.js)

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start the development server**

   ```bash
   npm run dev
   ```

   The app runs on `http://localhost:3000`.

## Building for Production

1. **Run TypeScript typechecking**

   ```bash
   npm run lint
   ```

2. **Build the production bundle**

   ```bash
   npm run build
   ```

   The compiled static assets are output to the `dist/` directory.

3. **Preview the production build locally**

   ```bash
   npm run preview
   ```

## Available Scripts

| Script | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server on port `3000` |
| `npm run build` | Builds the production bundle into `dist/` |
| `npm run preview` | Serves the production `dist/` build locally for verification |
| `npm run lint` | Runs `tsc --noEmit` to verify TypeScript types |
| `npm run clean` | Removes generated `dist` build artifacts |

## Project Structure

- `src/App.tsx`: Main workspace layout, state persistence (`localStorage`), and modal orchestration
- `src/data/portageCatalog.ts`: Gentoo profiles, global USE flag catalog, `USE_EXPAND` options, and starter packages
- `src/utils/portageEngine.ts`: Flag inheritance resolution, `REQUIRED_USE` validation, config parser, and file generator
- `src/components/`: Views for package rules, global flags, conflict resolution, config export, and import/add modals
