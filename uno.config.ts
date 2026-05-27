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
 */
export default defineConfig({
  shortcuts: [],
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
