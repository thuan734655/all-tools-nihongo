import { createContext, useContext, useMemo } from 'react'
import { useContent } from '../hooks/useContent'

const ContentContext = createContext()

export function ContentProvider({ userId = null, children }) {
  const contentHook = useContent(userId)
  
  const value = useMemo(() => contentHook, [contentHook])
  
  return (
    <ContentContext.Provider value={value}>
      {children}
    </ContentContext.Provider>
  )
}

export function useContentContext() {
  const context = useContext(ContentContext)
  if (!context) {
    throw new Error('useContentContext must be used within a ContentProvider')
  }
  return context
}
