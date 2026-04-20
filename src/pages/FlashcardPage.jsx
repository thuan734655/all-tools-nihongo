import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useContentContext } from '../context/ContentContext'
import { getFlashcardAssist, getVocabularyTranslationExercise, getListeningReadingExercise } from '../services/groqService'
import { playOndokuTts } from '../services/ttsService'

// SRS intervals in days
const SRS_INTERVALS = {
  again: 0, // < 1 minute (reset)
  hard: 0.007, // 10 minutes
  good: 1, // 1 day
  easy: 4 // 4 days
}

function FlashcardPage() {
  const { vocabulary, grammar, loading: contentLoading, updateItem } = useContentContext()
  
  const [cards, setCards] = useState([])
  const [selectedCardIds, setSelectedCardIds] = useState(() => new Set())
  const [sessionStarted, setSessionStarted] = useState(false)
  const [showSelection, setShowSelection] = useState(false)
  const [studyMode, setStudyMode] = useState('flashcard') // 'flashcard' | 'translation' | 'listening-reading'
  const [selectionQuery, setSelectionQuery] = useState('')
  const [selectionCategory, setSelectionCategory] = useState('all')
  const [selectionLevel, setSelectionLevel] = useState('all')
  const [selectedGrammarIds, setSelectedGrammarIds] = useState(() => new Set())
  const [selectionError, setSelectionError] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [streak, setStreak] = useState(0)
  const [completed, setCompleted] = useState(0)

  // AI assist states
  const [assistLoading, setAssistLoading] = useState(false)
  const [assistError, setAssistError] = useState('')
  const [translationLoading, setTranslationLoading] = useState(false)
  const [translationError, setTranslationError] = useState('')
  const [listeningReadingLoading, setListeningReadingLoading] = useState(false)
  const [listeningReadingError, setListeningReadingError] = useState('')
  const [ttsLoading, setTtsLoading] = useState(false)
  const [ttsError, setTtsError] = useState('')
  
  // Review input states
  const [userMeaning, setUserMeaning] = useState('')
  const [userTranslation, setUserTranslation] = useState('')
  const [answerResult, setAnswerResult] = useState(null) // null, 'correct', 'incorrect'

  // Update cards when vocabulary data changes
  useEffect(() => {
    if (vocabulary.length > 0) {
      const mapped = vocabulary.map((v, idx) => ({
        ...v,
        _localId: v?.id ? undefined : `local-${idx}-${v?.kanji || ''}-${v?.reading || ''}`,
        srsLevel: v.srsLevel || 1,
        nextReview: v.nextReview || new Date()
      }))

      setCards(mapped)
    } else {
      setCards([])
      setSelectedCardIds(new Set())
      setSessionStarted(false)
    }
  }, [vocabulary])

  const cardId = (c) => c?.id || c?._localId
  const grammarId = (g, idx = 0) => g?.id || `grammar-local-${idx}-${g?.pattern || ''}`

  const mergeCardUpdates = useCallback((targetCard, updates) => {
    const targetId = cardId(targetCard)
    if (!targetId) return
    setCards((prev) =>
      prev.map((c) => (cardId(c) === targetId ? { ...c, ...updates } : c))
    )
  }, [])

  const normalizeCategory = (v) => String(v || '').trim().toLowerCase()

  const getItemCategory = (item) => {
    if (!item) return ''
    return item.category || item.topic || item.type || item.pos || ''
  }

  const isCategoryMatch = (itemCategory, filterCategory) => {
    const item = normalizeCategory(itemCategory)
    const filter = normalizeCategory(filterCategory)
    if (!filter || filter === 'all') return true
    if (item === filter) return true

    const adjectiveAliases = new Set(['adjective', 'tinh tu'])
    if (adjectiveAliases.has(filter)) {
      return adjectiveAliases.has(item)
    }

    return false
  }

  const categories = Array.from(
    new Set(
      cards
        .map(c => normalizeCategory(getItemCategory(c)))
        .filter((x) => Boolean(x) && x !== 'tinh tu')
    )
  )
    .map((norm) => {
      const found = cards.find(c => normalizeCategory(getItemCategory(c)) === norm)
      return String(getItemCategory(found) || norm).trim()
    })
    .sort((a, b) => a.localeCompare(b))

  const levels = Array.from(
    new Set(
      cards
        .map((c) => String(c?.level || '').trim().toUpperCase())
        .filter(Boolean)
    )
  ).sort((a, b) => {
    const order = ['N5', 'N4', 'N3', 'N2', 'N1']
    const ai = order.indexOf(a)
    const bi = order.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  useEffect(() => {
    console.log('[FlashcardPage] selectionCategory=', selectionCategory)
    console.log('[FlashcardPage] selectionLevel=', selectionLevel)
    console.log('[FlashcardPage] selectionQuery=', selectionQuery)
    console.log('[FlashcardPage] cards count=', cards?.length || 0)
    console.log('[FlashcardPage] cards all=', cards)
  }, [selectionCategory, selectionLevel, selectionQuery, cards])

  const selectionFilteredCards = cards
    .filter((c) => {
      const q = selectionQuery.trim().toLowerCase()
      if (!q) return true
      const hay = `${c.kanji || ''} ${c.reading || ''} ${c.meaningVi || ''} ${c.meaning || ''}`.toLowerCase()
      return hay.includes(q)
    })
    .filter((c) => {
      if (selectionCategory === 'all') return true
      return isCategoryMatch(getItemCategory(c), selectionCategory)
    })
    .filter((c) => {
      if (selectionLevel === 'all') return true
      return String(c?.level || '').trim().toUpperCase() === String(selectionLevel || '').trim().toUpperCase()
    })

  const selectionFilteredGrammar = grammar
    .filter((g) => {
      const q = selectionQuery.trim().toLowerCase()
      if (!q) return true
      const hay = `${g?.pattern || ''} ${g?.meaning || ''} ${g?.explanation || ''}`.toLowerCase()
      return hay.includes(q)
    })
    .filter((g) => {
      if (selectionLevel === 'all') return true
      return String(g?.level || '').trim().toUpperCase() === String(selectionLevel || '').trim().toUpperCase()
    })

  useEffect(() => {
    const dist = {}
    for (const c of cards) {
      const k = normalizeCategory(getItemCategory(c)) || '(empty)'
      dist[k] = (dist[k] || 0) + 1
    }
    console.log('[FlashcardPage] selectionFilteredCards count=', selectionFilteredCards.length)
    console.log('[FlashcardPage] selectionFilteredCards all=', selectionFilteredCards)
    console.log('[FlashcardPage] category distribution=', dist)
  }, [cards, selectionCategory, selectionLevel, selectionQuery, selectionFilteredCards.length])

  const studyCards = cards.filter(c => selectedCardIds.has(cardId(c)))
  const selectedGrammarItems = useMemo(
    () => grammar.filter((g, idx) => selectedGrammarIds.has(grammarId(g, idx))),
    [grammar, selectedGrammarIds]
  )
  const listeningReadingContextKey = useMemo(
    () => selectedGrammarItems.map((g, idx) => grammarId(g, idx)).sort().join('|'),
    [selectedGrammarItems]
  )
  const currentCard = studyCards[currentIndex]
  const currentTranslationExercise = currentCard?.aiTranslationExercise || null
  const currentListeningReadingExercise = currentCard?.aiListeningReadingExercise || null
  const currentSentenceExercise = studyMode === 'listening-reading'
    ? currentListeningReadingExercise
    : currentTranslationExercise
  const progress = studyCards.length > 0 ? ((currentIndex + 1) / studyCards.length) * 100 : 0

  const startSession = (mode = 'flashcard') => {
    if (mode === 'listening-reading' && selectedGrammarItems.length === 0) {
      const msg = 'Can chon it nhat 1 ngu phap de luyen nghe + doc.'
      setSelectionError(msg)
      setListeningReadingError(msg)
      return
    }
    setSelectionError('')
    setStudyMode(mode)
    setCurrentIndex(0)
    setIsFlipped(false)
    setShowAnswer(false)
    setUserMeaning('')
    setUserTranslation('')
    setAnswerResult(null)
    setSessionStarted(true)
  }

  useEffect(() => {
    if (selectedGrammarItems.length > 0) {
      setSelectionError('')
      setListeningReadingError('')
    }
  }, [selectedGrammarItems.length])

  useEffect(() => {
    if (studyCards.length === 0) {
      setCurrentIndex(0)
      return
    }
    if (currentIndex >= studyCards.length) {
      setCurrentIndex(0)
    }
  }, [studyCards.length, currentIndex])

  const hasCachedAssist = (card) => {
    if (!card) return false
    const hasHint = Boolean(card.aiHintVi)
    const hasExamples = Array.isArray(card.aiExamples) && card.aiExamples.length > 0
    const hasRadicals = Array.isArray(card.aiRadicals) && card.aiRadicals.length > 0
    return hasHint || hasExamples || hasRadicals
  }

  const hasCachedTranslationExercise = (card) => {
    if (!card) return false
    const ex = card.aiTranslationExercise
    return Boolean(ex && typeof ex === 'object' && ex.sentenceJa)
  }

  const hasCachedListeningReadingExercise = useCallback((card) => {
    if (!card) return false
    const ex = card.aiListeningReadingExercise
    if (!ex || typeof ex !== 'object' || !ex.sentenceJa) return false
    return String(ex.contextKey || '') === String(listeningReadingContextKey || '')
  }, [listeningReadingContextKey])

  const fetchAssistForCard = useCallback(async (card, forceRefresh = false) => {
    if (!card?.id) return

    setAssistError('')

    if (!forceRefresh && hasCachedAssist(card)) {
      return
    }

    setAssistLoading(true)
    try {
      const res = await getFlashcardAssist(card)

      const updates = {
        aiHintVi: res.hintVi || '',
        aiExamples: Array.isArray(res.examples) ? res.examples : [],
        aiRadicals: Array.isArray(res.radicals) ? res.radicals : [],
        aiAssistFetched: true,
        aiAssistUpdatedAt: Date.now()
      }

      await updateItem('vocabulary', card.id, { ...card, ...updates })
      mergeCardUpdates(card, updates)
    } catch (e) {
      setAssistError(e?.message || 'Da xay ra loi khi tai goi y tu AI')
    } finally {
      setAssistLoading(false)
    }
  }, [updateItem, mergeCardUpdates])

  const fetchTranslationExerciseForCard = useCallback(async (card, forceRefresh = false) => {
    if (!card) return

    setTranslationError('')

    if (!forceRefresh && hasCachedTranslationExercise(card)) {
      return
    }

    setTranslationLoading(true)
    try {
      const exercise = await getVocabularyTranslationExercise(card)
      const updates = {
        aiTranslationExercise: exercise,
        aiTranslationFetched: true,
        aiTranslationUpdatedAt: Date.now()
      }

      if (card?.id) {
        await updateItem('vocabulary', card.id, { ...card, ...updates })
      }
      mergeCardUpdates(card, updates)
    } catch (e) {
      setTranslationError(e?.message || 'Khong the tao bai tap dich cau tu AI')
    } finally {
      setTranslationLoading(false)
    }
  }, [updateItem, mergeCardUpdates])

  const fetchListeningReadingExerciseForCard = useCallback(async (card, forceRefresh = false) => {
    if (!card) return
    if (selectedGrammarItems.length === 0) {
      setListeningReadingError('Can chon it nhat 1 ngu phap de tao bai tap nghe + doc.')
      return
    }

    setListeningReadingError('')

    if (!forceRefresh && hasCachedListeningReadingExercise(card)) {
      return
    }

    setListeningReadingLoading(true)
    try {
      const exercise = await getListeningReadingExercise(card, selectedGrammarItems)
      const updates = {
        aiListeningReadingExercise: {
          ...exercise,
          contextKey: listeningReadingContextKey
        },
        aiListeningReadingFetched: true,
        aiListeningReadingUpdatedAt: Date.now()
      }

      if (card?.id) {
        await updateItem('vocabulary', card.id, { ...card, ...updates })
      }
      mergeCardUpdates(card, updates)
    } catch (e) {
      setListeningReadingError(e?.message || 'Khong the tao bai tap nghe + doc tu AI')
    } finally {
      setListeningReadingLoading(false)
    }
  }, [selectedGrammarItems, hasCachedListeningReadingExercise, listeningReadingContextKey, updateItem, mergeCardUpdates])

  const flipCard = useCallback(() => {
    setIsFlipped(!isFlipped)
    setShowAnswer(true)
  }, [isFlipped])

  useEffect(() => {
    if (!showAnswer) return
    if (!currentCard) return
    if (studyMode !== 'flashcard') return

    fetchAssistForCard(currentCard)
  }, [showAnswer, currentCard?.id, fetchAssistForCard, studyMode])

  useEffect(() => {
    if (studyMode !== 'translation') return
    if (!currentCard) return
    fetchTranslationExerciseForCard(currentCard)
  }, [studyMode, currentCard?.id, fetchTranslationExerciseForCard])

  useEffect(() => {
    if (studyMode !== 'listening-reading') return
    if (!currentCard) return
    fetchListeningReadingExerciseForCard(currentCard)
  }, [studyMode, currentCard?.id, fetchListeningReadingExerciseForCard])

  const gradeCard = (grade) => {
    // Update SRS level based on grade
    const updatedCards = [...cards]
    const card = updatedCards[currentIndex]
    
    switch (grade) {
      case 'again':
        card.srsLevel = 1
        break
      case 'hard':
        card.srsLevel = Math.max(1, card.srsLevel - 1)
        break
      case 'good':
        card.srsLevel = Math.min(8, card.srsLevel + 1)
        break
      case 'easy':
        card.srsLevel = Math.min(8, card.srsLevel + 2)
        break
    }
    
    setCards(updatedCards)
    setCompleted(completed + 1)
    nextCard()
  }

  const nextCard = () => {
    setIsFlipped(false)
    setShowAnswer(false)
    setUserMeaning('')
    setUserTranslation('')
    setAnswerResult(null)
    setAssistError('')
    setTranslationError('')
    setListeningReadingError('')
    setTtsError('')
    if (currentIndex < studyCards.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Session complete - cycle back
      setCurrentIndex(0)
    }
  }

  const handleSpeak = useCallback(async () => {
    if (!currentCard) return
    setTtsError('')
    setTtsLoading(true)

    try {
      const speakText = studyMode === 'flashcard'
        ? (currentCard.reading || currentCard.kanji || '')
        : (currentSentenceExercise?.sentenceJa || currentCard.reading || currentCard.kanji || '')
      const normalizedText = String(speakText || '')
        .replace(/([^\\s()]+)\\(([^)]+)\\)/g, '')
        .trim()
      if (!normalizedText) {
        throw new Error('Khong co noi dung de phat am')
      }

      await playOndokuTts(normalizedText)
    } catch (e) {
      setTtsError(e?.message || 'Khong phat duoc audio TTS')
    } finally {
      setTtsLoading(false)
    }
  }, [currentCard, currentSentenceExercise, studyMode])

  // Normalize text for comparison (remove spaces, lowercase, etc.)
  const normalizeText = (text) => {
    if (!text) return ''
    return text.toLowerCase().trim()
      .replace(/\s+/g, '') // Remove spaces
      .replace(/[.,!?ă€ă€‚ï¼ï¼Ÿ]/g, '') // Remove punctuation
  }

  // Check user answer
  const checkAnswer = () => {
    if (!currentCard) return

    const isSentenceMode = studyMode === 'translation' || studyMode === 'listening-reading'
    if (isSentenceMode) {
      if (!userTranslation.trim()) return
      setShowAnswer(true)
      setIsFlipped(true)
      return
    }

    if (!userMeaning.trim()) return

    const meaningTargets = [currentCard.meaningVi, currentCard.meaning].filter(Boolean).map(normalizeText)
    const meaningOk = userMeaning.trim()
      ? meaningTargets.some(t => normalizeText(userMeaning) === t || t.includes(normalizeText(userMeaning)))
      : false

    const isCorrect = meaningOk

    setAnswerResult(isCorrect ? 'correct' : 'incorrect')
    setShowAnswer(true)
    setIsFlipped(true)

    if (isCorrect) {
      setStreak(prev => prev + 1)
    } else {
      setStreak(0)
    }
  }

  // Handle Enter key for submitting answer
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !showAnswer) {
      e.preventDefault()
      if ((studyMode === 'flashcard' && userMeaning.trim()) || ((studyMode === 'translation' || studyMode === 'listening-reading') && userTranslation.trim())) {
        checkAnswer()
      }
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        if (!showAnswer) {
          flipCard()
        }
      } else if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        nextCard()
      } else if (showAnswer && studyMode === 'flashcard') {
        switch (e.key) {
          case '1':
            gradeCard('again')
            break
          case '2':
            gradeCard('hard')
            break
          case '3':
            gradeCard('good')
            break
          case '4':
            gradeCard('easy')
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showAnswer, flipCard, nextCard, studyMode])

  // Loading state
  if (contentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Dang tai tu vung...</p>
        </div>
      </div>
    )
  }

  // Empty state - no vocabulary
  if (cards.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-4">
        <div className="text-center max-w-md">
          <div className="size-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-5xl text-blue-500">style</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Chua co tu vung</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Ban chua them tu vung nao. Hay them tu vung de bat dau hoc!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link 
              to="/content" 
              className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">add</span>
              Them tu vung
            </Link>
            <Link 
              to="/" 
              className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Ve Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Empty selection state (have vocabulary but none selected)
  if (!sessionStarted || studyCards.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
        <header className="w-full px-6 py-4 flex items-center justify-center bg-white dark:bg-surface-dark shadow-sm">
          <div className="max-w-4xl w-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </Link>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide uppercase opacity-70">Vocab Deck</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Chon tu vung de bat dau</p>
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Da chon: <span className="font-bold">{selectedCardIds.size}</span> tu vung - <span className="font-bold">{selectedGrammarItems.length}</span> ngu phap
            </div>
          </div>
        </header>

        <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="w-full sm:max-w-sm space-y-2">
                <input
                  value={selectionQuery}
                  onChange={(e) => setSelectionQuery(e.target.value)}
                  placeholder="Tim tu vung..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
                <select
                  value={selectionCategory}
                  onChange={(e) => setSelectionCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                >
                  <option value="all">Tat ca chu de</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={selectionLevel}
                  onChange={(e) => setSelectionLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                >
                  <option value="all">Tat ca level</option>
                  {levels.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedCardIds(new Set(cards.map(c => cardId(c)).filter(Boolean)))}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Chon tat ca
                </button>
                <button
                  onClick={() => {
                    const ids = selectionFilteredCards.map((c) => cardId(c)).filter(Boolean)
                    setSelectedCardIds(new Set(ids))
                    startSession('flashcard')
                  }}
                  disabled={selectionFilteredCards.length === 0}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    selectionFilteredCards.length > 0
                      ? 'bg-primary hover:bg-primary-hover text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Hoc tat ca (dang loc)
                </button>
                <button
                  onClick={() => setSelectedCardIds(new Set())}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Bo chon
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-400">
              Dang hien thi: <span className="font-medium">{selectionFilteredCards.length}</span>/{cards.length}
            </div>

            <div className="max-h-[65vh] overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-700">
              {selectionFilteredCards.map((c, idx) => (
                  <label
                    key={c.id || `${idx}-${c.kanji || ''}-${c.reading || ''}`}
                    className="flex items-center gap-3 px-3 py-2 border-b border-slate-100 dark:border-slate-700 last:border-b-0 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCardIds.has(cardId(c))}
                      onChange={(e) => {
                        setSelectedCardIds(prev => {
                          const next = new Set(prev)
                          const id = cardId(c)
                          if (!id) return next
                          if (e.target.checked) next.add(id)
                          else next.delete(id)
                          return next
                        })
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold japanese-text truncate">{c.kanji}</span>
                        <span className="text-xs text-slate-400">{c.level}</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{c.reading} - {c.meaningVi || c.meaning}</div>
                      {c.category && (
                        <div className="mt-1">
                          <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px]">
                            {c.category}
                          </span>
                        </div>
                      )}
                    </div>
                  </label>
                ))}
            </div>

            <div className="rounded-xl border border-slate-100 dark:border-slate-700 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Chon ngu phap cho bai nghe + doc</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedGrammarIds(new Set(selectionFilteredGrammar.map((g, idx) => grammarId(g, idx))))}
                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300"
                  >
                    Chon tat ca
                  </button>
                  <button
                    onClick={() => setSelectedGrammarIds(new Set())}
                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300"
                  >
                    Bo chon
                  </button>
                </div>
              </div>

              <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-700">
                {selectionFilteredGrammar.length === 0 && (
                  <p className="text-xs text-slate-500 p-3">Khong co ngu phap phu hop bo loc.</p>
                )}
                {selectionFilteredGrammar.map((g, idx) => {
                  const id = grammarId(g, idx)
                  return (
                    <label
                      key={id}
                      className="flex items-center gap-3 px-3 py-2 border-b border-slate-100 dark:border-slate-700 last:border-b-0 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedGrammarIds.has(id)}
                        onChange={(e) => {
                          setSelectedGrammarIds((prev) => {
                            const next = new Set(prev)
                            if (e.target.checked) next.add(id)
                            else next.delete(id)
                            return next
                          })
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-100 truncate">{g.pattern}</span>
                          <span className="text-xs text-slate-400">{g.level || 'N?'}</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{g.meaning || g.explanation || ''}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {selectionError && (
              <p className="text-sm text-red-600 dark:text-red-400">{selectionError}</p>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <div className="text-sm text-slate-500 dark:text-slate-400">Chon it nhat 1 tu de bat dau.</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => startSession('flashcard')}
                  disabled={selectedCardIds.size === 0}
                  className={`px-4 py-2.5 rounded-xl font-bold transition-colors ${
                    selectedCardIds.size > 0
                      ? 'bg-primary hover:bg-primary-hover text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Flashcard thuong
                </button>
                <button
                  onClick={() => startSession('translation')}
                  disabled={selectedCardIds.size === 0}
                  className={`px-4 py-2.5 rounded-xl font-bold transition-colors ${
                    selectedCardIds.size > 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Dich cau bang AI
                </button>
                <button
                  onClick={() => startSession('listening-reading')}
                  disabled={selectedCardIds.size === 0 || selectedGrammarItems.length === 0}
                  className={`px-4 py-2.5 rounded-xl font-bold transition-colors ${
                    selectedCardIds.size > 0 && selectedGrammarItems.length > 0
                      ? 'bg-teal-600 hover:bg-teal-700 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Nghe + doc AI
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-center bg-white dark:bg-surface-dark shadow-sm">
        <div className="max-w-4xl w-full flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </Link>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-[11px] font-bold uppercase tracking-wider">
                    {currentCard?.level || 'N5'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold uppercase tracking-wider">
                    {currentCard?.type || 'Noun'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {studyMode === 'translation'
                    ? 'Luyen dich cau bang AI'
                    : studyMode === 'listening-reading'
                      ? 'Luyen nghe + doc bang AI'
                      : 'Daily Review'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                <span className="material-symbols-outlined text-orange-500 text-[18px]">local_fire_department</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{streak} Day Streak</span>
              </div>
              <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors">
                <span className="material-symbols-outlined">settings</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setShowSelection(s => !s)}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Chon du lieu ({studyCards.length} tu - {selectedGrammarItems.length} ngu phap)
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => startSession('flashcard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  studyMode === 'flashcard'
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Flashcard
              </button>
              <button
                onClick={() => startSession('translation')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  studyMode === 'translation'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Dich cau AI
              </button>
              <button
                onClick={() => startSession('listening-reading')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  studyMode === 'listening-reading'
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Nghe + doc AI
              </button>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Dung lien tiep: <span className="font-bold">{streak}</span>
              </div>
            </div>
          </div>

          {showSelection && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark p-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="w-full sm:max-w-sm space-y-2">
                  <input
                    value={selectionQuery}
                    onChange={(e) => setSelectionQuery(e.target.value)}
                    placeholder="Tim tu vung..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  />
                  <select
                    value={selectionCategory}
                    onChange={(e) => setSelectionCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="all">Tat ca chu de</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    value={selectionLevel}
                    onChange={(e) => setSelectionLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="all">Tat ca level</option>
                    {levels.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedCardIds(new Set(cards.map(c => cardId(c)).filter(Boolean)))}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Chon tat ca
                  </button>
                  <button
                    onClick={() => {
                      const ids = selectionFilteredCards.map((c) => cardId(c)).filter(Boolean)
                      setSelectedCardIds(new Set(ids))
                      setCurrentIndex(0)
                    }}
                    disabled={selectionFilteredCards.length === 0}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      selectionFilteredCards.length > 0
                        ? 'bg-primary hover:bg-primary-hover text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Chon theo bo loc
                  </button>
                  <button
                    onClick={() => setSelectedCardIds(new Set())}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Bo chon
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-400">
                Dang hien thi: <span className="font-medium">{selectionFilteredCards.length}</span>/{cards.length}
              </div>

              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-700">
                {selectionFilteredCards.map((c, idx) => (
                    <label
                      key={c.id || `${idx}-${c.kanji || ''}-${c.reading || ''}`}
                      className="flex items-center gap-3 px-3 py-2 border-b border-slate-100 dark:border-slate-700 last:border-b-0 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCardIds.has(cardId(c))}
                        onChange={(e) => {
                          setSelectedCardIds(prev => {
                            const next = new Set(prev)
                            const id = cardId(c)
                            if (!id) return next
                            if (e.target.checked) next.add(id)
                            else next.delete(id)
                            return next
                          })
                          setCurrentIndex(0)
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold japanese-text truncate">{c.kanji}</span>
                          <span className="text-xs text-slate-400">{c.level}</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{c.reading} - {c.meaningVi || c.meaning}</div>
                        {c.category && (
                          <div className="mt-1">
                            <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px]">
                              {c.category}
                            </span>
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
              </div>

              <div className="rounded-xl border border-slate-100 dark:border-slate-700 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Ngu phap cho mode Nghe + doc AI</p>
                  <span className="text-xs text-slate-500">Da chon: {selectedGrammarItems.length}</span>
                </div>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-700">
                  {selectionFilteredGrammar.map((g, idx) => {
                    const id = grammarId(g, idx)
                    return (
                      <label
                        key={id}
                        className="flex items-center gap-3 px-3 py-2 border-b border-slate-100 dark:border-slate-700 last:border-b-0 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGrammarIds.has(id)}
                          onChange={(e) => {
                            setSelectedGrammarIds((prev) => {
                              const next = new Set(prev)
                              if (e.target.checked) next.add(id)
                              else next.delete(id)
                              return next
                            })
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-100 truncate">{g.pattern}</span>
                            <span className="text-xs text-slate-400">{g.level || 'N?'}</span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{g.meaning || g.explanation || ''}</div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="flex items-center gap-4 w-full">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-10">
              {currentIndex + 1}/{studyCards.length}
            </span>
            <div className="h-2 flex-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                style={{ width: `${studyCards.length > 0 ? ((currentIndex + 1) / studyCards.length) * 100 : 0}%` }}
              ></div>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-10 text-right">
              {Math.round(studyCards.length > 0 ? ((currentIndex + 1) / studyCards.length) * 100 : 0)}%
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 w-full max-w-4xl mx-auto pb-48 pt-4 overflow-y-auto">
        {/* Flashcard */}
        <div 
          className={`flip-card w-full max-w-2xl ${isFlipped ? 'flipped' : ''}`}
        >
          <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl dark:shadow-black/20 overflow-hidden flex flex-col min-h-[400px] border border-slate-100 dark:border-slate-700/50">
            {/* Card Front */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 relative">
              <div className="text-center group">
                <div className="text-[5rem] sm:text-[8rem] md:text-[10rem] leading-none font-bold text-slate-900 dark:text-white japanese-text mb-2 transition-transform duration-300 group-hover:scale-105">
                  {currentCard.kanji}
                </div>
                
                {(studyMode === 'translation' || studyMode === 'listening-reading') && (
                  <div className="mt-4 w-full max-w-xl mx-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 text-left">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      {studyMode === 'listening-reading' ? 'Bai nghe + doc' : 'Cau tieng Nhat can dich'}
                    </p>
                    {((studyMode === 'translation' ? translationLoading : listeningReadingLoading) && !currentSentenceExercise?.sentenceJa) ? (
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        Dang tao bai tap tu AI...
                      </div>
                    ) : (
                      <>
                        <p className="text-xl sm:text-2xl text-slate-900 dark:text-white japanese-text font-semibold">
                          {currentSentenceExercise?.sentenceJa || 'Chua co cau bai tap. Bam "Tao moi".'}
                        </p>
                        {studyMode === 'listening-reading' && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              onClick={handleSpeak}
                              disabled={ttsLoading}
                              className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors disabled:opacity-60"
                            >
                              {ttsLoading ? 'Dang phat audio...' : 'Nghe audio'}
                            </button>
                            {currentSentenceExercise?.listeningQuestionVi && (
                              <span className="text-xs text-slate-500">{currentSentenceExercise.listeningQuestionVi}</span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    {(studyMode === 'translation' ? translationError : listeningReadingError) && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                        {studyMode === 'translation' ? translationError : listeningReadingError}
                      </p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => {
                          if (studyMode === 'translation') fetchTranslationExerciseForCard(currentCard, true)
                          else fetchListeningReadingExerciseForCard(currentCard, true)
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                      >
                        Tao moi
                      </button>
                    </div>
                  </div>
                )}

                {/* Review Input Fields */}
                {!showAnswer && studyMode === 'flashcard' && (
                  <div className="mt-6 w-full max-w-md mx-auto space-y-3">
                    <input
                      type="text"
                      value={userMeaning}
                      onChange={(e) => setUserMeaning(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Nhap nghia (tieng Viet)..."
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-center text-base sm:text-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-400"
                      autoFocus
                    />
                    <p className="text-xs text-slate-400">Nhan Enter de kiem tra</p>
                  </div>
                )}

                {!showAnswer && (studyMode === 'translation' || studyMode === 'listening-reading') && (
                  <div className="mt-6 w-full max-w-md mx-auto space-y-3">
                    <textarea
                      value={userTranslation}
                      onChange={(e) => setUserTranslation(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Nhap ban dich tieng Viet cua cau tren..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-base sm:text-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-400 resize-none"
                      autoFocus
                    />
                    <p className="text-xs text-slate-400">Nhan Enter de nop bai va xem giai thich</p>
                  </div>
                )}
                
                {/* Answer Result Badge */}
                {studyMode === 'flashcard' && answerResult && (
                  <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm ${
                    answerResult === 'correct' 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  }`}>
                    <span className="material-symbols-outlined text-lg">
                      {answerResult === 'correct' ? 'check_circle' : 'cancel'}
                    </span>
                    {answerResult === 'correct' ? 'Dung roi!' : 'Sai roi!'}
                  </div>
                )}
                
                {!showAnswer && (
                  <p className="text-slate-400 dark:text-slate-500 text-sm font-medium tracking-[0.2em] uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {(studyMode === 'translation' || studyMode === 'listening-reading') ? 'Nhap ban dich de on tap' : 'Nhap dap an de on tap'}
                  </p>
                )}
              </div>
            </div>

            {/* Card Back - Revealed Content */}
            {showAnswer && (
              <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-[#18212c]/50 p-6 sm:p-8 space-y-6 animate-fade-in">
                {/* Meaning & Reading */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="text-xl sm:text-2xl font-bold text-primary japanese-text">{currentCard.reading}</span>
                      <span className="text-slate-400 text-sm">({currentCard.romaji})</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">{currentCard.meaning}</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 italic">{currentCard.meaningVi}</p>
                  </div>
                  <button
                    onClick={handleSpeak}
                    disabled={ttsLoading}
                    className={`flex items-center justify-center size-12 rounded-full text-primary transition-colors shrink-0 ${
                      ttsLoading
                        ? 'bg-primary/20 cursor-not-allowed'
                        : 'bg-primary/10 hover:bg-primary/20'
                    }`}
                    title={ttsLoading ? 'Dang phat am...' : 'Nghe phat am'}
                  >
                    <span className="material-symbols-outlined text-[28px]">
                      {ttsLoading ? 'hourglass_top' : 'volume_up'}
                    </span>
                  </button>
                </div>
                {ttsError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{ttsError}</p>
                )}

                {(studyMode === 'translation' || studyMode === 'listening-reading') && (
                  <div className="bg-white dark:bg-surface-dark border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-4 space-y-4">
                    {studyMode === 'listening-reading' && currentSentenceExercise?.sentenceJa && (
                      <div>
                        <p className="text-xs uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400 mb-1">Cau da nghe/doc</p>
                        <p className="text-slate-800 dark:text-slate-100 japanese-text font-semibold">{currentSentenceExercise.sentenceJa}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400 mb-1">Bai lam cua ban</p>
                      <p className="text-slate-700 dark:text-slate-300 text-sm">{userTranslation || '(Ban chua nhap cau tra loi)'}</p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400 mb-1">Dap an mau</p>
                      <p className="text-slate-800 dark:text-slate-100 font-medium">{currentSentenceExercise?.translationVi || 'Chua co dap an AI.'}</p>
                      {currentSentenceExercise?.translationEn && (
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{currentSentenceExercise.translationEn}</p>
                      )}
                    </div>

                    {Array.isArray(currentSentenceExercise?.vocabularyBreakdown) && currentSentenceExercise.vocabularyBreakdown.length > 0 && (
                      <div>
                        <p className="text-xs uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400 mb-2">Giai thich tu vung</p>
                        <div className="space-y-2">
                          {currentSentenceExercise.vocabularyBreakdown.map((item, idx) => (
                            <div key={idx} className="rounded-lg bg-emerald-50/70 dark:bg-emerald-900/10 p-3">
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {item.word} {item.reading ? `(${item.reading})` : ''}
                              </p>
                              {item.meaningVi && <p className="text-sm text-slate-600 dark:text-slate-300">{item.meaningVi}</p>}
                              {item.noteVi && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.noteVi}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {Array.isArray(currentSentenceExercise?.grammarPoints) && currentSentenceExercise.grammarPoints.length > 0 && (
                      <div>
                        <p className="text-xs uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400 mb-2">Giai thich ngu phap</p>
                        <div className="space-y-2">
                          {currentSentenceExercise.grammarPoints.map((g, idx) => (
                            <div key={idx} className="rounded-lg bg-slate-100 dark:bg-slate-800/70 p-3">
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{g.pattern}</p>
                              {g.explanationVi && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{g.explanationVi}</p>}
                              {g.roleInSentence && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{g.roleInSentence}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentSentenceExercise?.usageTipsVi && (
                      <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 p-3">
                        <p className="text-xs uppercase tracking-wider font-bold text-yellow-700 dark:text-yellow-400 mb-1">Meo su dung</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{currentSentenceExercise.usageTipsVi}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* AI Hint */}
                {studyMode === 'flashcard' && (assistLoading || assistError || currentCard.aiHintVi) && (
                  <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                    <div className="flex gap-4 items-start">
                      <div className="mt-1 text-slate-300 dark:text-slate-600">
                        <span className="material-symbols-outlined text-[20px]">lightbulb</span>
                      </div>
                      <div className="flex-1">
                        {assistLoading && !currentCard.aiHintVi && (
                          <div className="flex items-center gap-3 text-slate-500">
                            <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            Dang tai goi y tu AI...
                          </div>
                        )}
                        {assistError && (
                          <p className="text-red-600 dark:text-red-400 text-sm">{assistError}</p>
                        )}
                        {currentCard.aiHintVi && (
                          <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{currentCard.aiHintVi}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Example Sentence */}
                {studyMode === 'flashcard' && ((Array.isArray(currentCard.aiExamples) && currentCard.aiExamples.length > 0) ? (
                  <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                    <div className="flex gap-4 items-start">
                      <div className="mt-1 text-slate-300 dark:text-slate-600">
                        <span className="material-symbols-outlined text-[20px]">format_quote</span>
                      </div>
                      <div className="flex-1 space-y-3">
                        {currentCard.aiExamples.map((ex, idx) => (
                          <div key={idx}>
                            <p className="text-base sm:text-lg text-slate-800 dark:text-slate-200 japanese-text font-medium mb-1">
                              {ex.japanese}
                            </p>
                            {ex.vietnamese && (
                              <p className="text-slate-500 dark:text-slate-400 text-sm">{ex.vietnamese}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                    <div className="flex gap-4 items-start">
                      <div className="mt-1 text-slate-300 dark:text-slate-600">
                        <span className="material-symbols-outlined text-[20px]">format_quote</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-base sm:text-lg text-slate-800 dark:text-slate-200 japanese-text font-medium mb-1">
                          {currentCard.example}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">{currentCard.exampleMeaning}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Kanji radicals/components (AI) */}
                {studyMode === 'flashcard' && Array.isArray(currentCard.aiRadicals) && currentCard.aiRadicals.length > 0 && (
                  <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                    <div className="flex gap-4 items-start">
                      <div className="mt-1 text-slate-300 dark:text-slate-600">
                        <span className="material-symbols-outlined text-[20px]">account_tree</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-2">Bo thu / Thanh phan</p>
                        <div className="space-y-2">
                          {currentCard.aiRadicals.map((r, idx) => (
                            <div key={idx} className="flex items-start justify-between gap-3">
                              <div className="text-lg japanese-text text-slate-800 dark:text-slate-200">{r.part}</div>
                              <div className="flex-1">
                                <p className="text-sm text-slate-700 dark:text-slate-300">{r.nameVi}</p>
                                {r.meaningVi && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400">{r.meaningVi}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Context */}
                {studyMode === 'flashcard' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/50">
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-1">Components</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 japanese-text">{currentCard.components}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/50">
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-1">Stroke Count</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{currentCard.strokes} strokes</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Controls */}
      <footer className="fixed bottom-0 left-0 w-full bg-white dark:bg-surface-dark border-t border-slate-100 dark:border-slate-800 p-3 sm:p-4 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl mx-auto">
          {!showAnswer ? (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
                <button 
                  onClick={checkAnswer}
                  disabled={(studyMode === 'translation' || studyMode === 'listening-reading') ? !userTranslation.trim() : !userMeaning.trim()}
                  className={`h-11 text-base font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                    ((studyMode === 'translation' || studyMode === 'listening-reading') ? userTranslation.trim() : userMeaning.trim())
                      ? `${(studyMode === 'translation' || studyMode === 'listening-reading') ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30' : 'bg-primary hover:bg-primary-hover shadow-blue-500/30'} text-white`
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span className="material-symbols-outlined">check</span>
                  <span>{(studyMode === 'translation' || studyMode === 'listening-reading') ? 'Nop bai' : 'Kiem tra'}</span>
                </button>
                <button 
                  onClick={flipCard}
                  className="h-11 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-100 text-base font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>Dap an</span>
                  <span className="bg-black/10 dark:bg-white/10 text-xs px-2 py-0.5 rounded font-medium">Space</span>
                </button>
                <button
                  onClick={nextCard}
                  className="h-11 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-100 text-base font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">skip_next</span>
                  <span>Next</span>
                </button>
              </div>
              <div className="text-xs text-slate-400">
                Next: <span className="font-medium">N</span> / <span className="font-medium">{'->'}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex justify-center">
                <button
                  onClick={nextCard}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-100 text-sm font-bold transition-all active:scale-95 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">skip_next</span>
                  Next
                </button>
              </div>
              <div className="text-xs text-slate-400">
                Next: <span className="font-medium">N</span> / <span className="font-medium">{'->'}</span>
              </div>
            </div>
          )}
        </div>
      </footer>
    </div>
  )
}

export default FlashcardPage




