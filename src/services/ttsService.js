const ONDOKU_TTS_URL = import.meta.env.VITE_ONDOKU_TTS_PROXY_URL || '/api/ondoku-tts'
const DEFAULT_VOICE = import.meta.env.VITE_ONDOKU_TTS_VOICE || 'ja-JP-NaokiNeural'
const DEFAULT_SPEED = Number(import.meta.env.VITE_ONDOKU_TTS_SPEED || 1)
const DEFAULT_PITCH = Number(import.meta.env.VITE_ONDOKU_TTS_PITCH || 0)

function resolveAudioUrl(rawUrl, endpoint) {
  if (!rawUrl) return ''
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl
  try {
    const base = new URL(endpoint)
    if (rawUrl.startsWith('/')) {
      return `${base.protocol}//${base.host}${rawUrl}`
    }
    return new URL(rawUrl, endpoint).toString()
  } catch {
    return rawUrl
  }
}

function pickAudioUrl(data, endpoint) {
  if (!data || typeof data !== 'object') return ''
  const keys = ['audio_url', 'audioUrl', 'url', 'file', 'mp3_url', 'voice_url', 'path']
  for (const k of keys) {
    const v = data[k]
    if (typeof v === 'string' && v.trim()) {
      return resolveAudioUrl(v.trim(), endpoint)
    }
  }
  return ''
}

export async function synthesizeOndokuTts(text, options = {}) {
  const sentence = String(text || '').trim()
  if (!sentence) throw new Error('Text rong, khong the tao TTS.')

  const voice = options.voice || DEFAULT_VOICE
  const speed = Number(options.speed ?? DEFAULT_SPEED)
  const pitch = Number(options.pitch ?? DEFAULT_PITCH)
  const endpoint = options.endpoint || ONDOKU_TTS_URL

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: '*/*'
    },
    body: JSON.stringify({
      text: sentence,
      voice,
      speed,
      pitch,
      language: options.language || 'ja-JP'
    })
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`Ondoku TTS fail (${response.status}). ${errText.slice(0, 180)}`)
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('audio/')) {
    const blob = await response.blob()
    return {
      audioUrl: URL.createObjectURL(blob),
      source: 'blob'
    }
  }

  if (contentType.includes('application/json')) {
    const data = await response.json()
    const audioUrl = pickAudioUrl(data, endpoint)
    if (!audioUrl) {
      throw new Error('Ondoku response khong co duong dan audio.')
    }
    return {
      audioUrl,
      source: 'json',
      raw: data
    }
  }

  const rawText = (await response.text()).trim()
  const maybeUrl = rawText.match(/https?:\/\/[^\s"']+/)?.[0] || rawText
  const audioUrl = resolveAudioUrl(maybeUrl, endpoint)
  if (!audioUrl) {
    throw new Error('Ondoku response text khong chua URL audio.')
  }
  return {
    audioUrl,
    source: 'text'
  }
}

export async function playOndokuTts(text, options = {}) {
  const { audioUrl } = await synthesizeOndokuTts(text, options)
  const audio = new Audio(audioUrl)
  await audio.play()
  return audio
}
