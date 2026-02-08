import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useContentContext } from '../context/ContentContext'
import { streamGrammarExplanation, getGrammarExercises } from '../services/groqService'

function GrammarPage() {
  const { grammar: customGrammar, exercises: customExercises, loading: contentLoading, updateItem } = useContentContext()
  
  // Add custom exercises to grammar patterns
  const grammarWithExercises = customGrammar.map(g => ({
    ...g,
    exercises: g.exercises || customExercises.filter(e => e.category === 'grammar' && e.level === g.level).slice(0, 3) || []
  }))

  const [selectedLesson, setSelectedLesson] = useState(null)
  const [currentExercise, setCurrentExercise] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  
  // LLM Detail states
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailContent, setDetailContent] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  // AI Exercise states
  const [exerciseLoading, setExerciseLoading] = useState(false)
  const [exerciseError, setExerciseError] = useState('')

  const parseAiDetail = (raw) => {
    if (!raw || typeof raw !== 'string') {
      return { meaningUsage: '', examples: [] }
    }

    const normalized = raw.replace(/\r\n/g, '\n')

    const exampleHeaderIndex = (() => {
      const idx1 = normalized.search(/^\s*3\./m)
      const idx2 = normalized.search(/\*\*\s*Ví dụ\s*\*\*/i)
      if (idx1 === -1) return idx2
      if (idx2 === -1) return idx1
      return Math.min(idx1, idx2)
    })()

    const meaningUsage = (exampleHeaderIndex === -1 ? normalized : normalized.slice(0, exampleHeaderIndex)).trim()
    const examplesPart = (exampleHeaderIndex === -1 ? '' : normalized.slice(exampleHeaderIndex)).trim()

    const examples = []
    const lines = examplesPart.split('\n')
    let current = null

    const flush = () => {
      if (current && (current.japanese || current.viet || current.romaji)) {
        examples.push(current)
      }
      current = null
    }

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line) continue

      const jpMatch = line.match(/^(?:[-*]\s*)?(?:日本語\s*[:：])\s*(.+)$/i)
      const viMatch = line.match(/^(?:[-*]\s*)?(?:Việt|Viet)\s*[:：]\s*(.+)$/i)
      const roMatch = line.match(/^(?:[-*]\s*)?(?:Romaji)\s*[:：]\s*(.+)$/i)

      if (jpMatch) {
        flush()
        current = { japanese: jpMatch[1].trim(), viet: '', romaji: '' }
        continue
      }

      if (viMatch) {
        if (!current) current = { japanese: '', viet: '', romaji: '' }
        current.viet = viMatch[1].trim()
        continue
      }

      if (roMatch) {
        if (!current) current = { japanese: '', viet: '', romaji: '' }
        current.romaji = roMatch[1].trim()
        continue
      }

      // If AI returns Japanese sentence lines without prefixes, attach to current or create one
      if (!current) current = { japanese: '', viet: '', romaji: '' }
      if (!current.japanese && /[\u3040-\u30FF\u4E00-\u9FAF]/.test(line)) {
        current.japanese = line
      }
    }

    flush()

    return { meaningUsage, examples }
  }

  const renderFurigana = (text) => {
    if (!text || typeof text !== 'string') return text

    const regex = /([\u4E00-\u9FAF\u3400-\u4DBF々]+)\(([\u3040-\u309Fー]+)\)/g
    const nodes = []
    let lastIndex = 0
    let match
    let key = 0

    while ((match = regex.exec(text)) !== null) {
      const [full, kanji, kana] = match
      const start = match.index

      if (start > lastIndex) {
        nodes.push(<span key={`t-${key++}`}>{text.slice(lastIndex, start)}</span>)
      }

      nodes.push(
        <ruby key={`r-${key++}`} className="japanese-text">
          {kanji}
          <rt className="text-[0.6em] leading-none">{kana}</rt>
        </ruby>
      )

      lastIndex = start + full.length
    }

    if (lastIndex < text.length) {
      nodes.push(<span key={`t-${key++}`}>{text.slice(lastIndex)}</span>)
    }

    return <>{nodes}</>
  }

  // Set initial lesson when data loads
  useEffect(() => {
    if (grammarWithExercises.length > 0 && !selectedLesson) {
      setSelectedLesson(grammarWithExercises[0])
    }
  }, [customGrammar])

  // Auto-show cached AI detail when it already exists in DB/local cache
  useEffect(() => {
    if (!selectedLesson) return

    if (selectedLesson.aiExplanation) {
      setShowDetailModal(true)
      setDetailError('')
      setDetailLoading(false)
      setDetailContent(selectedLesson.aiExplanation)
    } else {
      setShowDetailModal(false)
      setDetailContent('')
      setDetailError('')
      setDetailLoading(false)
    }
  }, [selectedLesson?.id, selectedLesson?.aiExplanation])

  const handleAnswerSelect = (answer) => {
    setSelectedAnswer(answer)
  }

  const checkAnswer = () => {
    const exercise = activeExercises[currentExercise]
    if (!exercise) return
    const correct = selectedAnswer === (exercise.answer || '')
    setIsCorrect(correct)
    setShowResult(true)
  }

  const nextExercise = () => {
    if (currentExercise < activeExercises.length - 1) {
      setCurrentExercise(currentExercise + 1)
      setSelectedAnswer('')
      setShowResult(false)
    } else {
      // Completed all exercises
      setCurrentExercise(0)
      setSelectedAnswer('')
      setShowResult(false)
    }
  }

  const fetchGrammarExercises = async (grammarItem, forceRefresh = false) => {
    setExerciseError('')

    if (!grammarItem) return

    // Use cached exercises if available (unless forcing refresh)
    if (!forceRefresh && Array.isArray(grammarItem.aiExercises) && grammarItem.aiExercises.length > 0) {
      setSelectedLesson(prev => prev ? { ...prev, aiExercises: grammarItem.aiExercises } : prev)
      setCurrentExercise(0)
      setSelectedAnswer('')
      setShowResult(false)
      return
    }

    setExerciseLoading(true)
    try {
      const exercises = await getGrammarExercises(grammarItem.pattern)

      if (exercises.length === 0) {
        throw new Error('AI không trả về bài tập hợp lệ.')
      }

      if (grammarItem.id) {
        await updateItem('grammar', grammarItem.id, {
          ...grammarItem,
          aiExercises: exercises,
          aiExercisesFetched: true,
          aiExercisesUpdatedAt: Date.now()
        })
      }

      setSelectedLesson(prev => prev ? { ...prev, aiExercises: exercises, aiExercisesFetched: true, aiExercisesUpdatedAt: Date.now() } : prev)
      setCurrentExercise(0)
      setSelectedAnswer('')
      setShowResult(false)
    } catch (error) {
      setExerciseError(error.message || 'Đã xảy ra lỗi khi tạo bài tập')
    } finally {
      setExerciseLoading(false)
    }
  }

  // Fetch grammar detail from LLM or cache
  const fetchGrammarDetail = async (grammarItem, forceRefresh = false) => {
    setShowDetailModal(true)
    setDetailError('')

    // Check if already cached in DB (unless forcing refresh)
    if (!forceRefresh && grammarItem?.aiExplanation) {
      setDetailContent(grammarItem.aiExplanation)
      setDetailLoading(false)
      return
    }

    // Call LLM API
    setDetailContent('')
    setDetailLoading(true)

    try {
      let finalContent = ''
      await streamGrammarExplanation(grammarItem?.pattern, (chunk, fullContent) => {
        setDetailContent(fullContent)
        finalContent = fullContent
      })

      // Save to database after successful fetch
      if (finalContent && grammarItem?.id) {
        await updateItem('grammar', grammarItem.id, {
          ...grammarItem,
          aiExplanation: finalContent,
          aiExplanationFetched: true,
          aiExplanationUpdatedAt: Date.now()
        })
        
        // Update selectedLesson to reflect the cached data
        setSelectedLesson(prev => prev ? { ...prev, aiExplanation: finalContent, aiExplanationFetched: true, aiExplanationUpdatedAt: Date.now() } : prev)
      }
    } catch (error) {
      setDetailError(error.message || 'Đã xảy ra lỗi khi tải chi tiết')
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetailModal = () => {
    setShowDetailModal(false)
    setDetailContent('')
    setDetailError('')
  }

  const aiDetail = parseAiDetail(detailContent)

  const activeExercises = (Array.isArray(selectedLesson?.aiExercises) && selectedLesson.aiExercises.length > 0)
    ? selectedLesson.aiExercises
    : (selectedLesson?.exercises || [])

  useEffect(() => {
    if (!Array.isArray(activeExercises) || activeExercises.length === 0) return
    if (currentExercise >= activeExercises.length) {
      setCurrentExercise(0)
      setSelectedAnswer('')
      setShowResult(false)
    }
  }, [activeExercises.length, currentExercise])

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
              Grammar
            </span>
            {selectedLesson && (
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium px-2 py-1 rounded">
                {selectedLesson.level}
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Grammar Lessons</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Learn grammar patterns with explanations and exercises</p>
        </div>
        <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="hidden sm:inline">Back to Dashboard</span>
        </Link>
      </div>

      {contentLoading ? (
        <div className="text-center py-12">
          <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Đang tải ngữ pháp...</p>
        </div>
      ) : grammarWithExercises.length === 0 ? (
        <div className="text-center py-12">
          <div className="size-24 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-5xl text-purple-500">menu_book</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Chưa có ngữ pháp</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Bạn chưa thêm mẫu ngữ pháp nào. Hãy thêm ngữ pháp để bắt đầu học!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link 
              to="/content" 
              className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">add</span>
              Thêm ngữ pháp
            </Link>
            <Link 
              to="/" 
              className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Về Dashboard
            </Link>
          </div>
        </div>
      ) : !selectedLesson ? (
        <div className="text-center py-12">
          <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Đang tải...</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lesson List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Grammar Patterns</h3>
          {grammarWithExercises.map((lesson) => (
            <button
              key={lesson.id}
              onClick={() => {
                setSelectedLesson(lesson)
                setCurrentExercise(0)
                setSelectedAnswer('')
                setShowResult(false)
              }}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selectedLesson.id === lesson.id
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-white dark:bg-surface-dark border-gray-200 dark:border-gray-700 hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold japanese-text">{lesson.pattern}</span>
                <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">{lesson.level}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{lesson.meaning}</p>
            </button>
          ))}
        </div>

        {/* Lesson Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pattern Card */}
          <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white japanese-text mb-2">
                  {selectedLesson.pattern}
                </h2>
                <p className="text-lg text-primary font-medium">{selectedLesson.romaji}</p>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{selectedLesson.meaning}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button 
                  onClick={() => showDetailModal ? closeDetailModal() : fetchGrammarDetail(selectedLesson)}
                  className="flex items-center gap-1 px-3 py-2 rounded-full bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 transition-colors font-medium text-sm"
                  title="Xem chi tiết từ AI"
                >
                  <span className="material-symbols-outlined text-lg">auto_awesome</span>
                  {showDetailModal ? 'Ẩn' : 'Chi tiết'}
                </button>
                {showDetailModal && (
                  <button
                    onClick={() => fetchGrammarDetail(selectedLesson, true)}
                    disabled={detailLoading}
                    className="flex items-center justify-center size-10 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors disabled:opacity-50"
                    title="Tải lại từ AI"
                  >
                    <span className="material-symbols-outlined text-[22px]">refresh</span>
                  </button>
                )}
                <button
                  onClick={() => fetchGrammarExercises(selectedLesson)}
                  disabled={exerciseLoading}
                  className="flex items-center gap-1 px-3 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 transition-colors font-medium text-sm disabled:opacity-50"
                  title="Tạo bài tập luyện tập từ AI"
                >
                  <span className="material-symbols-outlined text-lg">edit_square</span>
                  Luyện tập
                </button>
                {Array.isArray(selectedLesson?.aiExercises) && selectedLesson.aiExercises.length > 0 && (
                  <button
                    onClick={() => fetchGrammarExercises(selectedLesson, true)}
                    disabled={exerciseLoading}
                    className="flex items-center justify-center size-10 rounded-full bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 transition-colors disabled:opacity-50"
                    title="Tải lại bài tập ngữ pháp từ AI"
                  >
                    <span className="material-symbols-outlined text-[22px]">refresh</span>
                  </button>
                )}
                <button className="flex items-center justify-center size-12 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors">
                  <span className="material-symbols-outlined text-[28px]">volume_up</span>
                </button>
              </div>
            </div>

            {/* Explanation */}
            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-0.5">lightbulb</span>
                <div className="flex-1">
                  {showDetailModal && detailLoading && !detailContent && (
                    <div className="flex items-center gap-3 text-gray-500">
                      <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      Đang tải từ AI...
                    </div>
                  )}

                  {showDetailModal && detailError && (
                    <div className="text-red-600 dark:text-red-400 leading-relaxed">
                      <span className="material-symbols-outlined text-sm mr-1">error</span>
                      {detailError}
                    </div>
                  )}

                  {showDetailModal && (aiDetail.meaningUsage || detailContent) ? (
                    <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
                      {aiDetail.meaningUsage || detailContent}
                      {detailLoading && (
                        <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1"></span>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {selectedLesson.explanation}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Examples */}
            <div className="space-y-4">
              <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">format_quote</span>
                Examples
              </h4>
              {showDetailModal && aiDetail.examples.length > 0 ? (
                aiDetail.examples.map((ex, index) => (
                  <div
                    key={index}
                    className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4"
                  >
                    {ex.japanese && (
                      <p className="text-xl text-gray-900 dark:text-white japanese-text mb-1">
                        {renderFurigana(ex.japanese)}
                      </p>
                    )}
                    {ex.romaji && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{ex.romaji}</p>
                    )}
                    {ex.viet && (
                      <p className="text-gray-600 dark:text-gray-400">{ex.viet}</p>
                    )}
                  </div>
                ))
              ) : (
                selectedLesson.examples.map((example, index) => (
                  <div 
                    key={index}
                    className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4"
                  >
                    <p className="text-xl text-gray-900 dark:text-white japanese-text mb-1">
                      {renderFurigana(example.japanese)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{example.romaji}</p>
                    <p className="text-gray-600 dark:text-gray-400">{example.meaning}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Exercise Card */}
          {activeExercises.length > 0 && (
            <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-500">quiz</span>
                  Practice Exercise
                </h3>
                <span className="text-sm text-gray-500">
                  {currentExercise + 1} / {activeExercises.length}
                </span>
              </div>

              {exerciseError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl mb-4">
                  <span className="material-symbols-outlined text-sm mr-1">error</span>
                  {exerciseError}
                </div>
              )}

              {exerciseLoading && (
                <div className="flex items-center gap-3 text-gray-500 mb-4">
                  <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  Đang tạo bài tập từ AI...
                </div>
              )}

              {(() => {
                const exercise = activeExercises[currentExercise]
                const instructionText = exercise?.instruction || (exercise?.type === 'fill-blank' ? 'Chọn đáp án đúng để điền vào chỗ trống (___).' : 'Chọn đáp án đúng.')
                
                if (exercise.type === 'fill-blank') {
                  return (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{instructionText}</p>
                      <p className="text-2xl text-gray-900 dark:text-white japanese-text mb-6 text-center">
                        {exercise.question.split('___').map((part, i) => (
                          <span key={i}>
                            {renderFurigana(part)}
                            {i < exercise.question.split('___').length - 1 && (
                              <span className={`inline-block min-w-[3rem] mx-1 px-3 py-1 rounded-lg border-2 border-dashed ${
                                showResult
                                  ? isCorrect
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600'
                                    : 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600'
                                  : selectedAnswer
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-gray-300 dark:border-gray-600'
                              }`}>
                                {selectedAnswer || '___'}
                              </span>
                            )}
                          </span>
                        ))}
                      </p>

                      <div className="grid grid-cols-2 gap-3 mb-6">
                        {exercise.options.map((option) => (
                          <button
                            key={option}
                            onClick={() => !showResult && handleAnswerSelect(option)}
                            disabled={showResult}
                            className={`p-4 rounded-xl border-2 text-lg japanese-text transition-all ${
                              showResult
                                ? option === exercise.answer
                                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600'
                                  : selectedAnswer === option
                                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600'
                                    : 'border-gray-200 dark:border-gray-700 text-gray-400'
                                : selectedAnswer === option
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-primary/50 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {renderFurigana(option)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                } else {
                  // Multiple choice
                  return (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{instructionText}</p>
                      <p className="text-lg text-gray-900 dark:text-white mb-6 japanese-text">{renderFurigana(exercise.question)}</p>
                      <div className="space-y-3 mb-6">
                        {exercise.options.map((option) => (
                          <button
                            key={option}
                            onClick={() => !showResult && handleAnswerSelect(option)}
                            disabled={showResult}
                            className={`w-full text-left p-4 rounded-xl border-2 japanese-text transition-all ${
                              showResult
                                ? option === exercise.answer
                                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600'
                                  : selectedAnswer === option
                                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600'
                                    : 'border-gray-200 dark:border-gray-700 text-gray-400'
                                : selectedAnswer === option
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-primary/50 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {renderFurigana(option)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                }
              })()}

              {/* Result Message */}
              {showResult && (
                <div className={`p-4 rounded-xl mb-4 ${
                  isCorrect 
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined">
                      {isCorrect ? 'check_circle' : 'cancel'}
                    </span>
                    <span className="font-medium">
                      {isCorrect ? 'Correct! Great job!' : `Incorrect. The answer is: ${(activeExercises[currentExercise]?.answer || '')}`}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="flex justify-end">
                {!showResult ? (
                  <button
                    onClick={checkAnswer}
                    disabled={!selectedAnswer}
                    className={`px-6 py-3 rounded-xl font-bold transition-all ${
                      selectedAnswer
                        ? 'bg-primary hover:bg-primary-hover text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Check Answer
                  </button>
                ) : (
                  <button
                    onClick={nextExercise}
                    className="px-6 py-3 rounded-xl font-bold bg-primary hover:bg-primary-hover text-white flex items-center gap-2"
                  >
                    {currentExercise < activeExercises.length - 1 ? 'Next Exercise' : 'Complete'}
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}

export default GrammarPage
