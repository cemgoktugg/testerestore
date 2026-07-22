import path from 'node:path'
import { loadEnv, defineConfig } from '@medusajs/framework/utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ViteConfig = any

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5 MB

// Path the Medusa Vite plugin scans for custom admin widgets / routes
// (./src/admin/widgets, ./src/admin/routes, ...).
const LOCAL_ADMIN_SOURCE = path.resolve(__dirname, 'src/admin')

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  modules: [
    // Redis: event bus + cache + workflow engine. REDIS_URL varsa (production)
    // Redis kullanılır; yoksa (local dev, Redis yok) Medusa'nın in-memory
    // default'ları devreye girer. Production'da tek instance için bile
    // event/job/workflow kalıcılığı için Redis şart (yeniden başlatmada kayıp yok).
    ...(process.env.REDIS_URL
      ? [
          {
            resolve: "@medusajs/event-bus-redis",
            options: { redisUrl: process.env.REDIS_URL },
          },
          {
            resolve: "@medusajs/cache-redis",
            options: { redisUrl: process.env.REDIS_URL },
          },
          {
            resolve: "@medusajs/workflow-engine-redis",
            options: { redis: { url: process.env.REDIS_URL } },
          },
        ]
      : []),
    {
      resolve: "./src/modules/hero-slider",
    },
    {
      resolve: "./src/modules/footer",
    },
    {
      resolve: "./src/modules/blade-price-matrix",
    },
    {
      resolve: "./src/modules/product-review",
    },
    {
      resolve: "./src/modules/newsletter",
    },
    {
      resolve: "./src/modules/blog",
    },
    {
      resolve: "./src/modules/loyalty",
    },
    {
      resolve: "./src/modules/site-seo",
    },
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "./src/modules/notification-resend",
            id: "resend",
            options: {
              channels: ["email"],
              apiKey: process.env.RESEND_API_KEY,
              fromEmail: process.env.RESEND_FROM_EMAIL,
              fromName: process.env.RESEND_FROM_NAME,
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/payment-iyzico",
            id: "iyzico",
            options: {
              apiKey: process.env.IYZICO_API_KEY,
              secretKey: process.env.IYZICO_SECRET_KEY,
              baseUrl: process.env.IYZICO_BASE_URL,
              callbackUrl: process.env.IYZICO_CALLBACK_URL,
            },
          },
        ],
      },
    },
  ],
  // `sources` is supported at runtime (spread into adminOptions) but missing
  // from Medusa's public `AdminOptions` type — cast to silence TS while
  // keeping the value live.
  admin: {
    // Tell Medusa's Vite plugin to scan our project's src/admin/ for
    // custom widgets and routes (when they exist).
    sources: [LOCAL_ADMIN_SOURCE],
    // Increase the admin's upload size cap from the 1 MB default.
    maxUploadFileSize: MAX_UPLOAD_BYTES,
    /**
     * Without this, esbuild pre-bundles @medusajs/dashboard with the token
     * `__MAX_UPLOAD_FILE_SIZE__` unreplaced — it becomes `undefined` at
     * runtime and the `?? 1024*1024` fallback kicks in, leaving the UI
     * stuck at the 1 MB default no matter what `maxUploadFileSize` says.
     * Mirroring the define into esbuildOptions fixes the prebundle.
     */
    vite: (config: ViteConfig): ViteConfig => {
      config.optimizeDeps = config.optimizeDeps || {}
      config.optimizeDeps.esbuildOptions = {
        ...(config.optimizeDeps.esbuildOptions || {}),
        define: {
          ...(config.optimizeDeps.esbuildOptions?.define || {}),
          __MAX_UPLOAD_FILE_SIZE__: String(MAX_UPLOAD_BYTES),
        },
      }

      /**
       * Replace @vitejs/plugin-react with a fresh instance that EXCLUDES
       * our custom src/admin/** files. The original (added by admin-bundler
       * without options) wraps every .tsx with Fast Refresh code; when the
       * Medusa admin-vite-plugin re-imports our widget/route files via
       * virtual modules, the wrapper gets injected twice and the file
       * fails to load ("inWebWorker has already been declared").
       *
       * By excluding our admin path, plugin-react never touches those
       * files. The pre-transform plugin below handles their JSX/TSX with
       * esbuild instead — same end result, no Fast Refresh wrap.
       *
       * The /@react-refresh runtime endpoint is still served (one of the
       * new plugin's sub-plugins provides it), so the admin shell HTML
       * that imports it keeps working.
       */
      const adminSourceMatch = LOCAL_ADMIN_SOURCE.replace(/\\/g, '/')
      const adminExcludePattern = new RegExp(
        `${adminSourceMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/.*\\.(tsx?|jsx?)(\\?|$)`
      )
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const reactPlugin = require('@vitejs/plugin-react').default
      const freshReact = reactPlugin({ exclude: adminExcludePattern })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const flat = (config.plugins as any[]).flat(Infinity)
      // Strip the original plugin-react sub-plugins
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const withoutReact = flat.filter((p: any) => {
        if (!p || typeof p !== 'object') return !!p
        const name = (p as { name?: string }).name || ''
        return !name.startsWith('vite:react-')
      })
      // Append the new exclude-aware instance
      config.plugins = [
        ...withoutReact,
        ...(Array.isArray(freshReact) ? freshReact : [freshReact]),
      ]

      /**
       * Pre-transform our admin source files with esbuild. plugin-react
       * is now excluded for these paths, so without this they'd be served
       * raw TSX (browser can't run that). esbuild converts JSX → _jsx().
       */
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const esbuild = require('esbuild')
      const isAdminFile = (id: string) => {
        const normalized = id.replace(/\\/g, '/')
        if (!normalized.includes(adminSourceMatch)) return false
        return /\.([jt]sx?)(\?|$)/.test(normalized)
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(config.plugins as any[]).unshift({
        name: 'medusa-admin-esbuild-pre',
        enforce: 'pre',
        async transform(code: string, id: string) {
          if (!isAdminFile(id)) return null
          const m = id.replace(/\\/g, '/').match(/\.([jt]sx?)(\?|$)/)
          if (!m) return null
          const ext = m[1]
          const loader =
            ext === 'tsx' ? 'tsx' : ext === 'ts' ? 'ts' : ext === 'jsx' ? 'jsx' : 'js'
          const result = await esbuild.transform(code, {
            loader,
            jsx: 'automatic',
            jsxImportSource: 'react',
            sourcefile: id,
            sourcemap: true,
            target: 'esnext',
          })
          return { code: result.code, map: result.map }
        },
      })

      return config
    },
  } as never,
})
