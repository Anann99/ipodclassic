// Production server: serves the built site from dist/ and hosts the multiplayer relay.
// Run `npm run build && npm start`.

import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, resolve, sep } from 'node:path'
import { createRelay } from './relay.ts'

const root = resolve(import.meta.dirname, '..', 'dist')
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
  const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)
  let file = resolve(root, `.${pathname}`)
  if (!file.startsWith(root + sep) || !isFile(file)) file = join(root, 'index.html')
  res.writeHead(200, {
    'content-type': types[extname(file)] ?? 'application/octet-stream',
    'cache-control': file.includes(`${sep}assets${sep}`)
      ? 'public, max-age=31536000, immutable'
      : 'no-cache',
  })
  createReadStream(file).pipe(res)
})

createRelay().attach(server)
server.listen(port, () => console.log(`http://localhost:${port}`))
