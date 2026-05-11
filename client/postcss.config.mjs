/**
 * Konfiguracja PostCSS
 *
 * Tailwind CSS v4 (przez @tailwindcss/vite) automatycznie konfiguruje wszystkie wymagane
 * pluginy PostCSS — NIE trzeba tutaj dodawać `tailwindcss` ani `autoprefixer`.
 *
 * Ten plik służy wyłącznie do dodawania opcjonalnych pluginów PostCSS, jeśli zajdzie taka potrzeba.
 * Na przykład:
 *
 * import postcssNested from 'postcss-nested'
 * export default { plugins: [postcssNested()] }
 *
 * W przeciwnym razie plik może zostać pusty.
 */
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}