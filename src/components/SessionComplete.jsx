import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

// Confetti animation component
function Confetti() {
  const colors = ['#137fec', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 8 + 4,
    duration: Math.random() * 1 + 2
  }))

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-40">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            top: '-20px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti-fall {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  )
}

function SessionComplete({ 
  type = 'flashcard', // flashcard, grammar, speaking, kanji, reading
  stats = {},
  onContinue,
  onClose
}) {
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  const messages = {
    flashcard: {
      title: 'Session Complete! 🎉',
      subtitle: 'Great job reviewing your vocabulary!'
    },
    grammar: {
      title: 'Lesson Complete! 📚',
      subtitle: 'You\'ve mastered this grammar pattern!'
    },
    speaking: {
      title: 'Speaking Practice Done! 🎤',
      subtitle: 'Your pronunciation is improving!'
    },
    kanji: {
      title: 'Kanji Practice Complete! ✍️',
      subtitle: 'Keep practicing those strokes!'
    },
    reading: {
      title: 'Reading Complete! 📖',
      subtitle: 'Excellent comprehension!'
    }
  }

  const { title, subtitle } = messages[type] || messages.flashcard

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {showConfetti && <Confetti />}
      
      <div className="bg-white dark:bg-surface-dark rounded-2xl max-w-md w-full p-8 relative animate-fade-in shadow-2xl">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Trophy Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="size-24 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-5xl text-yellow-500">emoji_events</span>
            </div>
            <div className="absolute -top-1 -right-1 size-8 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg">
              <span className="material-symbols-outlined text-lg">check</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
          {title}
        </h2>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-6">
          {subtitle}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {stats.reviewed !== undefined && (
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.reviewed}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Reviewed</div>
            </div>
          )}
          {stats.correct !== undefined && (
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.correct}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Correct</div>
            </div>
          )}
          {stats.accuracy !== undefined && (
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <div className="text-2xl font-bold text-primary">{stats.accuracy}%</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Accuracy</div>
            </div>
          )}
          {stats.streak && (
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
              <div className="text-2xl font-bold text-orange-500">{stats.streak}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Day Streak</div>
            </div>
          )}
          {stats.xp !== undefined && (
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">+{stats.xp}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">XP Earned</div>
            </div>
          )}
          {stats.newWords !== undefined && (
            <div className="text-center p-3 bg-pink-50 dark:bg-pink-900/20 rounded-xl">
              <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">{stats.newWords}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">New Words</div>
            </div>
          )}
        </div>

        {/* Streak Banner */}
        {stats.streak && (
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 mb-6 text-white text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="material-symbols-outlined">local_fire_department</span>
              <span className="font-bold">{stats.streak} Day Streak!</span>
            </div>
            <p className="text-sm opacity-80">Keep it up! Study tomorrow to continue.</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Link 
            to="/"
            className="flex-1 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Dashboard
          </Link>
          <button 
            onClick={onContinue}
            className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold flex items-center justify-center gap-2 transition-colors"
          >
            Continue
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default SessionComplete
