import { useState } from 'react'
import { Link } from 'react-router-dom'
import { sampleReading } from '../data/sampleData'

function ReadingPage() {
  const [showFurigana, setShowFurigana] = useState(true)
  const [selectedWord, setSelectedWord] = useState(null)
  const [answers, setAnswers] = useState({})
  const [showResults, setShowResults] = useState({})
  const [addedToSRS, setAddedToSRS] = useState([])

  const article = sampleReading[0]
  const completedQuestions = Object.keys(showResults).filter(k => showResults[k]).length

  const handleWordClick = (word, reading) => {
    setSelectedWord({ word, reading })
  }

  const handleAnswerSelect = (questionIndex, answer) => {
    setAnswers({ ...answers, [questionIndex]: answer })
  }

  const checkAnswer = (questionIndex) => {
    setShowResults({ ...showResults, [questionIndex]: true })
  }

  const addToSRS = (word) => {
    if (!addedToSRS.includes(word)) {
      setAddedToSRS([...addedToSRS, word])
    }
    setSelectedWord(null)
  }

  const renderInteractiveText = (paragraph) => {
    // Simple rendering with furigana
    return paragraph.japanese.split('').map((char, i) => {
      const furiganaItem = paragraph.furigana.find(f => paragraph.japanese.indexOf(f.word) <= i && paragraph.japanese.indexOf(f.word) + f.word.length > i)
      
      if (furiganaItem && paragraph.japanese.indexOf(furiganaItem.word) === i) {
        return (
          <span 
            key={i}
            className="interactive-word cursor-pointer"
            onClick={() => handleWordClick(furiganaItem.word, furiganaItem.reading)}
          >
            {showFurigana ? (
              <ruby>
                {furiganaItem.word}
                <rt className="text-xs">{furiganaItem.reading}</rt>
              </ruby>
            ) : (
              furiganaItem.word
            )}
          </span>
        )
      } else if (furiganaItem && paragraph.japanese.indexOf(furiganaItem.word) < i && paragraph.japanese.indexOf(furiganaItem.word) + furiganaItem.word.length > i) {
        return null // Already rendered as part of the word
      }
      return <span key={i}>{char}</span>
    })
  }

  return (
    <div className="p-4 md:p-8 max-w-[1440px] mx-auto">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: Reading Pane */}
        <div className="flex-1 min-w-0">
          {/* Article Header */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
                {article.level}
              </span>
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium px-2 py-1 rounded flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                {article.readTime} min read
              </span>
              <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium px-2 py-1 rounded flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                Read
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900 dark:text-white leading-tight">
              {article.title}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {article.titleJp} - Learn about how tea transformed Japanese society through the ages.
            </p>
          </div>

          {/* Reading Toolbar */}
          <div className="sticky top-0 z-30 mb-8 bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <button className="p-2 text-gray-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <span className="material-symbols-outlined">text_decrease</span>
              </button>
              <span className="text-sm font-medium w-8 text-center">Aa</span>
              <button className="p-2 text-gray-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <span className="material-symbols-outlined">text_increase</span>
              </button>
            </div>

            <label className="inline-flex items-center cursor-pointer group">
              <span className="mr-3 text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">
                Furigana
              </span>
              <div className="relative">
                <input 
                  type="checkbox" 
                  checked={showFurigana}
                  onChange={() => setShowFurigana(!showFurigana)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
              </div>
            </label>
          </div>

          {/* Reading Content */}
          <div className="relative bg-surface-light dark:bg-surface-dark rounded-2xl p-6 md:p-10 shadow-sm border border-gray-100 dark:border-gray-800/50">
            {/* Word Popup */}
            {selectedWord && (
              <div className="absolute top-[20%] left-[10%] z-50 animate-fade-in w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-2xl font-bold japanese-text text-gray-900 dark:text-white">{selectedWord.word}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 japanese-text">{selectedWord.reading}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedWord(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  </div>
                  <div className="mb-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      Click "Add to SRS" to add this word to your flashcard deck.
                    </p>
                  </div>
                  <button 
                    onClick={() => addToSRS(selectedWord.word)}
                    disabled={addedToSRS.includes(selectedWord.word)}
                    className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-bold transition-colors ${
                      addedToSRS.includes(selectedWord.word)
                        ? 'bg-green-100 text-green-700 cursor-not-allowed'
                        : 'bg-primary hover:bg-primary-hover text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {addedToSRS.includes(selectedWord.word) ? 'check' : 'add_circle'}
                    </span>
                    {addedToSRS.includes(selectedWord.word) ? 'Added to SRS' : 'Add to SRS'}
                  </button>
                </div>
              </div>
            )}

            {/* Text Content */}
            <article className="japanese-text text-xl md:text-2xl leading-loose tracking-wide text-gray-800 dark:text-gray-200 max-w-prose mx-auto">
              {article.paragraphs.map((paragraph, index) => (
                <p key={index} className="mb-8">
                  {renderInteractiveText(paragraph)}
                </p>
              ))}
            </article>
          </div>

          {/* Navigation */}
          <div className="mt-8 flex justify-between items-center">
            <button className="flex items-center gap-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
              Previous Chapter
            </button>
            <button className="flex items-center gap-2 text-primary font-bold hover:text-primary-hover transition-colors">
              Next Chapter
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Right Column: Sidebar */}
        <aside className="w-full lg:w-[380px] shrink-0">
          <div className="sticky top-4 flex flex-col gap-4">
            {/* Progress Card */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-gray-800 dark:text-white">Comprehension</h3>
                <span className="text-sm font-bold text-primary">{completedQuestions}/{article.questions.length} Done</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${(completedQuestions / article.questions.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Questions */}
            {article.questions.map((question, qIndex) => (
              <div 
                key={qIndex}
                className={`rounded-xl p-5 border shadow-sm ${
                  showResults[qIndex]
                    ? answers[qIndex] === question.answer
                      ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30'
                      : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30'
                    : 'bg-surface-light dark:bg-surface-dark border-gray-200 dark:border-gray-700'
                }`}
              >
                <h4 className="font-bold text-gray-800 dark:text-white mb-4 text-sm">
                  {qIndex + 1}. {question.question}
                </h4>
                <div className="space-y-2">
                  {question.options.map((option, oIndex) => (
                    <label 
                      key={oIndex}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        showResults[qIndex]
                          ? option === question.answer
                            ? 'border-green-500 bg-green-100 dark:bg-green-900/40'
                            : answers[qIndex] === option
                              ? 'border-red-500 bg-red-100 dark:bg-red-900/40'
                              : 'border-transparent opacity-50'
                          : answers[qIndex] === option
                            ? 'border-primary bg-primary/10'
                            : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                      }`}
                    >
                      <input 
                        type="radio"
                        name={`question-${qIndex}`}
                        checked={answers[qIndex] === option}
                        onChange={() => !showResults[qIndex] && handleAnswerSelect(qIndex, option)}
                        disabled={showResults[qIndex]}
                        className="sr-only"
                      />
                      <div className={`size-4 rounded-full border-2 flex items-center justify-center ${
                        showResults[qIndex] && option === question.answer
                          ? 'border-green-500 bg-green-500'
                          : answers[qIndex] === option
                            ? 'border-primary bg-primary'
                            : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {(answers[qIndex] === option || (showResults[qIndex] && option === question.answer)) && (
                          <div className="size-2 rounded-full bg-white"></div>
                        )}
                      </div>
                      <span className={`text-sm ${
                        showResults[qIndex] && option === question.answer
                          ? 'font-medium text-green-700 dark:text-green-300'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {option}
                      </span>
                    </label>
                  ))}
                </div>
                
                {!showResults[qIndex] && answers[qIndex] && (
                  <div className="mt-4 flex justify-end">
                    <button 
                      onClick={() => checkAnswer(qIndex)}
                      className="bg-primary text-white text-sm font-bold py-2 px-4 rounded-lg hover:bg-primary-hover transition-colors"
                    >
                      Check Answer
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* SRS Widget */}
            {addedToSRS.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-xl p-5 border border-yellow-200 dark:border-yellow-800/30 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-800/30 rounded-lg text-yellow-700 dark:text-yellow-400">
                    <span className="material-symbols-outlined">style</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">Session SRS</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{addedToSRS.length} words added</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {addedToSRS.map((word, i) => (
                    <span 
                      key={i}
                      className="text-xs bg-white dark:bg-slate-800 border border-yellow-100 dark:border-yellow-900 px-2 py-1 rounded text-gray-600 dark:text-gray-300 japanese-text"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Back to Dashboard */}
            <Link 
              to="/"
              className="flex items-center justify-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-primary hover:border-primary transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Back to Dashboard
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default ReadingPage
