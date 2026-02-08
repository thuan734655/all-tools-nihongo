import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { sampleSpeaking } from '../data/sampleData'

function SpeakingPage() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [hasRecorded, setHasRecorded] = useState(false)
  const [score, setScore] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const mediaRecorderRef = useRef(null)

  const currentSentence = sampleSpeaking[currentIndex]
  const streak = 12
  const sentencesMastered = 45
  const avgAccuracy = 92

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        // In a real app, send this audio to speech-to-text API
        console.log('Audio recorded:', e.data)
      }
      
      mediaRecorderRef.current.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
        // Mock feedback for demo
        generateMockFeedback()
      }
      
      mediaRecorderRef.current.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Error accessing microphone:', err)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setHasRecorded(true)
    }
  }

  const generateMockFeedback = () => {
    // Mock feedback - in real app, this would come from AI/Speech API
    const mockScore = Math.floor(Math.random() * 20) + 80 // 80-100
    const chars = currentSentence.japanese.split('')
    const mockFeedback = chars.map((char, i) => ({
      char,
      correct: Math.random() > 0.15 // 85% correct rate
    }))
    
    setScore(mockScore)
    setFeedback(mockFeedback)
  }

  const nextSentence = () => {
    if (currentIndex < sampleSpeaking.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setCurrentIndex(0)
    }
    setHasRecorded(false)
    setScore(null)
    setFeedback(null)
  }

  const playNativeAudio = () => {
    // In real app, play TTS or pre-recorded audio
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(currentSentence.japanese)
      utterance.lang = 'ja-JP'
      speechSynthesis.speak(utterance)
    }
  }

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-[960px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
              Lesson {currentSentence.lesson}
            </span>
            <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">
              {currentSentence.category}
            </span>
          </div>
          <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-white">Speaking Practice</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Read the sentence aloud to improve your pronunciation.</p>
        </div>
        <Link to="/" className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-primary transition-colors text-sm font-medium">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Exit Practice
        </Link>
      </div>

      {/* Practice Card Container */}
      <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col md:flex-row mb-6">
        {/* Left: Prompt & Visuals */}
        <div className="flex-1 p-8 flex flex-col justify-between relative min-h-[400px]">
          {/* Background Pattern */}
          <div className="absolute top-0 right-0 w-full h-full opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#137fec 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          
          {/* Prompt Text */}
          <div className="z-10 flex flex-col gap-6 items-center text-center mt-4">
            <button 
              onClick={playNativeAudio}
              className="bg-background-light dark:bg-slate-800 px-4 py-2 rounded-lg inline-flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="material-symbols-outlined text-primary text-[18px]">volume_up</span>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Listen to native speaker</span>
            </button>
            
            <div className="space-y-2">
              <p className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white leading-tight japanese-text tracking-tight">
                {currentSentence.japanese}
              </p>
              <p className="text-lg text-primary font-medium opacity-80">{currentSentence.romaji}</p>
            </div>
            
            <div className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <p className="text-xl text-gray-500 dark:text-gray-400">{currentSentence.meaning}</p>
          </div>

          {/* Microphone Button */}
          <div className="z-10 flex flex-col items-center justify-center mt-12 mb-4">
            <div className="relative group">
              {/* Pulse Ring when recording */}
              {isRecording && (
                <div className="absolute -inset-4 bg-red-500/30 rounded-full animate-pulse-ring"></div>
              )}
              <button 
                onClick={isRecording ? stopRecording : startRecording}
                className={`relative flex items-center justify-center size-24 rounded-full text-white shadow-lg transition-all transform active:scale-95 cursor-pointer ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' 
                    : 'bg-primary hover:bg-primary-hover shadow-primary/30'
                }`}
              >
                <span className="material-symbols-outlined text-[40px]">
                  {isRecording ? 'stop' : 'mic'}
                </span>
              </button>
            </div>
            <p className="mt-6 text-gray-500 dark:text-gray-400 text-sm font-medium">
              {isRecording ? 'Click to stop recording' : 'Click to start recording'}
            </p>
          </div>
        </div>

        {/* Right: Feedback Panel */}
        <div className="w-full md:w-[380px] border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-900/50 p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">Feedback</h3>
            {score && (
              <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-2 py-1 rounded">
                COMPLETED
              </span>
            )}
          </div>

          {score ? (
            <>
              {/* Score Ring */}
              <div className="flex flex-col items-center justify-center py-2">
                <div className="relative size-32">
                  <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-200 dark:text-gray-700"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray="100, 100"
                      strokeWidth="3"
                    />
                    <path
                      className="text-primary"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray={`${score}, 100`}
                      strokeLinecap="round"
                      strokeWidth="3"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">{score}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">Score</span>
                  </div>
                </div>
                <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                  {score >= 90 ? 'Excellent!' : score >= 80 ? 'Great job! Almost perfect.' : 'Good effort! Keep practicing.'}
                </p>
              </div>

              {/* Pronunciation Breakdown */}
              {feedback && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Pronunciation Breakdown
                  </p>
                  <div className="bg-white dark:bg-surface-dark p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-wrap gap-2 justify-center">
                    {feedback.slice(0, 8).map((item, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <span className={`text-xl font-bold japanese-text ${
                          item.correct 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-500 dark:text-red-400'
                        }`}>
                          {item.char}
                        </span>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          item.correct ? 'bg-green-500' : 'bg-red-500'
                        }`}></span>
                      </div>
                    ))}
                    {feedback.length > 8 && (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xl font-bold text-green-600 dark:text-green-400">...</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    Tip: Pay attention to the pitch accent on words. Practice makes perfect!
                  </p>
                </div>
              )}

              {/* Comparison Controls */}
              <div className="mt-auto flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={playNativeAudio}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-slate-800 text-gray-900 dark:text-white text-sm font-medium transition-colors bg-white dark:bg-surface-dark"
                  >
                    <span className="material-symbols-outlined text-[20px] text-primary">play_circle</span>
                    Native
                  </button>
                  <button className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-slate-800 text-gray-900 dark:text-white text-sm font-medium transition-colors bg-white dark:bg-surface-dark">
                    <span className="material-symbols-outlined text-[20px] text-gray-500">graphic_eq</span>
                    Mine
                  </button>
                </div>
                <button 
                  onClick={nextSentence}
                  className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  Next Sentence
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
              <span className="material-symbols-outlined text-6xl mb-4">mic_none</span>
              <p className="text-sm">Record your voice to get feedback</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-4">
          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">trending_up</span>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Daily Streak</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{streak} Days</p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-4">
          <div className="size-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Sentences Mastered</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{sentencesMastered} / 100</p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-4">
          <div className="size-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <span className="material-symbols-outlined">psychology</span>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Accuracy</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{avgAccuracy}%</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SpeakingPage
