import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, createContext, useEffect } from 'react'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import FlashcardPage from './pages/FlashcardPage'
import GrammarPage from './pages/GrammarPage'
import SpeakingPage from './pages/SpeakingPage'
import KanjiPage from './pages/KanjiPage'
import ReadingPage from './pages/ReadingPage'
import ContentPage from './pages/ContentPage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'
import { ProgressProvider } from './context/ProgressContext'
import { ContentProvider } from './context/ContentContext'
import { AuthProvider, useAuth } from './hooks/useAuth'

// Create context for app-wide state
export const AppContext = createContext()

// Default avatar
const DEFAULT_AVATAR = 'https://lh3.googleusercontent.com/aida-public/AB6AXuC8dJPeC9o8eo2D17kXPfKIHWdzrmqMAIKubSoCiZyCu2rSyWmp48B0PYAkc5CkArtt6o0BaM75zmtIThtSkFsftH9BmbO6vFRsU1qCzQxDIpe9mjI5NFpHlJSHWQ6zl0eFEC4Oo-WYrOE7rxkuH6VH5A233fyUYrm5BEvLPVELcpVeed7P_aiah3k5Un2pD5MQmfaOTtNiImespNlRluwMwpUDiLcq6aXkhg4At2J1kg4foxHnHa1tYsh9UoBWuKc-Jrn7Cy3qSQ'

function AppContent() {
  const { user, loading, signOut } = useAuth()
  
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('nihongo_darkMode')
    return saved === 'true'
  })

  // Persist dark mode preference
  useEffect(() => {
    localStorage.setItem('nihongo_darkMode', darkMode)
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  // User stats functions
  const [userStats, setUserStats] = useState(() => {
    const saved = localStorage.getItem('nihongo_userStats')
    return saved ? JSON.parse(saved) : {
      xp: 0,
      streak: 0,
      dailyGoal: 20,
      dailyProgress: 0,
      level: 'JLPT N5'
    }
  })

  useEffect(() => {
    localStorage.setItem('nihongo_userStats', JSON.stringify(userStats))
  }, [userStats])

  const updateUserStats = (updates) => {
    setUserStats(prev => ({ ...prev, ...updates }))
  }

  const addXP = (amount) => {
    setUserStats(prev => ({
      ...prev,
      xp: prev.xp + amount,
      dailyProgress: prev.dailyProgress + 1
    }))
  }

  const updateStreak = (newStreak) => {
    setUserStats(prev => ({ ...prev, streak: newStreak }))
  }

  const handleLogout = async () => {
    await signOut()
  }

  // Combined user object for context
  const appUser = user ? {
    ...user,
    ...userStats,
    avatar: user.avatar || DEFAULT_AVATAR
  } : null

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-background-dark">
        <div className="text-center">
          <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Đang tải...</p>
        </div>
      </div>
    )
  }

  return (
    <AppContext.Provider value={{ 
      darkMode, 
      toggleDarkMode, 
      user: appUser,
      isAuthenticated: !!user,
      updateUserStats,
      addXP,
      updateStreak,
      logout: handleLogout
    }}>
      <ContentProvider userId={user?.uid || null}>
        <ProgressProvider userId={user?.uid || null}>
          <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
            <Routes>
              {/* Public route */}
              <Route path="/login" element={
                user ? <Navigate to="/" replace /> : <LoginPage />
              } />
              
              {/* Protected routes */}
              <Route path="/" element={
                user ? <Layout /> : <Navigate to="/login" replace />
              }>
                <Route index element={<DashboardPage />} />
                <Route path="flashcard" element={<FlashcardPage />} />
                <Route path="grammar" element={<GrammarPage />} />
                <Route path="speaking" element={<SpeakingPage />} />
                <Route path="kanji" element={<KanjiPage />} />
                <Route path="reading" element={<ReadingPage />} />
                <Route path="content" element={<ContentPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </div>
        </ProgressProvider>
      </ContentProvider>
    </AppContext.Provider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
