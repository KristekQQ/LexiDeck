import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

function dataStaticPlugin() {
  return {
    name: 'lexideck-data-static',
    configureServer(server) {
      // Serve files from /data (read-only)
      server.middlewares.use('/data', (req, res, next) => {
        try {
          const url = new URL(req.url, 'http://localhost')
          const file = url.pathname.replace(/^\/data\/?/, '')
          const fp = path.join(process.cwd(), 'data', file)
          if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
            fs.createReadStream(fp).pipe(res)
            return
          }
        } catch {}
        res.statusCode = 404
        res.end('Not found')
      })

      // Map /src/* to Vite FS served files so that public/index.html can reference /src/*
      server.middlewares.use((req, _res, next) => {
        if (req.url && req.url.startsWith('/src/')) {
          const abs = path.join(process.cwd(), req.url.slice(1))
          // Rewrite URL to Vite's /@fs/ absolute path
          const normalized = '/@fs/' + abs.replaceAll('\\', '/')
          req.url = normalized
        }
        next()
      })

      // Serve cert files to help install CA on devices (if present)
      server.middlewares.use('/ca.crt', (req, res, next) => {
        const cand = ['cert/rootCA.crt', 'cert/rootCA.pem']
        for (const p of cand) {
          const fp = path.join(process.cwd(), p)
          if (fs.existsSync(fp)) {
            res.setHeader('Content-Type', 'application/x-x509-ca-cert')
            fs.createReadStream(fp).pipe(res)
            return
          }
        }
        res.statusCode = 404
        res.end('Not found')
      })
      server.middlewares.use('/cert/server.crt', (req, res, next) => {
        const fp = path.join(process.cwd(), 'cert', 'server.crt')
        if (fs.existsSync(fp)) {
          res.setHeader('Content-Type', 'application/x-x509-ca-cert')
          fs.createReadStream(fp).pipe(res)
          return
        }
        res.statusCode = 404
        res.end('Not found')
      })
    }
  }
}

export default defineConfig({
  root: 'public',
  plugins: [dataStaticPlugin()],
  server: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0',
    open: false,
    fs: { allow: [process.cwd()] }
  },
  preview: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0'
  }
})
