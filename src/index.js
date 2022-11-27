import { babel } from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import fs from 'fs-extra'
import minimist from 'minimist'
import { terser } from 'rollup-plugin-terser'
import vue from 'rollup-plugin-vue'

import generateScopedName from './generate-scoped-name.js'

// Get browserslist config and remove ie from es build targets
const esbrowserslist = fs
  .readFileSync('./.browserslistrc')
  .toString()
  .split('\n')
  .filter(entry => entry && entry.substring(0, 2) !== 'ie')

const argv = minimist(process.argv.slice(2))

const baseConfig = {
  input: 'src/entry.js',
  plugins: {
    babel: {
      exclude: 'node_modules/**',
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue'],
    },
    replace: {
      'process.env.ES_BUILD': JSON.stringify('false'),
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    vue: {
      css: true,
      style: {
        postcssModulesOptions: {
          generateScopedName,
          localsConvention: 'camelCase',
        },
      },
      template: {
        isProduction: true,
      },
    },
  },
}

// ESM/UMD/IIFE shared settings: externals
// Refer to https://rollupjs.org/guide/en/#warning-treating-module-as-external-dependency
const external = [
  // list external dependencies, exactly the way it is written in the import statement.
  // eg. 'jquery'
  'vue',
]

// UMD/IIFE shared settings: output.globals
// Refer to https://rollupjs.org/guide/en#output-globals for details
const globals = {
  // Provide global variable names to replace your external imports
  // eg. jquery: '$'
  vue: 'Vue',
}

// Customize configs for individual targets
const buildFormats = []
if (!argv.format || argv.format === 'es') {
  const esConfig = {
    ...baseConfig,
    external,
    output: {
      exports: 'named',
      file: 'dist/index.esm.js',
      format: 'esm',
    },
    plugins: [
      replace({
        ...baseConfig.plugins.replace,
        'process.env.ES_BUILD': JSON.stringify('true'),
      }),
      vue(baseConfig.plugins.vue),
      babel({
        ...baseConfig.plugins.babel,
        presets: [
          [
            '@babel/preset-env',
            {
              targets: esbrowserslist,
            },
          ],
        ],
      }),
      commonjs(),
    ],
  }
  buildFormats.push(esConfig)
}
if (!argv.format || argv.format === 'cjs') {
  const umdConfig = {
    ...baseConfig,
    external,
    output: {
      compact: true,
      exports: 'named',
      file: 'dist/index.ssr.js',
      format: 'cjs',
      globals,
    },
    plugins: [
      replace(baseConfig.plugins.replace),
      vue({
        ...baseConfig.plugins.vue,
        template: {
          ...baseConfig.plugins.vue.template,
          optimizeSSR: true,
        },
      }),
      babel(baseConfig.plugins.babel),
      commonjs(),
    ],
  }
  buildFormats.push(umdConfig)
}
if (!argv.format || argv.format === 'iife') {
  const unpkgConfig = {
    ...baseConfig,
    external,
    output: {
      compact: true,
      exports: 'named',
      file: 'dist/index.min.js',
      format: 'iife',
      globals,
    },
    plugins: [
      replace(baseConfig.plugins.replace),
      vue(baseConfig.plugins.vue),
      babel(baseConfig.plugins.babel),
      commonjs(),
      nodeResolve({ browser: true }),
      terser({
        output: {
          ecma: 5,
        },
      }),
    ],
  }
  buildFormats.push(unpkgConfig)
}

// Export config
export default buildFormats
