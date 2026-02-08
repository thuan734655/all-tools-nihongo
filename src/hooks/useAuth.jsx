import { useState, useEffect, useContext, createContext } from 'react'
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signOut as firebaseSignOut
} from 'firebase/auth'
import { ref, get, set, update } from 'firebase/database'
import { auth, db } from '../config/firebase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get or create user profile in Realtime Database
        const userProfile = await getUserProfile(firebaseUser.uid)
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || userProfile?.displayName || 'Learner',
          avatar: firebaseUser.photoURL || 'https://lh3.googleusercontent.com/aida-public/AB6AXuC8dJPeC9o8eo2D17kXPfKIHWdzrmqMAIKubSoCiZyCu2rSyWmp48B0PYAkc5CkArtt6o0BaM75zmtIThtSkFsftH9BmbO6vFRsU1qCzQxDIpe9mjI5NFpHlJSHWQ6zl0eFEC4Oo-WYrOE7rxkuH6VH5A233fyUYrm5BEvLPVELcpVeed7P_aiah3k5Un2pD5MQmfaOTtNiImespNlRluwMwpUDiLcq6aXkhg4At2J1kg4foxHnHa1tYsh9UoBWuKc-Jrn7Cy3qSQ',
          ...userProfile
        })
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    try {
      const result = await signInWithPopup(auth, provider)
      await createUserProfileIfNotExists(result.user)
      return { success: true }
    } catch (error) {
      console.error('Google sign-in error:', error)
      return { success: false, error: error.message }
    }
  }

  const signInWithEmail = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return { success: true }
    } catch (error) {
      console.error('Email sign-in error:', error)
      return { success: false, error: error.message }
    }
  }

  const signUpWithEmail = async (email, password, displayName) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      await createUserProfileIfNotExists(result.user, displayName)
      return { success: true }
    } catch (error) {
      console.error('Sign-up error:', error)
      return { success: false, error: error.message }
    }
  }

  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
      return { success: true }
    } catch (error) {
      console.error('Sign-out error:', error)
      return { success: false, error: error.message }
    }
  }

  const value = {
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Helper functions for Realtime Database
async function getUserProfile(uid) {
  try {
    const userRef = ref(db, `users/${uid}/profile`)
    const snapshot = await get(userRef)
    if (snapshot.exists()) {
      return snapshot.val()
    }
    return null
  } catch (error) {
    console.error('Error getting user profile:', error)
    return null
  }
}

async function createUserProfileIfNotExists(firebaseUser, displayName = null) {
  try {
    const userRef = ref(db, `users/${firebaseUser.uid}/profile`)
    const snapshot = await get(userRef)
    
    if (!snapshot.exists()) {
      await set(userRef, {
        displayName: displayName || firebaseUser.displayName || 'Learner',
        email: firebaseUser.email,
        level: 'N5',
        streak: 0,
        xp: 0,
        lastStudyDate: null,
        totalStudyTime: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
    }
  } catch (error) {
    console.error('Error creating user profile:', error)
  }
}
