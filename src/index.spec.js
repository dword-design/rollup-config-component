import chdir from '@dword-design/chdir'
import { endent } from '@dword-design/functions'
import puppeteer from '@dword-design/puppeteer'
import tester from '@dword-design/tester'
import testerPluginTmpDir from '@dword-design/tester-plugin-tmp-dir'
import { loadNuxt } from '@nuxt/kit'
import packageName from 'depcheck-package-name'
import { execa, execaCommand } from 'execa'
import fileUrl from 'file-url'
import fs from 'fs-extra'
import { createRequire } from 'module'
import { build } from 'nuxt'
import outputFiles from 'output-files'
import { pEvent } from 'p-event'
import kill from 'tree-kill-promise'

const vueCdnScript =
  '<script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>'

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

    const install = app => {
      if (install.installed) return
      install.installed = true
      app.component('TmpComponent', TmpComponent)
    }

    TmpComponent.install = install

    if ('false' === process.env.ES_BUILD) {
      if (typeof window !== 'undefined') {
        window.TmpComponent = TmpComponent
      } else if (typeof global !== 'undefined') {
        global.TmpComponent = TmpComponent
      }
    }

    export default TmpComponent
  `,
}

export default tester(
  {
    babel: {
      componentFiles: {
        'src/index.vue': endent`
          <template>
            <div class="tmp-component">{{ foo }}</div>
          </template>

          <script>
          export default {
            computed: {
              foo: () => 1 |> x => x * 2,
            },
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
          <template>
            <div class="tmp-component">{{ foo }}</div>
          </template>

          <script>
          import foo from 'foo'

          export default {
            computed: {
              foo: () => foo,
            },
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
                const app = Vue.createApp({
                  template: '<tmp-component />',
                })
                app.use(TmpComponent)
                app.mount('#app')
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

      const nuxt = await loadNuxt({ config: { telemetry: false } })
      await build(nuxt)

      const childProcess = execaCommand('nuxt start', { all: true })
      await pEvent(
        childProcess.all,
        'data',
        data => data.toString() === 'Listening http://[::]:3000\n'
      )

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
        await kill(childProcess.pid)
      }
    },
    'external dependency': {
      componentFiles: {
        'node_modules/foo/index.js': "export default 'Hello world'",
        'src/index.vue': endent`
          <template>
            <div class="tmp-component">{{ foo }}</div>
          </template>

          <script>
          import foo from 'foo'

          export default {
            computed: {
              foo: () => foo,
            },
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
                const app = Vue.createApp({
                  template: '<tmp-component />',
                })
                app.use(TmpComponent)
                app.mount('#app')
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
          import TmpComponent from '../tmp-component'
          
          export default defineNuxtPlugin(nuxtApp => nuxtApp.vueApp.use(TmpComponent))
        `,
      })

      const nuxt = await loadNuxt({ config: { telemetry: false } })
      await build(nuxt)

      const childProcess = execaCommand('nuxt start', { all: true })
      await pEvent(
        childProcess.all,
        'data',
        data => data.toString() === 'Listening http://[::]:3000\n'
      )

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
        await kill(childProcess.pid)
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
            const app = Vue.createApp({
              template: '<tmp-component />',
            })
            app.use(TmpComponent)
            app.mount('#app')
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
              <template>
                <div class="tmp-component">Hello world</div>
              </template>
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
