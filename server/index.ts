// Production server: serves the built site from dist/ and hosts the multiplayer relay.
// Run `npm run build && npm start`.

import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, resolve, sep } from 'node:path'
import { createRelay, PATH } from './relay.ts'

const root = resolve(import.meta.dirname, '..', 'dist')
const assets = join(root, 'assets') + sep
const port = Number(process.env.PORT ?? 8080)
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
}

const isFile = (path: string) => {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

const server = createServer((req, res) => {
  let pathname: string
  try {
    pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)
  } catch {
    res.writeHead(400).end()
    return
  }
  // Unknown paths get the app, which handles its own links (like ?room=).
  let file = resolve(root, `.${pathname}`)
  if (!file.startsWith(root + sep) || !isFile(file)) file = join(root, 'index.html')
  const stream = createReadStream(file)
  stream.once('open', () => {
    res.writeHead(200, {
      'content-type': types[extname(file)] ?? 'application/octet-stream',
      // Built assets have hashed names and never change; everything else is checked each time.
      'cache-control': file.startsWith(assets) ? 'public, max-age=31536000, immutable' : 'no-cache',
    })
    stream.pipe(res)
  })
  stream.once('error', () => {
    if (!res.headersSent) res.writeHead(404)
    res.end()
  })
})

createRelay().attach(server)
// Nothing else here speaks WebSocket: close any other upgrade instead of leaving it hanging.
server.on('upgrade', (req, socket) => {
  try {
    if (new URL(req.url ?? '/', 'http://x').pathname === PATH) return
  } catch {}
  socket.destroy()
})
server.listen(port, () => console.log(`http://localhost:${port}`))
