import { defineConfig, type Plugin } from 'vite'
import { createRelay } from './server/relay.ts'

/** Runs the multiplayer relay inside `vite` and `vite preview`, so one command does everything. */
const relay = (): Plugin => ({
  name: 'relay',
  configureServer(server) {
    if (server.httpServer) createRelay().attach(server.httpServer)
  },
  configurePreviewServer(server) {
    createRelay().attach(server.httpServer)
  },
})

export default defineConfig({
  plugins: [relay()],
})
