import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useContentContext } from '../context/ContentContext'

function KanjiPage() {
  const { kanji: kanjiList, vocabulary, loading: contentLoading } = useContentContext()
  
  // Use kanji from database, or fallback to vocabulary kanji if no dedicated kanji
  const availableKanji = kanjiList.length > 0 
    ? kanjiList 
    : vocabulary.filter(v => v.kanji && v.kanji.length > 0).map(v => ({
        id: v.id,
        kanji: v.kanji,
        reading: v.reading || '',
        meaning: v.meaning || v.meaningVi || '',
        level: v.level || 'N5',
        strokes: v.strokes || 1
      }))

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDrawing, setIsDrawing] = useState(false)
  const [strokes, setStrokes] = useState([])
  const [currentStroke, setCurrentStroke] = useState([])
  const [showAnswer, setShowAnswer] = useState(false)
  const [score, setScore] = useState(null)
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)

  const currentKanji = availableKanji[currentIndex] || null
  const progress = availableKanji.length > 0 ? ((currentIndex + 1) / availableKanji.length) * 100 : 0

  // Initialize canvas - only once on mount
  useEffect(() => {
    const initCanvas = () => {
      const canvas = canvasRef.current
      if (canvas && !ctxRef.current) {
        // Set canvas size based on container
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width || 300
        canvas.height = rect.height || 300
        
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.lineWidth = 8
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.strokeStyle = '#111418'
          ctxRef.current = ctx
        }
      }
    }
    
    // Initialize after a small delay to ensure DOM is ready
    const timer = setTimeout(initCanvas, 100)
    
    return () => {
      clearTimeout(timer)
    }
  }, [])
  
  // Handle resize separately - reinitialize canvas dimensions
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      if (canvas && ctxRef.current) {
        const rect = canvas.getBoundingClientRect()
        // Only update if size changed significantly
        if (Math.abs(canvas.width - rect.width) > 10) {
          canvas.width = rect.width || 300
          canvas.height = rect.height || 300
          // Re-apply context settings after resize
          ctxRef.current.lineWidth = 8
          ctxRef.current.lineCap = 'round'
          ctxRef.current.lineJoin = 'round'
          ctxRef.current.strokeStyle = '#111418'
        }
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const getCoordinates = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    if (e.touches && e.touches[0]) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const startDrawing = (e) => {
    e.preventDefault()
    if (!ctxRef.current) return
    
    const coords = getCoordinates(e)
    setIsDrawing(true)
    setCurrentStroke([coords])
    ctxRef.current.beginPath()
    ctxRef.current.moveTo(coords.x, coords.y)
  }

  const draw = (e) => {
    if (!isDrawing || !ctxRef.current) return
    e.preventDefault()
    const coords = getCoordinates(e)
    setCurrentStroke(prev => [...prev, coords])
    ctxRef.current.lineTo(coords.x, coords.y)
    ctxRef.current.stroke()
  }

  const stopDrawing = (e) => {
    if (!isDrawing) return
    e.preventDefault()
    setIsDrawing(false)
    if (currentStroke.length > 0) {
      setStrokes(prev => [...prev, currentStroke])
    }
    setCurrentStroke([])
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    setStrokes([])
    setScore(null)
    setShowAnswer(false)
  }

  const checkDrawing = () => {
    // Mock scoring based on stroke count
    const targetStrokes = currentKanji?.strokes || 1
    const userStrokes = strokes.length
    
    let mockScore
    if (userStrokes === targetStrokes) {
      mockScore = Math.floor(Math.random() * 15) + 85 // 85-100
    } else if (Math.abs(userStrokes - targetStrokes) <= 2) {
      mockScore = Math.floor(Math.random() * 20) + 65 // 65-85
    } else {
      mockScore = Math.floor(Math.random() * 30) + 35 // 35-65
    }
    
    setScore(mockScore)
    setShowAnswer(true)
  }

  const nextKanji = () => {
    if (currentIndex < availableKanji.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setCurrentIndex(0)
    }
    clearCanvas()
  }

  // Loading state
  if (contentLoading) {
    return (
      <div className="p-4 md:p-8 lg:p-10 max-w-4xl mx-auto">
        <div className="text-center py-20">
          <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Đang tải dữ liệu Kanji...</p>
        </div>
      </div>
    )
  }

  // Empty state
  if (availableKanji.length === 0) {
    return (
      <div className="p-4 md:p-8 lg:p-10 max-w-4xl mx-auto">
        <div className="text-center py-20">
          <div className="size-24 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-5xl text-pink-500">edit</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Chưa có Kanji</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Bạn chưa thêm Kanji nào. Hãy thêm từ vựng có Kanji hoặc thêm Kanji trực tiếp để luyện viết!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link 
              to="/content" 
              className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">add</span>
              Thêm nội dung
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
    <div className="p-4 md:p-8 lg:p-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
              Luyện viết Kanji
            </span>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium px-2 py-1 rounded">
              {currentKanji?.level || 'N5'}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            Luyện viết chữ Kanji
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Vẽ Kanji theo đúng thứ tự nét
          </p>
        </div>
        <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="hidden sm:inline">Thoát</span>
        </Link>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-sm font-semibold text-slate-500">
          {currentIndex + 1}/{availableKanji.length}
        </span>
        <div className="h-2 flex-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <span className="text-sm font-semibold text-slate-500">
          {Math.round(progress)}%
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Kanji Reference */}
        <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white">Mẫu tham khảo</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded font-bold">
                {currentKanji?.level || 'N5'}
              </span>
            </div>
          </div>

          {/* Kanji Display */}
          <div className="text-center mb-6">
            <div className={`text-[10rem] leading-none font-bold japanese-text ${showAnswer ? 'text-gray-900 dark:text-white' : 'text-gray-200 dark:text-gray-800'} transition-colors duration-300`}>
              {currentKanji?.kanji}
            </div>
          </div>

          {/* Info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <span className="text-sm text-gray-500">Cách đọc</span>
              <span className="font-bold text-gray-900 dark:text-white japanese-text">{currentKanji?.reading || '-'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <span className="text-sm text-gray-500">Nghĩa</span>
              <span className="font-bold text-gray-900 dark:text-white">{currentKanji?.meaning || '-'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <span className="text-sm text-gray-500">Số nét</span>
              <span className="font-bold text-gray-900 dark:text-white">{currentKanji?.strokes || '-'}</span>
            </div>
          </div>
        </div>

        {/* Right: Drawing Canvas */}
        <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white">Bản vẽ của bạn</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                Nét: {strokes.length}/{currentKanji?.strokes || 1}
              </span>
              <button 
                onClick={clearCanvas}
                className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative bg-slate-50 dark:bg-slate-800/50 rounded-xl overflow-hidden min-h-[300px]">
            {/* Grid lines */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-200 dark:bg-gray-700 opacity-50"></div>
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700 opacity-50"></div>
            </div>
            
            <canvas
              ref={canvasRef}
              className="kanji-canvas w-full h-full"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>

          {/* Score Display */}
          {score !== null && (
            <div className={`mt-4 p-4 rounded-xl text-center ${
              score >= 80 
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                : score >= 60
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
            }`}>
              <div className="text-4xl font-bold mb-1">{score}%</div>
              <p className="text-sm">
                {score >= 80 ? 'Xuất sắc!' : score >= 60 ? 'Tốt lắm!' : 'Cố gắng thêm nhé!'}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex gap-3">
            {!showAnswer ? (
              <>
                <button 
                  onClick={() => setShowAnswer(true)}
                  className="flex-1 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:border-primary hover:text-primary transition-colors"
                >
                  Hiện đáp án
                </button>
                <button 
                  onClick={checkDrawing}
                  disabled={strokes.length === 0}
                  className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
                    strokes.length > 0
                      ? 'bg-primary hover:bg-primary-hover text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Kiểm tra
                </button>
              </>
            ) : (
              <button 
                onClick={nextKanji}
                className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold flex items-center justify-center gap-2 transition-colors"
              >
                Kanji tiếp theo
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="mt-6 flex justify-center gap-6 opacity-40 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600">C</span>
          <span>Xóa</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600">Space</span>
          <span>Kiểm tra</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600">→</span>
          <span>Tiếp theo</span>
        </div>
      </div>
    </div>
  )
}

export default KanjiPage
