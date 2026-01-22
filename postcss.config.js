export default {
  plugins: {
    '@tailwindcss/postcss': {},
    // Convert oklch() colors to rgb() with fallbacks for older browsers
    '@csstools/postcss-oklab-function': { preserve: true },
    autoprefixer: {},
  },
}
