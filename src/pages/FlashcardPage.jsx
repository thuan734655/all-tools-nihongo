import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useContentContext } from '../context/ContentContext'
import { getFlashcardAssist } from '../services/groqService'

// SRS intervals in days
const SRS_INTERVALS = {
  again: 0, // < 1 minute (reset)
  hard: 0.007, // 10 minutes
  good: 1, // 1 day
  easy: 4 // 4 days
}

function FlashcardPage() {
  const { vocabulary, loading: contentLoading, updateItem } = useContentContext()
  
  const [cards, setCards] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [streak, setStreak] = useState(0)
  const [completed, setCompleted] = useState(0)

  // AI assist states
  const [assistLoading, setAssistLoading] = useState(false)
  const [assistError, setAssistError] = useState('')
  
  // Answer input states
  const [userAnswer, setUserAnswer] = useState('')
  const [answerResult, setAnswerResult] = useState(null) // null, 'correct', 'incorrect'
  const [showInputMode, setShowInputMode] = useState(true) // Toggle between input mode and flip mode

  // Update cards when vocabulary data changes
  useEffect(() => {
    if (vocabulary.length > 0) {
      setCards(vocabulary.map(v => ({
        ...v,
        srsLevel: v.srsLevel || 1,
        nextReview: v.nextReview || new Date()
      })))
    } else {
      setCards([])
    }
  }, [vocabulary])

  const currentCard = cards[currentIndex]
  const progress = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0

  const hasCachedAssist = (card) => {
    if (!card) return false
    const hasHint = Boolean(card.aiHintVi)
    const hasExamples = Array.isArray(card.aiExamples) && card.aiExamples.length > 0
    const hasRadicals = Array.isArray(card.aiRadicals) && card.aiRadicals.length > 0
    return hasHint || hasExamples || hasRadicals
  }

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

      // Update local cards immediately (avoid waiting for context propagation)
      setCards(prev => prev.map(c => c.id === card.id ? { ...c, ...updates } : c))
    } catch (e) {
      setAssistError(e?.message || 'Đã xảy ra lỗi khi tải gợi ý từ AI')
    } finally {
      setAssistLoading(false)
    }
  }, [updateItem])

  const flipCard = useCallback(() => {
    setIsFlipped(!isFlipped)
    setShowAnswer(true)
  }, [isFlipped])

  useEffect(() => {
    if (!showAnswer) return
    if (!currentCard) return

    fetchAssistForCard(currentCard)
  }, [showAnswer, currentCard?.id, fetchAssistForCard])

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
    setUserAnswer('')
    setAnswerResult(null)
    setAssistError('')
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Session complete - cycle back
      setCurrentIndex(0)
    }
  }

  // Normalize text for comparison (remove spaces, lowercase, etc.)
  const normalizeText = (text) => {
    if (!text) return ''
    return text.toLowerCase().trim()
      .replace(/\s+/g, '') // Remove spaces
      .replace(/[.,!?、。！？]/g, '') // Remove punctuation
  }

  // Check user answer
  const checkAnswer = () => {
    if (!userAnswer.trim()) return
    
    const card = currentCard
    const normalizedUserAnswer = normalizeText(userAnswer)
    
    // Check against multiple possible correct answers
    const correctAnswers = [
      card.reading,      // Hiragana reading
      card.romaji,       // Romaji
      card.meaning,      // English meaning
      card.meaningVi,    // Vietnamese meaning
      card.kanji         // Kanji itself
    ].filter(Boolean).map(normalizeText)
    
    const isCorrect = correctAnswers.some(answer => 
      answer === normalizedUserAnswer || 
      answer.includes(normalizedUserAnswer) ||
      normalizedUserAnswer.includes(answer)
    )
    
    setAnswerResult(isCorrect ? 'correct' : 'incorrect')
    setShowAnswer(true)
    setIsFlipped(true)
    
    // Update streak for correct answers
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
      if (userAnswer.trim()) {
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
      } else if (showAnswer) {
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
  }, [showAnswer, flipCard])

  // Loading state
  if (contentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Đang tải từ vựng...</p>
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Chưa có từ vựng</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Bạn chưa thêm từ vựng nào. Hãy thêm từ vựng để bắt đầu học!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link 
              to="/content" 
              className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">add</span>
              Thêm từ vựng
            </Link>
            <Link 
              to="/" 
              className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Về Dashboard
            </Link>
          </div>
        </div>
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
                <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide uppercase opacity-70">
                  {currentCard.level} Vocab Deck
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Daily Review</p>
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

          {/* Progress Bar */}
          <div className="flex items-center gap-4 w-full">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-10">
              {currentIndex + 1}/{cards.length}
            </span>
            <div className="h-2 flex-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-10 text-right">
              {Math.round(progress)}%
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
              {/* Tags */}
              <div className="absolute top-6 left-6 flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider">
                  {currentCard.level}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">
                  {currentCard.type}
                </span>
              </div>

              <div className="text-center group">
                <div className="text-[8rem] sm:text-[10rem] leading-none font-bold text-slate-900 dark:text-white japanese-text mb-2 transition-transform duration-300 group-hover:scale-105">
                  {currentCard.kanji}
                </div>
                
                {/* Answer Input Field */}
                {!showAnswer && showInputMode && (
                  <div className="mt-6 max-w-md mx-auto">
                    <input
                      type="text"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Nhập hiragana hoặc nghĩa tiếng Việt..."
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-center text-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-400"
                      autoFocus
                    />
                    <p className="text-xs text-slate-400 mt-2">Nhấn Enter để kiểm tra</p>
                  </div>
                )}
                
                {/* Answer Result Badge */}
                {answerResult && (
                  <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm ${
                    answerResult === 'correct' 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  }`}>
                    <span className="material-symbols-outlined text-lg">
                      {answerResult === 'correct' ? 'check_circle' : 'cancel'}
                    </span>
                    {answerResult === 'correct' ? 'Đúng rồi!' : `Sai rồi! Câu trả lời: ${currentCard.reading}`}
                  </div>
                )}
                
                {!showAnswer && !showInputMode && (
                  <p className="text-slate-400 dark:text-slate-500 text-sm font-medium tracking-[0.2em] uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Click to flip
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
                      <span className="text-2xl font-bold text-primary japanese-text">{currentCard.reading}</span>
                      <span className="text-slate-400 text-sm">({currentCard.romaji})</span>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{currentCard.meaning}</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 italic">{currentCard.meaningVi}</p>
                  </div>
                  <button className="flex items-center justify-center size-12 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors shrink-0">
                    <span className="material-symbols-outlined text-[28px]">volume_up</span>
                  </button>
                </div>

                {/* AI Hint */}
                {(assistLoading || assistError || currentCard.aiHintVi) && (
                  <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                    <div className="flex gap-4 items-start">
                      <div className="mt-1 text-slate-300 dark:text-slate-600">
                        <span className="material-symbols-outlined text-[20px]">lightbulb</span>
                      </div>
                      <div className="flex-1">
                        {assistLoading && !currentCard.aiHintVi && (
                          <div className="flex items-center gap-3 text-slate-500">
                            <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            Đang tải gợi ý từ AI...
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
                {(Array.isArray(currentCard.aiExamples) && currentCard.aiExamples.length > 0) ? (
                  <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                    <div className="flex gap-4 items-start">
                      <div className="mt-1 text-slate-300 dark:text-slate-600">
                        <span className="material-symbols-outlined text-[20px]">format_quote</span>
                      </div>
                      <div className="flex-1 space-y-3">
                        {currentCard.aiExamples.map((ex, idx) => (
                          <div key={idx}>
                            <p className="text-lg text-slate-800 dark:text-slate-200 japanese-text font-medium mb-1">
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
                        <p className="text-lg text-slate-800 dark:text-slate-200 japanese-text font-medium mb-1">
                          {currentCard.example}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">{currentCard.exampleMeaning}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Kanji radicals/components (AI) */}
                {Array.isArray(currentCard.aiRadicals) && currentCard.aiRadicals.length > 0 && (
                  <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                    <div className="flex gap-4 items-start">
                      <div className="mt-1 text-slate-300 dark:text-slate-600">
                        <span className="material-symbols-outlined text-[20px]">account_tree</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-2">Bộ thủ / Thành phần</p>
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
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Controls */}
      <footer className="fixed bottom-0 left-0 w-full bg-white dark:bg-surface-dark border-t border-slate-100 dark:border-slate-800 p-3 sm:p-4 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl mx-auto">
          {!showAnswer ? (
            /* Input Mode or Show Answer Button */
            <div className="flex flex-col items-center gap-4 w-full">
              {/* Toggle Mode Button */}
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => setShowInputMode(!showInputMode)}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    showInputMode 
                      ? 'bg-primary text-white' 
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Nhập câu trả lời
                </button>
                <button
                  onClick={() => setShowInputMode(!showInputMode)}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    !showInputMode 
                      ? 'bg-primary text-white' 
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Lật thẻ
                </button>
              </div>
              
              {showInputMode ? (
                <button 
                  onClick={checkAnswer}
                  disabled={!userAnswer.trim()}
                  className={`w-full max-w-sm h-14 text-lg font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                    userAnswer.trim()
                      ? 'bg-primary hover:bg-primary-hover text-white shadow-blue-500/30'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span className="material-symbols-outlined">check</span>
                  <span>Kiểm tra đáp án</span>
                  <span className="bg-white/20 text-xs px-2 py-0.5 rounded font-medium">Enter</span>
                </button>
              ) : (
                <button 
                  onClick={flipCard}
                  className="w-full max-w-sm h-14 bg-primary hover:bg-primary-hover text-white text-lg font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>Hiển đáp án</span>
                  <span className="bg-white/20 text-xs px-2 py-0.5 rounded text-white font-medium">Space</span>
                </button>
              )}
            </div>
          ) : (
            /* Grading Buttons */
            <>
              <div className="grid grid-cols-4 gap-3 sm:gap-4">
                <button 
                  onClick={() => gradeCard('again')}
                  className="flex flex-col items-center justify-center h-16 sm:h-20 rounded-xl bg-red-50 dark:bg-red-900/10 border-2 border-transparent hover:border-red-200 dark:hover:border-red-800 group transition-all active:scale-95"
                >
                  <span className="text-xs font-semibold text-red-400 dark:text-red-400 mb-1">{'< 1m'}</span>
                  <span className="text-base sm:text-lg font-bold text-red-600 dark:text-red-500">Again</span>
                </button>

                <button 
                  onClick={() => gradeCard('hard')}
                  className="flex flex-col items-center justify-center h-16 sm:h-20 rounded-xl bg-orange-50 dark:bg-orange-900/10 border-2 border-transparent hover:border-orange-200 dark:hover:border-orange-800 group transition-all active:scale-95"
                >
                  <span className="text-xs font-semibold text-orange-400 dark:text-orange-400 mb-1">10m</span>
                  <span className="text-base sm:text-lg font-bold text-orange-600 dark:text-orange-500">Hard</span>
                </button>

                <button 
                  onClick={() => gradeCard('good')}
                  className="flex flex-col items-center justify-center h-16 sm:h-20 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border-2 border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 group transition-all active:scale-95"
                >
                  <span className="text-xs font-semibold text-emerald-400 dark:text-emerald-400 mb-1">1d</span>
                  <span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-500">Good</span>
                </button>

                <button 
                  onClick={() => gradeCard('easy')}
                  className="flex flex-col items-center justify-center h-16 sm:h-20 rounded-xl bg-blue-50 dark:bg-blue-900/10 border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-800 group transition-all active:scale-95"
                >
                  <span className="text-xs font-semibold text-blue-400 dark:text-blue-400 mb-1">4d</span>
                  <span className="text-base sm:text-lg font-bold text-primary dark:text-blue-400">Easy</span>
                </button>
              </div>

              {/* Shortcuts Legend */}
              <div className="mt-4 flex justify-center gap-6 opacity-40 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600">Space</span>
                  <span>Flip Card</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600">1-4</span>
                  <span>Grade</span>
                </div>
              </div>
            </>
          )}
        </div>
      </footer>
    </div>
  )
}

export default FlashcardPage
