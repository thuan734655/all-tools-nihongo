import { useState, useEffect, useCallback } from 'react'
import { ref, get, set, update, remove, onValue } from 'firebase/database'
import { db } from '../config/firebase'

// Local storage key
const STORAGE_KEY = 'nihongo_decks'

// Default decks
const DEFAULT_DECKS = [
  {
    id: 'default-n5-vocab',
    name: 'N5 Vocabulary',
    type: 'vocabulary',
    cards: [],
    createdAt: Date.now(),
    isDefault: true
  }
]

export function useDecks(userId = null) {
  const [decks, setDecks] = useState([])
  const [loading, setLoading] = useState(true)

  // Load decks from localStorage or Firebase Realtime Database
  useEffect(() => {
    let unsubscribe = null

    const loadDecks = async () => {
      setLoading(true)
      
      if (userId) {
        try {
          const decksRef = ref(db, `users/${userId}/decks`)
          
          // Real-time listener
          unsubscribe = onValue(decksRef, (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.val()
              // Convert object to array
              const loadedDecks = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
              }))
              setDecks(loadedDecks)
            } else {
              // Create default decks
              DEFAULT_DECKS.forEach(deck => {
                set(ref(db, `users/${userId}/decks/${deck.id}`), deck)
              })
              setDecks(DEFAULT_DECKS)
            }
            setLoading(false)
          }, (error) => {
            console.error('Error loading decks from Firebase:', error)
            loadFromLocalStorage()
            setLoading(false)
          })
        } catch (error) {
          console.error('Error setting up Firebase listener:', error)
          loadFromLocalStorage()
          setLoading(false)
        }
      } else {
        loadFromLocalStorage()
        setLoading(false)
      }
    }

    loadDecks()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [userId])

  const loadFromLocalStorage = () => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setDecks(JSON.parse(stored))
    } else {
      setDecks(DEFAULT_DECKS)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DECKS))
    }
  }

  const saveToLocalStorage = (newDecks) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newDecks))
  }

  // Create deck
  const createDeck = useCallback(async (name, type) => {
    const newDeck = {
      id: `deck-${Date.now()}`,
      name,
      type,
      cards: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    const newDecks = [...decks, newDeck]
    setDecks(newDecks)
    saveToLocalStorage(newDecks)

    if (userId) {
      try {
        await set(ref(db, `users/${userId}/decks/${newDeck.id}`), newDeck)
      } catch (error) {
        console.error('Error creating deck in Firebase:', error)
      }
    }

    return newDeck
  }, [decks, userId])

  // Delete deck
  const deleteDeck = useCallback(async (deckId) => {
    const newDecks = decks.filter(d => d.id !== deckId)
    setDecks(newDecks)
    saveToLocalStorage(newDecks)

    if (userId) {
      try {
        await remove(ref(db, `users/${userId}/decks/${deckId}`))
      } catch (error) {
        console.error('Error deleting deck from Firebase:', error)
      }
    }
  }, [decks, userId])

  // Add cards to deck
  const addCardsToDeck = useCallback(async (deckId, cards) => {
    const newDecks = decks.map(deck => {
      if (deck.id === deckId) {
        return {
          ...deck,
          cards: [...(deck.cards || []), ...cards],
          updatedAt: Date.now()
        }
      }
      return deck
    })

    setDecks(newDecks)
    saveToLocalStorage(newDecks)

    if (userId) {
      try {
        const deck = newDecks.find(d => d.id === deckId)
        await update(ref(db, `users/${userId}/decks/${deckId}`), {
          cards: deck.cards,
          updatedAt: Date.now()
        })
      } catch (error) {
        console.error('Error updating deck in Firebase:', error)
      }
    }
  }, [decks, userId])

  // Import cards from JSON
  const importCards = useCallback(async (deckId, jsonData) => {
    try {
      let cards = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData
      
      if (!Array.isArray(cards)) {
        cards = [cards]
      }

      // Normalize card format
      const normalizedCards = cards.map((card, index) => ({
        id: `card-${Date.now()}-${index}`,
        kanji: card.kanji || card.word || '',
        reading: card.reading || card.hiragana || '',
        romaji: card.romaji || '',
        meaning: card.meaning || card.english || '',
        meaningVi: card.meaningVi || card.vietnamese || '',
        example: card.example || '',
        exampleMeaning: card.exampleMeaning || '',
        level: card.level || 'N5',
        type: card.type || 'Noun',
        srsLevel: 0,
        nextReview: Date.now(),
        createdAt: Date.now()
      }))

      await addCardsToDeck(deckId, normalizedCards)
      return { success: true, count: normalizedCards.length }
    } catch (error) {
      console.error('Error importing cards:', error)
      return { success: false, error: error.message }
    }
  }, [addCardsToDeck])

  return {
    decks,
    loading,
    createDeck,
    deleteDeck,
    addCardsToDeck,
    importCards
  }
}
