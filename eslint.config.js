// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    unocss: true,
    formatters: true,
    ignores: [
      'design/**',
      // Verbatim device exports — reformatting them would defeat the point
      // of testing the importer against a real-world file.
      'test/fixtures/**',
    ],
  },
)
