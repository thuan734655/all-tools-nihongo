import { useContext, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AppContext } from '../App'
import { useContentContext } from '../context/ContentContext'
import { useProgressContext } from '../context/ProgressContext'

function DashboardPage() {
  const { user, darkMode, toggleDarkMode } = useContext(AppContext)
  const { vocabulary, grammar, kanji, exercises, loading: contentLoading } = useContentContext()
  const { progress, loading: progressLoading } = useProgressContext()

  // Calculate stats from real data
  const stats = useMemo(() => {
    const vocabCount = vocabulary.length
    const grammarCount = grammar.length
    const kanjiCount = kanji.length
    const exerciseCount = exercises.length
    
    // Calculate pending reviews (items with nextReview <= now)
    const now = new Date()
    const pendingReviews = vocabulary.filter(v => {
      if (!v.nextReview) return true
      return new Date(v.nextReview) <= now
    }).length

    // Get streak from progress (streak is object with {current, longest}) or user stats
    const streakData = progress?.streak
    const streak = typeof streakData === 'object' ? (streakData?.current || 0) : (streakData || user?.streak || 0)
    const xp = progress?.stats?.totalXp || user?.xp || 0
    
    // Calculate study time this week (from progress or default)
    const studyTimeThisWeek = progress?.studyTimeThisWeek || [0, 0, 0, 0, 0, 0, 0]
    
    // Grammar progress as percentage
    const grammarProgress = grammarCount > 0 
      ? Math.min(100, Math.round((grammarCount / 50) * 100)) 
      : 0

    return {
      vocabCount,
      grammarCount,
      kanjiCount,
      exerciseCount,
      pendingReviews,
      streak,
      xp,
      studyTimeThisWeek,
      grammarProgress,
      totalContent: vocabCount + grammarCount + kanjiCount + exerciseCount
    }
  }, [vocabulary, grammar, kanji, exercises, progress, user])

  const today = new Date()
  const dateString = today.toLocaleDateString('vi-VN', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  })

  const isLoading = contentLoading || progressLoading

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 lg:p-10 max-w-6xl mx-auto">
        <div className="text-center py-20">
          <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-6xl mx-auto">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">
            {dateString}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            こんにちは, <span className="text-primary">{user?.displayName || user?.email?.split('@')[0] || 'Bạn'}!</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-lg">
            {stats.totalContent > 0 
              ? `Bạn có ${stats.vocabCount} từ vựng, ${stats.grammarCount} mẫu ngữ pháp và ${stats.kanjiCount} Kanji. Hãy tiếp tục học!`
              : 'Chào mừng bạn! Hãy bắt đầu thêm nội dung học để sử dụng ứng dụng.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleDarkMode}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors hidden md:block"
          >
            <span className="material-symbols-outlined text-[20px]">
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          <div className="bg-surface-light dark:bg-surface-dark px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {user?.level?.replace('JLPT ', '') || 'N5'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Stats Banner */}
      {stats.totalContent === 0 && (
        <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="size-12 bg-primary/20 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-2xl">rocket_launch</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">Bắt đầu hành trình học tiếng Nhật!</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Thêm từ vựng, ngữ pháp và Kanji để bắt đầu học.</p>
            </div>
            <Link 
              to="/content"
              className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined">add</span>
              Thêm nội dung
            </Link>
          </div>
        </div>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* SRS Reviews Card */}
        <Link 
          to="/flashcard"
          className="bg-white dark:bg-surface-dark rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 dark:border-gray-700 relative overflow-hidden group hover:shadow-md transition-all duration-300"
        >
          <div className="relative z-10 flex flex-col h-full justify-between gap-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-primary text-2xl">style</span>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Flashcard</h2>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Ôn tập từ vựng với thẻ ghi nhớ</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                stats.vocabCount > 0 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {stats.vocabCount} từ vựng
              </span>
            </div>
            <div className="mt-auto">
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                {stats.pendingReviews} <span className="text-lg font-normal text-gray-500">cần ôn tập</span>
              </div>
              <div className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors">
                <span className="material-symbols-outlined">play_circle</span>
                {stats.vocabCount > 0 ? 'Bắt đầu ôn tập' : 'Thêm từ vựng'}
              </div>
            </div>
          </div>
        </Link>

        {/* Grammar Card */}
        <Link 
          to="/grammar"
          className="bg-white dark:bg-surface-dark rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 dark:border-gray-700 relative overflow-hidden group hover:shadow-md transition-all duration-300"
        >
          <div className="relative z-10 flex flex-col h-full justify-between gap-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-purple-500 text-2xl">menu_book</span>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Ngữ pháp</h2>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Học các mẫu ngữ pháp tiếng Nhật</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                stats.grammarCount > 0 
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {stats.grammarCount} mẫu
              </span>
            </div>
            <div className="mt-auto">
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">{stats.kanjiCount}</span>
                <span className="text-lg font-normal text-gray-500">Kanji</span>
                <span className="text-gray-300 px-2">|</span>
                <span className="text-4xl font-bold text-gray-900 dark:text-white">{stats.exerciseCount}</span>
                <span className="text-lg font-normal text-gray-500">Bài tập</span>
              </div>
              <div className="w-full bg-white dark:bg-surface-dark border-2 border-gray-200 dark:border-gray-600 hover:border-primary text-gray-700 dark:text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors">
                <span className="material-symbols-outlined">school</span>
                {stats.grammarCount > 0 ? 'Học ngữ pháp' : 'Thêm ngữ pháp'}
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-surface-dark p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col gap-1">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <span className="material-symbols-outlined text-orange-500 text-xl">local_fire_department</span>
            <span className="text-sm font-medium">Streak</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.streak}</span>
            <span className="text-sm text-gray-500">ngày</span>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col gap-1">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <span className="material-symbols-outlined text-blue-500 text-xl">style</span>
            <span className="text-sm font-medium">Từ vựng</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.vocabCount}</span>
            <span className="text-sm text-gray-500">từ</span>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col gap-1">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <span className="material-symbols-outlined text-purple-500 text-xl">menu_book</span>
            <span className="text-sm font-medium">Ngữ pháp</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.grammarCount}</span>
            <span className="text-sm text-gray-500">mẫu</span>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col gap-1">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <span className="material-symbols-outlined text-pink-500 text-xl">edit</span>
            <span className="text-sm font-medium">Kanji</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.kanjiCount}</span>
            <span className="text-sm text-gray-500">chữ</span>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content Summary */}
        <div className="lg:col-span-2 bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Nội dung học tập</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Tổng cộng {stats.totalContent} mục nội dung
              </p>
            </div>
            <Link to="/content" className="text-primary hover:underline text-sm font-medium flex items-center gap-1">
              Quản lý
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          {/* Content Bars */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Từ vựng</span>
                <span className="font-medium text-gray-900 dark:text-white">{stats.vocabCount}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all" 
                  style={{ width: `${Math.min(100, (stats.vocabCount / 100) * 100)}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Ngữ pháp</span>
                <span className="font-medium text-gray-900 dark:text-white">{stats.grammarCount}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all" 
                  style={{ width: `${Math.min(100, (stats.grammarCount / 50) * 100)}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Kanji</span>
                <span className="font-medium text-gray-900 dark:text-white">{stats.kanjiCount}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-pink-500 h-2 rounded-full transition-all" 
                  style={{ width: `${Math.min(100, (stats.kanjiCount / 200) * 100)}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Bài tập</span>
                <span className="font-medium text-gray-900 dark:text-white">{stats.exerciseCount}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all" 
                  style={{ width: `${Math.min(100, (stats.exerciseCount / 50) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 dark:from-primary/10 dark:to-purple-500/10 p-6 rounded-2xl border border-primary/10 dark:border-primary/20 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary">bolt</span>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Thao tác nhanh</h3>
            </div>
          </div>
          <div className="space-y-3">
            <Link to="/content" className="bg-white dark:bg-surface-dark p-3 rounded-lg flex items-center justify-between shadow-sm cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">add</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Thêm từ vựng</p>
                  <p className="text-xs text-gray-500">Nhập từ vựng mới</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-gray-400 text-sm">chevron_right</span>
            </Link>
            <Link to="/kanji" className="bg-white dark:bg-surface-dark p-3 rounded-lg flex items-center justify-between shadow-sm cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded bg-pink-100 text-pink-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">edit</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Luyện viết Kanji</p>
                  <p className="text-xs text-gray-500">Tập viết chữ Kanji</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-gray-400 text-sm">chevron_right</span>
            </Link>
            <Link to="/speaking" className="bg-white dark:bg-surface-dark p-3 rounded-lg flex items-center justify-between shadow-sm cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded bg-green-100 text-green-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">mic</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Luyện phát âm</p>
                  <p className="text-xs text-gray-500">Thực hành nói</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-gray-400 text-sm">chevron_right</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer Quote */}
      <div className="text-center pt-8 pb-4">
        <p className="text-xs text-gray-400 italic">"七転び八起き" - Ngã 7 lần, đứng dậy 8 lần</p>
      </div>
    </div>
  )
}

export default DashboardPage
