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
import { ProgressProvider } from './context/ProgressContext'
import { ContentProvider } from './context/ContentContext'

// Create context for app-wide state
export const AppContext = createContext()

// Default avatar
const DEFAULT_AVATAR = 'https://lh3.googleusercontent.com/aida-public/AB6AXuC8dJPeC9o8eo2D17kXPfKIHWdzrmqMAIKubSoCiZyCu2rSyWmp48B0PYAkc5CkArtt6o0BaM75zmtIThtSkFsftH9BmbO6vFRsU1qCzQxDIpe9mjI5NFpHlJSHWQ6zl0eFEC4Oo-WYrOE7rxkuH6VH5A233fyUYrm5BEvLPVELcpVeed7P_aiah3k5Un2pD5MQmfaOTtNiImespNlRluwMwpUDiLcq6aXkhg4At2J1kg4foxHnHa1tYsh9UoBWuKc-Jrn7Cy3qSQ'

function App() {
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
    return saved
      ? JSON.parse(saved)
      : {
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
    setUserStats((prev) => ({ ...prev, ...updates }))
  }

  const addXP = (amount) => {
    setUserStats((prev) => ({
      ...prev,
      xp: prev.xp + amount,
      dailyProgress: prev.dailyProgress + 1
    }))
  }

  const updateStreak = (newStreak) => {
    setUserStats((prev) => ({ ...prev, streak: newStreak }))
  }

  // Local user (login removed)
  const appUser = {
    uid: null,
    email: 'local@nihongo.app',
    displayName: userStats.displayName || 'Learner',
    ...userStats,
    avatar: DEFAULT_AVATAR
  }

  return (
    <AppContext.Provider
      value={{
        darkMode,
        toggleDarkMode,
        user: appUser,
        isAuthenticated: true,
        updateUserStats,
        addXP,
        updateStreak,
        logout: async () => {}
      }}
    >
      <ContentProvider userId={null}>
        <ProgressProvider userId={null}>
          <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
            <Routes>
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/" element={<Layout />}>
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

export default App
