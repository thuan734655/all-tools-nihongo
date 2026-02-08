// Groq API Service for Grammar Explanations

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY

export async function getGrammarExplanation(pattern, existingExamples = []) {
  if (!GROQ_API_KEY || GROQ_API_KEY === 'your_groq_api_key_here') {
    throw new Error('Vui lòng thêm GROQ API key vào file .env')
  }

  const prompt = `Bạn là giáo viên tiếng Nhật. Hãy giải thích ngữ pháp N3 sau đây bằng tiếng Việt:

Ngữ pháp: ${pattern}

Yêu cầu trả về theo định dạng sau:
1. **Ý nghĩa**: Giải thích ngắn gọn nghĩa của ngữ pháp này bằng tiếng Việt (2-3 câu)

2. **Cách dùng**: Cấu trúc ngữ pháp và cách sử dụng

3. **Ví dụ** (3 ví dụ):
   - 日本語: [câu tiếng Nhật]
   - Việt: [bản dịch tiếng Việt]
   - Romaji: [phiên âm]

Hãy trả lời ngắn gọn, dễ hiểu cho người học tiếng Nhật trình độ N3.`

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 1
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Lỗi khi gọi Groq API')
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || 'Không có kết quả'
  } catch (error) {
    console.error('Groq API error:', error)
    throw error
  }
}

export async function streamGrammarExplanation(pattern, onChunk) {
  if (!GROQ_API_KEY || GROQ_API_KEY === 'your_groq_api_key_here') {
    throw new Error('Vui lòng thêm GROQ API key vào file .env')
  }

  const prompt = `Bạn là giáo viên tiếng Nhật. Hãy giải thích ngữ pháp N3 sau đây bằng tiếng Việt:

Ngữ pháp: ${pattern}

Yêu cầu trả về theo định dạng sau:
1. **Ý nghĩa**: Giải thích ngắn gọn nghĩa của ngữ pháp này bằng tiếng Việt (2-3 câu)

2. **Cách dùng**: Cấu trúc ngữ pháp và cách sử dụng

3. **Ví dụ** (3 ví dụ):
   - 日本語: [câu tiếng Nhật]
   - Việt: [bản dịch tiếng Việt]
   - Romaji: [phiên âm]

Hãy trả lời ngắn gọn, dễ hiểu cho người học tiếng Nhật trình độ N3.`

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2048,
      top_p: 1,
      stream: true
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Lỗi khi gọi Groq API')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullContent = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(line => line.trim() !== '')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices[0]?.delta?.content || ''
          fullContent += content
          onChunk(content, fullContent)
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }

  return fullContent
}

function extractJson(text) {
  if (!text || typeof text !== 'string') return null

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced?.[1]) return fenced[1]

  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1)
  }

  const startObj = text.indexOf('{')
  const endObj = text.lastIndexOf('}')
  if (startObj !== -1 && endObj !== -1 && endObj > startObj) {
    return text.slice(startObj, endObj + 1)
  }

  return null
}

function extractBalancedJson(text) {
  if (!text || typeof text !== 'string') return null

  const firstArray = text.indexOf('[')
  const firstObj = text.indexOf('{')
  let start = -1
  let openChar = ''
  let closeChar = ''

  if (firstArray !== -1 && (firstObj === -1 || firstArray < firstObj)) {
    start = firstArray
    openChar = '['
    closeChar = ']'
  } else if (firstObj !== -1) {
    start = firstObj
    openChar = '{'
    closeChar = '}'
  } else {
    return null
  }

  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (ch === '\\') {
        escaped = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }

    if (ch === '"') {
      inString = true
      continue
    }

    if (ch === openChar) depth++
    if (ch === closeChar) {
      depth--
      if (depth === 0) {
        return text.slice(start, i + 1)
      }
    }
  }

  return null
}

function cleanupJsonLike(text) {
  if (!text || typeof text !== 'string') return text

  return text
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u001F\u007F]/g, (c) => (c === '\n' || c === '\t' ? c : ''))
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/,\s*([\]}])/g, '$1')
    .trim()
}

function repairJsonByBalancing(text) {
  if (!text || typeof text !== 'string') return text

  const str = text.trim()
  let inString = false
  let escaped = false
  const stack = []

  for (let i = 0; i < str.length; i++) {
    const ch = str[i]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (ch === '\\') {
        escaped = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }

    if (ch === '"') {
      inString = true
      continue
    }

    if (ch === '{' || ch === '[') {
      stack.push(ch)
      continue
    }
    if (ch === '}' || ch === ']') {
      const last = stack[stack.length - 1]
      if ((ch === '}' && last === '{') || (ch === ']' && last === '[')) {
        stack.pop()
      }
    }
  }

  let repaired = str
  if (inString) {
    // Best-effort: close the last unterminated string.
    repaired += '"'
  }

  // Remove dangling comma at end before closing
  repaired = repaired.replace(/,\s*$/g, '')

  for (let i = stack.length - 1; i >= 0; i--) {
    repaired += stack[i] === '{' ? '}' : ']'
  }

  return repaired
}

export async function getGrammarExercises(pattern) {
  if (!GROQ_API_KEY || GROQ_API_KEY === 'your_groq_api_key_here') {
    throw new Error('Vui lòng thêm GROQ API key vào file .env')
  }

  const prompt = `Bạn là giáo viên tiếng Nhật. Hãy tạo bài tập luyện ngữ pháp trình độ JLPT N3 cho mẫu ngữ pháp sau:

Ngữ pháp: ${pattern}

Yêu cầu:
- Trả về DUY NHẤT một JSON array.
- Mỗi phần tử là 1 bài tập.
- Tổng 6 bài: 3 bài trắc nghiệm (multiple-choice) + 3 bài điền khuyết (fill-blank).
- Định dạng mỗi bài:
  - type: "multiple-choice" | "fill-blank"
  - instruction: string (yêu cầu đề bài, ngắn gọn)
  - question: string (với fill-blank phải chứa "___")
  - options: string[] (4 lựa chọn)
  - answer: string (phải khớp 1 phần tử trong options)

Ràng buộc ngôn ngữ (CỰC KỲ QUAN TRỌNG):
- KHÔNG dùng romaji/latin alphabet trong question/options/answer.
- Question/options/answer phải viết bằng tiếng Nhật (hiragana/katakana/kanji).
- Nếu có kanji khó, hãy kèm furigana theo format: 漢字(かんじ) ngay trong câu.
- Không thêm dòng giải thích/đáp án ngoài JSON.

Lưu ý:
- JSON phải hợp lệ, không kèm markdown, không kèm giải thích.
- Chỉ trả về JSON array (không có text nào khác).`

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2048,
      top_p: 1
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Lỗi khi gọi Groq API')
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content || ''

  console.log('[Groq] getGrammarExercises raw content preview:', String(content).slice(0, 800))

  const jsonText = cleanupJsonLike(extractJson(content) || extractBalancedJson(content) || content)

  console.log('[Groq] getGrammarExercises extracted JSON preview:', String(jsonText).slice(0, 800))
  let parsed
  try {
    parsed = JSON.parse(jsonText)
  } catch (e) {
    const preview = String(content || '').slice(0, 400)
    throw new Error(`Không parse được bài tập từ AI (JSON không hợp lệ). Preview: ${preview}`)
  }

  const exercises = Array.isArray(parsed) ? parsed : parsed?.exercises
  if (!Array.isArray(exercises)) {
    throw new Error('Dữ liệu bài tập từ AI không đúng định dạng (cần JSON array).')
  }

  const normalized = exercises
    .map((ex) => ({
      type: ex?.type,
      instruction: typeof ex?.instruction === 'string' ? ex.instruction.trim() : '',
      question: typeof ex?.question === 'string' ? ex.question.trim() : '',
      options: Array.isArray(ex?.options) ? ex.options.map(o => String(o).trim()).filter(Boolean) : [],
      answer: typeof ex?.answer === 'string' ? ex.answer.trim() : ''
    }))
    .filter(ex => (ex.type === 'multiple-choice' || ex.type === 'fill-blank') && ex.question && ex.options.length >= 2 && ex.answer)
    .map(ex => ({
      ...ex,
      options: ex.options.slice(0, 4)
    }))

  const withInstruction = normalized.map(ex => ({
    ...ex,
    instruction: ex.instruction || (ex.type === 'fill-blank' ? 'Chọn đáp án đúng để điền vào chỗ trống (___).' : 'Chọn đáp án đúng.')
  }))

  const hasJapanese = (s) => /[\u3040-\u30FF\u4E00-\u9FAF]/.test(String(s || ''))
  const looksRomajiHeavy = (s) => {
    const str = String(s || '')
    const asciiLetters = (str.match(/[A-Za-z]/g) || []).length
    const japaneseLetters = (str.match(/[\u3040-\u30FF\u4E00-\u9FAF]/g) || []).length
    return asciiLetters > 0 && japaneseLetters === 0
  }

  const filtered = withInstruction.filter(ex => {
    if (!hasJapanese(ex.question)) return false
    if (looksRomajiHeavy(ex.question)) return false
    if (ex.options.some(o => looksRomajiHeavy(o))) return false
    if (looksRomajiHeavy(ex.answer)) return false
    return true
  })

  console.log('[Groq] getGrammarExercises parsed exercises:', {
    count: filtered.length,
    sample: filtered.slice(0, 2)
  })

  return filtered
}

export async function getFlashcardAssist(card) {
  if (!GROQ_API_KEY || GROQ_API_KEY === 'your_groq_api_key_here') {
    throw new Error('Vui lòng thêm GROQ API key vào file .env')
  }

  const kanji = card?.kanji || ''
  const reading = card?.reading || ''
  const meaningVi = card?.meaningVi || ''
  const type = card?.type || ''

  const isKanji = Boolean(
    (type && String(type).toLowerCase().includes('kanji')) ||
    (kanji && !reading) ||
    (kanji && kanji.length === 1)
  )

  const prompt = `Tạo dữ liệu hỗ trợ học cho flashcard (trả về DUY NHẤT JSON object hợp lệ, không markdown, không giải thích).

Flashcard:
- Từ/Kanji: ${kanji}
- Cách đọc (kana): ${reading}
- Nghĩa (VI): ${meaningVi}
- Loại: ${type}

Schema:
{"hintVi":"string","examples":[{"japanese":"string","vietnamese":"string"}],"radicals":[{"part":"string","nameVi":"string","meaningVi":"string"}]}

Ràng buộc bắt buộc:
- japanese trong examples KHÔNG được rỗng.
- KHÔNG dùng romaji/latin alphabet trong japanese.
- Nếu có kanji, kèm furigana dạng 漢字(かんじ).
- examples: đúng 2 câu.
- hintVi: 1-2 câu.
${isKanji ? '- radicals: tối đa 3 bộ/thành phần; part KHÔNG rỗng; nếu không chắc trả []' : '- radicals: []'}
`

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2048,
      top_p: 1
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Lỗi khi gọi Groq API')
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content || ''

  console.log('[Groq] getFlashcardAssist raw content preview:', String(content).slice(0, 800))

  const extracted = extractJson(content) || extractBalancedJson(content) || content
  const cleaned = cleanupJsonLike(extracted)
  const jsonText = cleanupJsonLike(repairJsonByBalancing(cleaned))
  console.log('[Groq] getFlashcardAssist extracted JSON preview:', String(jsonText).slice(0, 800))

  let parsed
  try {
    parsed = JSON.parse(jsonText)
  } catch (e) {
    // Second attempt: take substring from first '{' and repair
    const start = String(content || '').indexOf('{')
    const attempt2Raw = start !== -1 ? String(content || '').slice(start) : String(content || '')
    const attempt2 = cleanupJsonLike(repairJsonByBalancing(cleanupJsonLike(attempt2Raw)))
    try {
      parsed = JSON.parse(attempt2)
    } catch (e2) {
      const preview = String(content || '').slice(0, 400)
      const extractedPreview = String(jsonText || '').slice(0, 400)
      throw new Error(`Không parse được dữ liệu flashcard từ AI (JSON không hợp lệ). Preview: ${preview} | Extracted: ${extractedPreview}`)
    }
  }

  const hintViOut = typeof parsed?.hintVi === 'string' ? parsed.hintVi.trim() : ''
  const examplesOut = Array.isArray(parsed?.examples)
    ? parsed.examples
        .map(ex => ({
          japanese: typeof ex?.japanese === 'string' ? ex.japanese.trim() : '',
          vietnamese: typeof ex?.vietnamese === 'string' ? ex.vietnamese.trim() : ''
        }))
        .filter(ex => ex.japanese)
    : []

  const radicalsOut = Array.isArray(parsed?.radicals)
    ? parsed.radicals
        .map(r => ({
          part: typeof r?.part === 'string' ? r.part.trim() : '',
          nameVi: typeof r?.nameVi === 'string' ? r.nameVi.trim() : '',
          meaningVi: typeof r?.meaningVi === 'string' ? r.meaningVi.trim() : ''
        }))
        .filter(r => r.part)
    : []

  return {
    hintVi: hintViOut,
    examples: examplesOut.slice(0, 3),
    radicals: isKanji ? radicalsOut.slice(0, 6) : []
  }
}
