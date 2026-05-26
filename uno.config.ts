import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetUno,
  presetWebFonts,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

/**
 * Cockpit minimal design tokens are the runtime source of truth
 * (see src/styles/tokens.css). Utility classes below map onto those
 * CSS variables so dark mode flips both channels in lockstep.
 *
 * v1 shortcuts (btn / icon-btn — teal) are kept temporarily; the v2
 * rewrite (Phase 4) will replace them with cockpit-styled equivalents.
 */
export default defineConfig({
  shortcuts: [
    ['btn', 'px-4 py-1 rounded inline-block bg-teal-700 text-white cursor-pointer !outline-none hover:bg-teal-800 disabled:cursor-default disabled:bg-gray-600 disabled:opacity-50'],
    ['icon-btn', 'inline-block cursor-pointer select-none opacity-75 transition duration-200 ease-in-out hover:opacity-100 hover:text-teal-600'],
  ],
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
      collections: {
        carbon: () => import('@iconify-json/carbon/icons.json').then(i => i.default),
      },
    }),
    presetTypography(),
    presetWebFonts({
      fonts: {
        display: { name: 'Archivo Narrow', weights: ['500', '600', '700', '800'] },
        sans: { name: 'Archivo', weights: ['400', '500', '600', '700'] },
        mono: { name: 'Space Mono', weights: ['400', '700'] },
      },
    }),
  ],
  theme: {
    colors: {
      'ink': 'var(--ck-ink)',
      'ink-dim': 'var(--ck-ink-dim)',
      'dim': 'var(--ck-dim)',
      'dimmer': 'var(--ck-dimmer)',
      'paper': 'var(--ck-paper)',
      'bg-deep': 'var(--ck-bg-deep)',
      'grid': 'var(--ck-grid)',
      'signal': 'var(--ck-signal)',
      'on-signal': 'var(--ck-on-signal)',
    },
    fontSize: {
      display: ['var(--ck-fs-display)', 'var(--ck-line-tight)'],
      h1: ['var(--ck-fs-h1)', 'var(--ck-line-tight)'],
      h2: ['var(--ck-fs-h2)', 'var(--ck-line-tight)'],
      body: ['var(--ck-fs-body)', 'var(--ck-line-body)'],
      meta: ['var(--ck-fs-meta)', 'var(--ck-line-body)'],
      eyebrow: ['var(--ck-fs-eyebrow)', 'var(--ck-line-body)'],
      micro: ['var(--ck-fs-micro)', 'var(--ck-line-body)'],
    },
    borderRadius: {
      flat: 'var(--ck-radius-flat)',
      soft: 'var(--ck-radius-soft)',
      pill: 'var(--ck-radius-pill)',
    },
  },
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
  safelist: 'prose m-auto text-left'.split(' '),
})
