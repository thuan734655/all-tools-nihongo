import { useState, useEffect } from 'react'

function StreakBadge({ streak, size = 'default' }) {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (streak > 0) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [streak])

  const sizeClasses = {
    small: 'px-2 py-1 text-xs gap-1',
    default: 'px-3 py-1.5 text-sm gap-2',
    large: 'px-4 py-2 text-base gap-2'
  }

  const iconSizes = {
    small: 'text-[14px]',
    default: 'text-[18px]',
    large: 'text-[22px]'
  }

  return (
    <div 
      className={`flex items-center ${sizeClasses[size]} rounded-full bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 ${isAnimating ? 'animate-pulse' : ''}`}
    >
      <span className={`material-symbols-outlined ${iconSizes[size]} text-orange-500 ${isAnimating ? 'animate-bounce' : ''}`}>
        local_fire_department
      </span>
      <span className="font-bold text-orange-600 dark:text-orange-400">
        {streak}
      </span>
    </div>
  )
}

function XPBadge({ xp, size = 'default' }) {
  const sizeClasses = {
    small: 'px-2 py-1 text-xs gap-1',
    default: 'px-3 py-1.5 text-sm gap-2',
    large: 'px-4 py-2 text-base gap-2'
  }

  return (
    <div className={`flex items-center ${sizeClasses[size]} rounded-full bg-purple-100 dark:bg-purple-900/30`}>
      <span className="material-symbols-outlined text-purple-500 text-[16px]">star</span>
      <span className="font-bold text-purple-600 dark:text-purple-400">{xp} XP</span>
    </div>
  )
}

function LevelBadge({ level, size = 'default' }) {
  const levelColors = {
    'N5': 'from-green-400 to-emerald-500',
    'N4': 'from-blue-400 to-cyan-500',
    'N3': 'from-purple-400 to-violet-500',
    'N2': 'from-orange-400 to-amber-500',
    'N1': 'from-red-400 to-rose-500'
  }

  const sizeClasses = {
    small: 'px-2 py-1 text-[10px]',
    default: 'px-2.5 py-1 text-xs',
    large: 'px-3 py-1.5 text-sm'
  }

  const gradient = levelColors[level] || levelColors['N5']

  return (
    <span className={`${sizeClasses[size]} bg-gradient-to-r ${gradient} text-white font-bold rounded-md shadow-sm`}>
      {level}
    </span>
  )
}

function AchievementBadge({ icon, title, unlocked = false }) {
  return (
    <div className={`flex flex-col items-center p-3 rounded-xl border-2 ${
      unlocked 
        ? 'border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' 
        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-50'
    }`}>
      <div className={`size-12 rounded-full flex items-center justify-center mb-2 ${
        unlocked 
          ? 'bg-yellow-100 dark:bg-yellow-800/50 text-yellow-600 dark:text-yellow-400' 
          : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
      }`}>
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      </div>
      <span className={`text-xs font-medium text-center ${
        unlocked ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'
      }`}>
        {title}
      </span>
      {unlocked && (
        <span className="material-symbols-outlined text-yellow-500 text-sm mt-1">check_circle</span>
      )}
    </div>
  )
}

function ProgressRing({ progress, size = 80, strokeWidth = 8, color = '#137fec' }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-gray-200 dark:text-gray-700"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transition: 'stroke-dashoffset 0.5s ease-out'
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-gray-900 dark:text-white">{progress}%</span>
      </div>
    </div>
  )
}

function DailyGoalProgress({ current, goal, label = 'Daily Goal' }) {
  const percentage = Math.min(100, Math.round((current / goal) * 100))
  const isComplete = current >= goal

  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</span>
        <span className={`text-sm font-bold ${isComplete ? 'text-green-500' : 'text-gray-900 dark:text-white'}`}>
          {current}/{goal}
        </span>
      </div>
      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${
            isComplete ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-primary'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isComplete && (
        <div className="flex items-center gap-1 mt-2 text-green-500 text-xs font-medium">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          Goal complete!
        </div>
      )}
    </div>
  )
}

export { 
  StreakBadge, 
  XPBadge, 
  LevelBadge, 
  AchievementBadge, 
  ProgressRing, 
  DailyGoalProgress 
}
