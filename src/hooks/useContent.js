import { useState, useEffect, useCallback } from 'react'
import { ref, get, set, update, remove, onValue } from 'firebase/database'
import { db } from '../config/firebase'

// Local storage keys
const STORAGE_KEYS = {
  VOCABULARY: 'nihongo_custom_vocabulary',
  GRAMMAR: 'nihongo_custom_grammar',
  EXERCISES: 'nihongo_custom_exercises',
  KANJI: 'nihongo_custom_kanji',
  READING: 'nihongo_custom_reading',
  SPEAKING: 'nihongo_custom_speaking'
}

export function useContent(userId = null) {
  const [vocabulary, setVocabulary] = useState([])
  const [grammar, setGrammar] = useState([])
  const [exercises, setExercises] = useState([])
  const [kanji, setKanji] = useState([])
  const [reading, setReading] = useState([])
  const [speaking, setSpeaking] = useState([])
  const [loading, setLoading] = useState(true)

  // Load all content
  useEffect(() => {
    let unsubscribes = []

    const loadContent = async () => {
      setLoading(true)

      if (userId) {
        // Load from Firebase Realtime Database
        try {
          const contentTypes = [
            { path: 'vocabulary', setter: setVocabulary, storageKey: STORAGE_KEYS.VOCABULARY },
            { path: 'grammar', setter: setGrammar, storageKey: STORAGE_KEYS.GRAMMAR },
            { path: 'exercises', setter: setExercises, storageKey: STORAGE_KEYS.EXERCISES },
            { path: 'kanji', setter: setKanji, storageKey: STORAGE_KEYS.KANJI },
            { path: 'reading', setter: setReading, storageKey: STORAGE_KEYS.READING },
            { path: 'speaking', setter: setSpeaking, storageKey: STORAGE_KEYS.SPEAKING }
          ]

          for (const { path, setter, storageKey } of contentTypes) {
            const contentRef = ref(db, `users/${userId}/content/${path}`)
            
            const unsubscribe = onValue(contentRef, (snapshot) => {
              if (snapshot.exists()) {
                const data = snapshot.val()
                const items = Object.keys(data).map(key => ({ id: key, ...data[key] }))
                setter(items)
                // Also save to localStorage as backup
                localStorage.setItem(storageKey, JSON.stringify(items))
              } else {
                // Try to load from localStorage
                const stored = localStorage.getItem(storageKey)
                if (stored) {
                  setter(JSON.parse(stored))
                }
              }
            }, (error) => {
              console.error(`Error loading ${path} from Firebase:`, error)
              // Fallback to localStorage
              const stored = localStorage.getItem(storageKey)
              if (stored) setter(JSON.parse(stored))
            })
            
            unsubscribes.push(unsubscribe)
          }
        } catch (error) {
          console.error('Error setting up Firebase listeners:', error)
          loadFromLocalStorage()
        }
      } else {
        loadFromLocalStorage()
      }

      setLoading(false)
    }

    loadContent()

    return () => {
      unsubscribes.forEach(unsub => unsub && unsub())
    }
  }, [userId])

  const loadFromLocalStorage = () => {
    const storedVocab = localStorage.getItem(STORAGE_KEYS.VOCABULARY)
    const storedGrammar = localStorage.getItem(STORAGE_KEYS.GRAMMAR)
    const storedExercises = localStorage.getItem(STORAGE_KEYS.EXERCISES)
    const storedKanji = localStorage.getItem(STORAGE_KEYS.KANJI)
    const storedReading = localStorage.getItem(STORAGE_KEYS.READING)
    const storedSpeaking = localStorage.getItem(STORAGE_KEYS.SPEAKING)

    if (storedVocab) setVocabulary(JSON.parse(storedVocab))
    if (storedGrammar) setGrammar(JSON.parse(storedGrammar))
    if (storedExercises) setExercises(JSON.parse(storedExercises))
    if (storedKanji) setKanji(JSON.parse(storedKanji))
    if (storedReading) setReading(JSON.parse(storedReading))
    if (storedSpeaking) setSpeaking(JSON.parse(storedSpeaking))
  }

  // Save functions
  const saveToStorage = useCallback(async (type, data) => {
    const storageKey = STORAGE_KEYS[type.toUpperCase()]
    localStorage.setItem(storageKey, JSON.stringify(data))

    if (userId) {
      try {
        const contentRef = ref(db, `users/${userId}/content/${type}`)
        const dataObj = {}
        data.forEach(item => {
          dataObj[item.id] = item
        })
        await set(contentRef, dataObj)
      } catch (error) {
        console.error(`Error saving ${type} to Firebase:`, error)
      }
    }
  }, [userId])

  // Add item
  const addItem = useCallback(async (type, item) => {
    const newItem = {
      ...item,
      id: item.id || `${type}-${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    let updatedData
    switch (type) {
      case 'vocabulary':
        updatedData = [...vocabulary, newItem]
        setVocabulary(updatedData)
        break
      case 'grammar':
        updatedData = [...grammar, newItem]
        setGrammar(updatedData)
        break
      case 'exercises':
        updatedData = [...exercises, newItem]
        setExercises(updatedData)
        break
      case 'kanji':
        updatedData = [...kanji, newItem]
        setKanji(updatedData)
        break
      case 'reading':
        updatedData = [...reading, newItem]
        setReading(updatedData)
        break
      case 'speaking':
        updatedData = [...speaking, newItem]
        setSpeaking(updatedData)
        break
      default:
        return
    }

    await saveToStorage(type, updatedData)
    return newItem
  }, [vocabulary, grammar, exercises, kanji, reading, speaking, saveToStorage])

  // Update item
  const updateItem = useCallback(async (type, id, updates) => {
    const updatedItem = { ...updates, id, updatedAt: Date.now() }
    let updatedData

    switch (type) {
      case 'vocabulary':
        updatedData = vocabulary.map(item => item.id === id ? { ...item, ...updatedItem } : item)
        setVocabulary(updatedData)
        break
      case 'grammar':
        updatedData = grammar.map(item => item.id === id ? { ...item, ...updatedItem } : item)
        setGrammar(updatedData)
        break
      case 'exercises':
        updatedData = exercises.map(item => item.id === id ? { ...item, ...updatedItem } : item)
        setExercises(updatedData)
        break
      case 'kanji':
        updatedData = kanji.map(item => item.id === id ? { ...item, ...updatedItem } : item)
        setKanji(updatedData)
        break
      case 'reading':
        updatedData = reading.map(item => item.id === id ? { ...item, ...updatedItem } : item)
        setReading(updatedData)
        break
      case 'speaking':
        updatedData = speaking.map(item => item.id === id ? { ...item, ...updatedItem } : item)
        setSpeaking(updatedData)
        break
      default:
        return
    }

    await saveToStorage(type, updatedData)
  }, [vocabulary, grammar, exercises, kanji, reading, speaking, saveToStorage])

  // Delete item
  const deleteItem = useCallback(async (type, id) => {
    let updatedData

    switch (type) {
      case 'vocabulary':
        updatedData = vocabulary.filter(item => item.id !== id)
        setVocabulary(updatedData)
        break
      case 'grammar':
        updatedData = grammar.filter(item => item.id !== id)
        setGrammar(updatedData)
        break
      case 'exercises':
        updatedData = exercises.filter(item => item.id !== id)
        setExercises(updatedData)
        break
      case 'kanji':
        updatedData = kanji.filter(item => item.id !== id)
        setKanji(updatedData)
        break
      case 'reading':
        updatedData = reading.filter(item => item.id !== id)
        setReading(updatedData)
        break
      case 'speaking':
        updatedData = speaking.filter(item => item.id !== id)
        setSpeaking(updatedData)
        break
      default:
        return
    }

    await saveToStorage(type, updatedData)

    if (userId) {
      try {
        await remove(ref(db, `users/${userId}/content/${type}/${id}`))
      } catch (error) {
        console.error(`Error deleting ${type} item from Firebase:`, error)
      }
    }
  }, [vocabulary, grammar, exercises, kanji, reading, speaking, saveToStorage, userId])

  // Import multiple items
  const importItems = useCallback(async (type, items) => {
    const newItems = items.map((item, i) => ({
      ...item,
      id: item.id || `${type}-import-${Date.now()}-${i}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }))

    let updatedData
    switch (type) {
      case 'vocabulary':
        updatedData = [...vocabulary, ...newItems]
        setVocabulary(updatedData)
        break
      case 'grammar':
        updatedData = [...grammar, ...newItems]
        setGrammar(updatedData)
        break
      case 'exercises':
        updatedData = [...exercises, ...newItems]
        setExercises(updatedData)
        break
      case 'kanji':
        updatedData = [...kanji, ...newItems]
        setKanji(updatedData)
        break
      case 'reading':
        updatedData = [...reading, ...newItems]
        setReading(updatedData)
        break
      case 'speaking':
        updatedData = [...speaking, ...newItems]
        setSpeaking(updatedData)
        break
      default:
        return { success: false, count: 0 }
    }

    await saveToStorage(type, updatedData)
    return { success: true, count: newItems.length }
  }, [vocabulary, grammar, exercises, kanji, reading, speaking, saveToStorage])

  return {
    vocabulary,
    grammar,
    exercises,
    kanji,
    reading,
    speaking,
    loading,
    addItem,
    updateItem,
    deleteItem,
    importItems
  }
}
