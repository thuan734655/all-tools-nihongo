import { useState, useEffect, useCallback } from 'react'
import { ref, get, set, update, onValue } from 'firebase/database'
import { db } from '../config/firebase'

// Local storage keys
const STORAGE_KEYS = {
  PROGRESS: 'nihongo_progress',
  STREAK: 'nihongo_streak',
  LAST_STUDY: 'nihongo_last_study'
}

// Default progress structure
const DEFAULT_PROGRESS = {
  vocabulary: {
    learned: [],
    mastered: [],
    totalReviews: 0,
    accuracy: 0
  },
  grammar: {
    completedLessons: [],
    exercisesCompleted: 0,
    correctAnswers: 0,
    progress: {}
  },
  kanji: {
    learned: [],
    practiced: [],
    strokeAccuracy: 0,
    totalPractice: 0
  },
  speaking: {
    sentencesPracticed: [],
    avgScore: 0,
    totalSessions: 0
  },
  reading: {
    articlesRead: [],
    wordsAdded: [],
    quizScore: 0
  },
  streak: {
    current: 0,
    longest: 0,
    lastStudyDate: null
  },
  stats: {
    totalStudyTime: 0,
    totalSessions: 0,
    lastSessionDate: null
  }
}

export function useProgress(userId = null) {
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load progress from localStorage or Firebase Realtime Database
  useEffect(() => {
    let unsubscribe = null

    const loadProgress = async () => {
      setLoading(true)
      
      if (userId) {
        // Subscribe to Firebase Realtime Database
        try {
          const progressRef = ref(db, `users/${userId}/progress`)
          
          // Real-time listener
          unsubscribe = onValue(progressRef, (snapshot) => {
            if (snapshot.exists()) {
              setProgress(snapshot.val())
            } else {
              // Create default progress
              set(progressRef, DEFAULT_PROGRESS)
              setProgress(DEFAULT_PROGRESS)
            }
            setLoading(false)
          }, (error) => {
            console.error('Error loading progress from Firebase:', error)
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

    loadProgress()

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [userId])

  const loadFromLocalStorage = () => {
    const stored = localStorage.getItem(STORAGE_KEYS.PROGRESS)
    if (stored) {
      setProgress(JSON.parse(stored))
    } else {
      setProgress(DEFAULT_PROGRESS)
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(DEFAULT_PROGRESS))
    }
  }

  // Save progress to localStorage and Firebase Realtime Database
  const saveProgress = useCallback(async (newProgress) => {
    setProgress(newProgress)
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(newProgress))
    
    if (userId) {
      try {
        const progressRef = ref(db, `users/${userId}/progress`)
        await update(progressRef, {
          ...newProgress,
          updatedAt: Date.now()
        })
      } catch (error) {
        console.error('Error saving progress to Firebase:', error)
      }
    }
  }, [userId])

  // Update streak
  const updateStreak = useCallback(async () => {
    const today = new Date().toDateString()
    const lastStudy = progress?.streak?.lastStudyDate
    
    let newStreak = progress?.streak?.current || 0
    
    if (lastStudy !== today) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      
      if (lastStudy === yesterday.toDateString()) {
        newStreak += 1
      } else if (lastStudy !== today) {
        newStreak = 1 // Reset streak
      }
      
      const updatedProgress = {
        ...progress,
        streak: {
          current: newStreak,
          longest: Math.max(newStreak, progress?.streak?.longest || 0),
          lastStudyDate: today
        }
      }
      
      await saveProgress(updatedProgress)
      return newStreak
    }
    
    return newStreak
  }, [progress, saveProgress])

  // Update vocabulary progress
  const updateVocabularyProgress = useCallback(async (wordId, grade) => {
    const vocab = progress?.vocabulary || DEFAULT_PROGRESS.vocabulary
    const learned = new Set(vocab.learned || [])
    const mastered = new Set(vocab.mastered || [])
    
    learned.add(wordId)
    if (grade === 'easy' || grade === 'good') {
      mastered.add(wordId)
    } else if (grade === 'again') {
      mastered.delete(wordId)
    }
    
    const totalReviews = (vocab.totalReviews || 0) + 1
    const correctAnswers = (grade === 'easy' || grade === 'good') ? 1 : 0
    const accuracy = Math.round((((vocab.accuracy || 0) * (vocab.totalReviews || 0) + correctAnswers * 100) / totalReviews))
    
    const updatedProgress = {
      ...progress,
      vocabulary: {
        learned: [...learned],
        mastered: [...mastered],
        totalReviews,
        accuracy
      }
    }
    
    await saveProgress(updatedProgress)
    await updateStreak()
  }, [progress, saveProgress, updateStreak])

  // Update grammar progress
  const updateGrammarProgress = useCallback(async (lessonId, isCorrect, isCompleted = false) => {
    const grammar = progress?.grammar || DEFAULT_PROGRESS.grammar
    
    const lessonProgress = (grammar.progress || {})[lessonId] || { exercises: 0, correct: 0, completed: false }
    lessonProgress.exercises += 1
    if (isCorrect) lessonProgress.correct += 1
    if (isCompleted) lessonProgress.completed = true
    lessonProgress.score = Math.round((lessonProgress.correct / lessonProgress.exercises) * 100)
    
    const completedLessons = isCompleted && !(grammar.completedLessons || []).includes(lessonId)
      ? [...(grammar.completedLessons || []), lessonId]
      : (grammar.completedLessons || [])
    
    const updatedProgress = {
      ...progress,
      grammar: {
        completedLessons,
        exercisesCompleted: (grammar.exercisesCompleted || 0) + 1,
        correctAnswers: (grammar.correctAnswers || 0) + (isCorrect ? 1 : 0),
        progress: {
          ...(grammar.progress || {}),
          [lessonId]: lessonProgress
        }
      }
    }
    
    await saveProgress(updatedProgress)
    await updateStreak()
  }, [progress, saveProgress, updateStreak])

  // Update kanji progress
  const updateKanjiProgress = useCallback(async (kanjiId, score) => {
    const kanji = progress?.kanji || DEFAULT_PROGRESS.kanji
    const practiced = new Set(kanji.practiced || [])
    practiced.add(kanjiId)
    
    const learned = score >= 80 
      ? [...new Set([...(kanji.learned || []), kanjiId])]
      : (kanji.learned || [])
    
    const totalPractice = (kanji.totalPractice || 0) + 1
    const strokeAccuracy = Math.round(
      (((kanji.strokeAccuracy || 0) * (kanji.totalPractice || 0)) + score) / totalPractice
    )
    
    const updatedProgress = {
      ...progress,
      kanji: {
        learned,
        practiced: [...practiced],
        strokeAccuracy,
        totalPractice
      }
    }
    
    await saveProgress(updatedProgress)
    await updateStreak()
  }, [progress, saveProgress, updateStreak])

  // Update speaking progress
  const updateSpeakingProgress = useCallback(async (sentenceId, score) => {
    const speaking = progress?.speaking || DEFAULT_PROGRESS.speaking
    const sentencesPracticed = new Set(speaking.sentencesPracticed || [])
    sentencesPracticed.add(sentenceId)
    
    const totalSessions = (speaking.totalSessions || 0) + 1
    const avgScore = Math.round(
      (((speaking.avgScore || 0) * (speaking.totalSessions || 0)) + score) / totalSessions
    )
    
    const updatedProgress = {
      ...progress,
      speaking: {
        sentencesPracticed: [...sentencesPracticed],
        avgScore,
        totalSessions
      }
    }
    
    await saveProgress(updatedProgress)
    await updateStreak()
  }, [progress, saveProgress, updateStreak])

  // Update reading progress
  const updateReadingProgress = useCallback(async (articleId, wordsAdded = [], quizCorrect = 0, quizTotal = 0) => {
    const reading = progress?.reading || DEFAULT_PROGRESS.reading
    const articlesRead = new Set(reading.articlesRead || [])
    articlesRead.add(articleId)
    
    const allWordsAdded = [...new Set([...(reading.wordsAdded || []), ...wordsAdded])]
    const newQuizScore = quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : 0
    
    const updatedProgress = {
      ...progress,
      reading: {
        articlesRead: [...articlesRead],
        wordsAdded: allWordsAdded,
        quizScore: (reading.quizScore || 0) > 0 ? Math.round(((reading.quizScore || 0) + newQuizScore) / 2) : newQuizScore
      }
    }
    
    await saveProgress(updatedProgress)
    await updateStreak()
  }, [progress, saveProgress, updateStreak])

  // Get computed stats
  const getStats = useCallback(() => {
    if (!progress) return null
    
    return {
      streak: progress.streak?.current || 0,
      longestStreak: progress.streak?.longest || 0,
      vocabularyLearned: progress.vocabulary?.learned?.length || 0,
      vocabularyMastered: progress.vocabulary?.mastered?.length || 0,
      grammarCompleted: progress.grammar?.completedLessons?.length || 0,
      grammarAccuracy: (progress.grammar?.exercisesCompleted || 0) > 0 
        ? Math.round((progress.grammar.correctAnswers / progress.grammar.exercisesCompleted) * 100)
        : 0,
      kanjiLearned: progress.kanji?.learned?.length || 0,
      kanjiAccuracy: progress.kanji?.strokeAccuracy || 0,
      speakingScore: progress.speaking?.avgScore || 0,
      articlesRead: progress.reading?.articlesRead?.length || 0
    }
  }, [progress])

  return {
    progress,
    loading,
    updateVocabularyProgress,
    updateGrammarProgress,
    updateKanjiProgress,
    updateSpeakingProgress,
    updateReadingProgress,
    updateStreak,
    getStats
  }
}
