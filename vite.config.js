import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const ondokuUrl = env.ONDOKU_TTS_URL || 'https://ondoku3.com/vi/text_to_speech/'
  const ondokuOrigin = env.ONDOKU_TTS_ORIGIN || 'https://ondoku3.com'
  const ondokuReferer = env.ONDOKU_TTS_REFERER || 'https://ondoku3.com/vi/'
  const ondokuAcceptLanguage = env.ONDOKU_TTS_ACCEPT_LANGUAGE || 'vi,en-US;q=0.9,en;q=0.8'
  const ondokuUserAgent = env.ONDOKU_TTS_USER_AGENT || 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36'
  const ondokuCsrfToken = env.ONDOKU_CSRF_TOKEN || ''
  const ondokuCookie = env.ONDOKU_COOKIE || ''
  const ondokuLanguage = env.ONDOKU_LANGUAGE || 'ja-JP'

  const ondokuProxyPlugin = {
    name: 'ondoku-tts-proxy',
    configureServer(server) {
      server.middlewares.use('/api/ondoku-tts', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        try {
          let rawBody = ''
          for await (const chunk of req) {
            rawBody += chunk
          }

          const body = rawBody ? JSON.parse(rawBody) : {}
          const text = String(body?.text || '').trim()
          const voice = String(body?.voice || 'ja-JP-NaokiNeural').trim()
          const speed = Number(body?.speed ?? 1)
          const pitch = Number(body?.pitch ?? 0)
          const language = String(body?.language || ondokuLanguage || 'ja-JP').trim()

          if (!text) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: 'Missing text' }))
            return
          }

          const form = new FormData()
          form.append('text', text)
          form.append('voice', voice)
          form.append('speed', String(speed))
          form.append('pitch', String(pitch))

          const settingsCookie = `settings=${JSON.stringify({ voice, speed, pitch, language })}`
          const cookieHeader = [settingsCookie, ondokuCookie].filter(Boolean).join('; ')

          const upstream = await fetch(ondokuUrl, {
            method: 'POST',
            headers: {
              accept: '*/*',
              'accept-language': ondokuAcceptLanguage,
              origin: ondokuOrigin,
              referer: ondokuReferer,
              'user-agent': ondokuUserAgent,
              'x-requested-with': 'XMLHttpRequest',
              ...(ondokuCsrfToken ? { 'x-csrftoken': ondokuCsrfToken } : {}),
              ...(cookieHeader ? { cookie: cookieHeader } : {})
            },
            body: form
          })

          const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
          const data = await upstream.arrayBuffer()
          const buffer = Buffer.from(data)

          res.statusCode = upstream.status
          res.setHeader('Content-Type', contentType)
          res.end(buffer)
        } catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: error?.message || 'Proxy error' }))
        }
      })
    }
  }

  return {
    plugins: [react(), ondokuProxyPlugin],
    server: {
      port: 3000,
      open: true,
      allowedHosts: ['all-tools-nihongo.onrender.com']
    },
    preview: {
      allowedHosts: ['all-tools-nihongo.onrender.com']
    }
  }
})
