# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This is a Next.js app currently at the default `create-next-app` scaffold state (App Router, TypeScript, Tailwind CSS 4, React 19). No custom application code has been added yet beyond `src/app/layout.tsx` and `src/app/page.tsx`.

## Commands

- `npm run dev` — start the dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — run ESLint (flat config via `eslint.config.mjs`, extends `eslint-config-next` core-web-vitals + typescript rules)

There is no test runner configured in this repo yet.

## Architecture

- App Router structure under `src/app/`; path alias `@/*` maps to `src/*` (see `tsconfig.json`).
- `next.config.ts` has `reactCompiler: true` enabled — the React Compiler (babel-plugin-react-compiler) is active, so avoid manual memoization patterns (`useMemo`/`useCallback`/`React.memo`) unless there's a specific reason; the compiler handles this automatically.
- Styling uses Tailwind CSS 4 via `@tailwindcss/postcss` (see `postcss.config.mjs`), not a `tailwind.config.js` file (Tailwind 4's CSS-first config lives in `src/app/globals.css`).
- TypeScript strict mode is enabled.
