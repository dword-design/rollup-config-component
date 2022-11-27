import chdir from '@dword-design/chdir'
import { endent } from '@dword-design/functions'
import puppeteer from '@dword-design/puppeteer'
import tester from '@dword-design/tester'
import testerPluginTmpDir from '@dword-design/tester-plugin-tmp-dir'
import packageName from 'depcheck-package-name'
import execa from 'execa'
import fileUrl from 'file-url'
import fs from 'fs-extra'
import { createRequire } from 'module'
import { Builder, Nuxt } from 'nuxt'
import outputFiles from 'output-files'

import { vueCdnScript } from './variables.js'

const _require = createRequire(import.meta.url)

const configFiles = {
  '.babelrc.json': JSON.stringify({
    extends: '@dword-design/babel-config',
  }),
  '.browserslistrc': endent`
    current node
    last 2 versions and > 2%
    ie > 10
  `,
  'package.json': JSON.stringify({
    browser: 'dist/index.esm.js',
    main: 'dist/index.ssr.js',
    module: 'dist/index.esm.js',
    unpkg: 'dist/index.min.js',
  }),
  'src/entry.js': endent`
    import TmpComponent from './index.vue'

    const install = Vue => {
      if (install.installed) return
      install.installed = true
      Vue.component('TmpComponent', TmpComponent)
    }
    
    const plugin = { install }

    if ('false' === process.env.ES_BUILD) {
      let GlobalVue = null
      if (typeof window !== 'undefined') {
        GlobalVue = window.Vue
      } else if (typeof global !== 'undefined') {
        GlobalVue = global.Vue;
      }
      if (GlobalVue) {
        GlobalVue.use(plugin)
      }
    }

    TmpComponent.install = install

    export default TmpComponent
  `,
}

export default tester(
  {
    babel: {
      componentFiles: {
        'src/index.vue': endent`
          <script>
          const foo = 1 |> x => x * 2
          
          export default {
            render: () => <div class="tmp-component">{foo}</div>
          }
          </script>
        `,
      },
    },
    'browser field': {
      componentFiles: {
        'node_modules/foo': {
          'browser.js': "export default 'Hello world'",
          'index.js': 'export default new Buffer()',
          'package.json': JSON.stringify({ browser: 'browser.js' }),
        },
        'src/index.vue': endent`
          <script>
          import foo from 'foo'

          export default {
            render: () => <div class="tmp-component">{foo}</div>,
          }
          </script>
        `,
      },
      test: async () => {
        await outputFiles({
          'index.html': endent`
            <body>
              ${vueCdnScript}
              <script src="tmp-component/dist/index.min.js"></script>
            
              <div id="app"></div>
            
              <script>
                new Vue({
                  el: '#app',
                  template: '<tmp-component />',
                })
              </script>
            </body>
          `,
        })

        const browser = await puppeteer.launch()

        const page = await browser.newPage()
        try {
          await page.goto(fileUrl('index.html'))

          const component = await page.waitForSelector('.tmp-component')
          expect(await component.evaluate(el => el.innerText)).toEqual(
            'Hello world'
          )
        } finally {
          await browser.close()
        }
      },
    },
    component: async () => {
      await outputFiles({
        'pages/index.vue': endent`
          <template>
            <tmp-component />
          </template>
          <script>
          import TmpComponent from '../tmp-component'
          export default {
            components: {
              TmpComponent,
            },
          }
          </script>
        `,
      })

      const nuxt = new Nuxt()
      await new Builder(nuxt).build()
      await nuxt.listen()

      const browser = await puppeteer.launch()

      const page = await browser.newPage()
      try {
        await page.goto('http://localhost:3000')

        const component = await page.waitForSelector('.tmp-component')
        expect(await component.evaluate(el => el.innerText)).toEqual(
          'Hello world'
        )
      } finally {
        await browser.close()
        await nuxt.close()
      }
    },
    'external dependency': {
      componentFiles: {
        'node_modules/foo/index.js': "export default 'Hello world'",
        'src/index.vue': endent`
          <script>
          import foo from 'foo'

          export default {
            render: () => <div class="tmp-component">{foo}</div>,
          }
          </script>
        `,
      },
      test: async () => {
        await outputFiles({
          'index.html': endent`
            <body>
              ${vueCdnScript}
              <script src="tmp-component/dist/index.min.js"></script>
            
              <div id="app"></div>
            
              <script>
                new Vue({
                  el: '#app',
                  template: '<tmp-component />',
                })
              </script>
            </body>
          `,
        })

        const browser = await puppeteer.launch()

        const page = await browser.newPage()
        try {
          await page.goto(fileUrl('index.html'))

          const component = await page.waitForSelector('.tmp-component')
          expect(await component.evaluate(el => el.innerText)).toEqual(
            'Hello world'
          )
        } finally {
          await browser.close()
        }
      },
    },
    plugin: async () => {
      await outputFiles({
        'pages/index.vue': endent`
          <template>
            <tmp-component />
          </template>
        `,
        'plugins/plugin.js': endent`
          import Vue from 'vue'
          import TmpComponent from '../tmp-component'
          
          Vue.use(TmpComponent)
        `,
      })

      const nuxt = new Nuxt({ plugins: ['~/plugins/plugin.js'] })
      await new Builder(nuxt).build()
      await nuxt.listen()

      const browser = await puppeteer.launch()

      const page = await browser.newPage()
      try {
        await page.goto('http://localhost:3000')

        const component = await page.waitForSelector('.tmp-component')
        expect(await component.evaluate(el => el.innerText)).toEqual(
          'Hello world'
        )
      } finally {
        await browser.close()
        await nuxt.close()
      }
    },
    script: async () => {
      await fs.outputFile(
        'index.html',
        endent`
        <body>
          ${vueCdnScript}
          <script src="tmp-component/dist/index.min.js"></script>
        
          <div id="app"></div>
        
          <script>
            new Vue({
              el: '#app',
              template: '<tmp-component />',
            })
          </script>
        </body>
      `
      )

      const browser = await puppeteer.launch()

      const page = await browser.newPage()
      try {
        await page.goto(fileUrl('index.html'))

        const component = await page.waitForSelector('.tmp-component')
        expect(await component.evaluate(el => el.innerText)).toEqual(
          'Hello world'
        )
      } finally {
        await browser.close()
      }
    },
  },
  [
    {
      transform: test => async () => {
        if (typeof test === 'function') {
          test = { test }
        }
        test = { test: () => {}, ...test }
        await fs.mkdir('tmp-component')
        await chdir('tmp-component', async () => {
          await outputFiles({
            ...configFiles,
            'src/index.vue': endent`
              <script>
              export default {
                render: () => <div class="tmp-component">Hello world</div>
              }
              </script>
            `,
            ...test.componentFiles,
          })
          await execa(
            packageName`rollup`,
            ['--config', _require.resolve('.')],
            {
              env: { NODE_ENV: 'production' },
            }
          )
        })
        await test.test()
      },
    },
    testerPluginTmpDir(),
  ]
)
