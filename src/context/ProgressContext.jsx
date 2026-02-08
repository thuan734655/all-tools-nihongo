import { createContext, useContext, useMemo } from 'react'
import { useProgress } from '../hooks/useProgress'

const ProgressContext = createContext()

export function ProgressProvider({ userId = null, children }) {
  const progressHook = useProgress(userId)
  
  const value = useMemo(() => progressHook, [progressHook])
  
  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  )
}

export function useProgressContext() {
  const context = useContext(ProgressContext)
  if (!context) {
    throw new Error('useProgressContext must be used within a ProgressProvider')
  }
  return context
}
