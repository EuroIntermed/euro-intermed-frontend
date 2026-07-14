# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Embeddable chat widget — public API

The embeddable widget (`widget/`, built via `npm run build:widget` → `dist-widget/widget.js`)
exposes a small global, `window.AngrosistChat`, with two methods:

### `AngrosistChat.init(config)`

Mounts the widget once (floating launcher + panel, or into `config.containerId`).
Idempotent — safe to call repeatedly; only the first call mounts. Config:
`{ apiUrl?, containerId?, vertical?, intent?, lang?, theme?, privacyUrl? }`.
`vertical`/`intent` default to `angrosist`/`buy`. See `src/components/dashboard/EmbedCode.tsx`
for the copy-paste embed snippets.

### `AngrosistChat.open(opts)`

Opens the widget panel programmatically and, optionally, seeds the composer — built
for the Angrosist products catalog "Comandă" button.

```js
// Feature-detect, then open the widget prefilled with a product message.
if (window.AngrosistChat?.open) {
  window.AngrosistChat.open({
    message: 'Vreau ofertă pentru: Zahăr tos 50kg (10 paleți)',
    vertical: 'angrosist', // optional — defaults to the init config (angrosist)
    intent: 'buy',         // optional — defaults to the init config (buy)
    autosend: false,       // default: prefill only, so the user can review/edit
  })
}
```

`opts = { message?: string, vertical?: string, intent?: string, autosend?: boolean }`.

- Mounts the widget first if `init()` was never called (reusing init's mount path);
  otherwise it reuses the existing instance and its config.
- **Opens** the panel.
- **Seeds** the composer with `message` so the user can review/edit before sending
  (the DEFAULT). With `autosend: true`, `message` is sent immediately as the first
  user turn instead.
- Applies `vertical`/`intent` as the conversation context when provided (honoring
  explicit values; a plain `open({ message })` keeps the host's init config).
- Safe to call repeatedly and before/after `init()`.

The vanilla entry (`widget/widget-entry.tsx`) bridges to the React composer via a tiny
subscribe/emit module (`widget/openBridge.ts`) — the entry pushes a seed, the mounted
`WidgetApp` drains it — so the plain-JS entry never touches React state directly.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
