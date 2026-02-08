import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useContentContext } from '../context/ContentContext'

function ContentPage() {
  // Use ContentContext for Firebase sync
  const { 
    vocabulary: customVocab, 
    grammar: customGrammar, 
    exercises: customExercises,
    loading,
    addItem,
    updateItem,
    deleteItem,
    importItems
  } = useContentContext()

  const [activeTab, setActiveTab] = useState('vocabulary')
  const [showAddModal, setShowAddModal] = useState(false)
  const [modalType, setModalType] = useState('vocabulary')
  
  // Form states
  const [vocabForm, setVocabForm] = useState({
    kanji: '', reading: '', romaji: '', meaning: '', meaningVi: '',
    example: '', exampleMeaning: '', level: 'N5', type: 'Noun'
  })
  
  const [grammarForm, setGrammarForm] = useState({
    pattern: '', romaji: '', meaning: '', level: 'N5', explanation: '',
    example1Jp: '', example1Romaji: '', example1Meaning: '',
    example2Jp: '', example2Romaji: '', example2Meaning: ''
  })
  
  const [exerciseForm, setExerciseForm] = useState({
    type: 'fill-blank', question: '', answer: '',
    option1: '', option2: '', option3: '', option4: '', level: 'N5', category: 'grammar'
  })
  
  const [importText, setImportText] = useState('')
  const [editingItem, setEditingItem] = useState(null)
  const [saveStatus, setSaveStatus] = useState('')
  const [importingN3, setImportingN3] = useState(false)

  // Import N3 Grammar from pre-parsed JSON
  const handleImportN3Grammar = async () => {
    setImportingN3(true)
    setSaveStatus('Đang import ngữ pháp N3...')
    
    try {
      // Fetch the pre-parsed grammar data
      const response = await fetch('/grammar_n3_data.json')
      const data = await response.json()
      
      // Transform data to grammar format
      const grammarItems = data.map((item, index) => ({
        pattern: item.pattern,
        meaning: item.meaning || '',
        level: item.level || 'N3',
        explanation: item.notes || '',
        examples: (item.examples || []).map(ex => ({
          japanese: ex,
          meaning: ''
        })),
        order: item.order || index + 1
      }))
      
      // Use batch import function
      const result = await importItems('grammar', grammarItems)
      
      if (result.success) {
        setSaveStatus(`Đã import ${result.count} ngữ pháp N3!`)
      } else {
        setSaveStatus('Lỗi khi import!')
      }
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (error) {
      console.error('Error importing N3 grammar:', error)
      setSaveStatus('Lỗi khi import: ' + error.message)
    } finally {
      setImportingN3(false)
    }
  }

  // Add vocabulary
  const handleAddVocab = async () => {
    if (!vocabForm.kanji || !vocabForm.meaning) return
    
    setSaveStatus('Đang lưu...')
    
    try {
      if (editingItem) {
        await updateItem('vocabulary', editingItem.id, vocabForm)
      } else {
        await addItem('vocabulary', vocabForm)
      }
      setSaveStatus('Đã lưu!')
      setTimeout(() => setSaveStatus(''), 2000)
    } catch (error) {
      console.error('Error saving vocabulary:', error)
      setSaveStatus('Lỗi khi lưu!')
    }
    
    resetVocabForm()
    setShowAddModal(false)
    setEditingItem(null)
  }

  // Add grammar
  const handleAddGrammar = async () => {
    if (!grammarForm.pattern || !grammarForm.meaning) return
    
    setSaveStatus('Đang lưu...')
    
    const grammarData = {
      pattern: grammarForm.pattern,
      romaji: grammarForm.romaji,
      meaning: grammarForm.meaning,
      level: grammarForm.level,
      explanation: grammarForm.explanation,
      examples: [
        { japanese: grammarForm.example1Jp, romaji: grammarForm.example1Romaji, meaning: grammarForm.example1Meaning },
        { japanese: grammarForm.example2Jp, romaji: grammarForm.example2Romaji, meaning: grammarForm.example2Meaning }
      ].filter(e => e.japanese),
      exercises: []
    }
    
    try {
      if (editingItem) {
        await updateItem('grammar', editingItem.id, grammarData)
      } else {
        await addItem('grammar', grammarData)
      }
      setSaveStatus('Đã lưu!')
      setTimeout(() => setSaveStatus(''), 2000)
    } catch (error) {
      console.error('Error saving grammar:', error)
      setSaveStatus('Lỗi khi lưu!')
    }
    
    resetGrammarForm()
    setShowAddModal(false)
    setEditingItem(null)
  }

  // Add exercise
  const handleAddExercise = async () => {
    if (!exerciseForm.question || !exerciseForm.answer) return
    
    setSaveStatus('Đang lưu...')
    
    const options = [exerciseForm.option1, exerciseForm.option2, exerciseForm.option3, exerciseForm.option4].filter(o => o)
    
    const exerciseData = {
      type: exerciseForm.type,
      question: exerciseForm.question,
      answer: exerciseForm.answer,
      options: options.length > 0 ? options : [exerciseForm.answer],
      level: exerciseForm.level,
      category: exerciseForm.category
    }
    
    try {
      if (editingItem) {
        await updateItem('exercises', editingItem.id, exerciseData)
      } else {
        await addItem('exercises', exerciseData)
      }
      setSaveStatus('Đã lưu!')
      setTimeout(() => setSaveStatus(''), 2000)
    } catch (error) {
      console.error('Error saving exercise:', error)
      setSaveStatus('Lỗi khi lưu!')
    }
    
    resetExerciseForm()
    setShowAddModal(false)
    setEditingItem(null)
  }

  // Reset forms
  const resetVocabForm = () => {
    setVocabForm({
      kanji: '', reading: '', romaji: '', meaning: '', meaningVi: '',
      example: '', exampleMeaning: '', level: 'N5', type: 'Noun'
    })
  }
  
  const resetGrammarForm = () => {
    setGrammarForm({
      pattern: '', romaji: '', meaning: '', level: 'N5', explanation: '',
      example1Jp: '', example1Romaji: '', example1Meaning: '',
      example2Jp: '', example2Romaji: '', example2Meaning: ''
    })
  }
  
  const resetExerciseForm = () => {
    setExerciseForm({
      type: 'fill-blank', question: '', answer: '',
      option1: '', option2: '', option3: '', option4: '', level: 'N5', category: 'grammar'
    })
  }

  // Delete item
  const handleDelete = (type, id) => {
    if (!window.confirm('Bạn có chắc muốn xóa?')) return
    
    switch (type) {
      case 'vocabulary':
        saveVocab(customVocab.filter(v => v.id !== id))
        break
      case 'grammar':
        saveGrammar(customGrammar.filter(g => g.id !== id))
        break
      case 'exercises':
        saveExercises(customExercises.filter(e => e.id !== id))
        break
    }
  }

  // Edit item
  const handleEdit = (type, item) => {
    setModalType(type)
    setEditingItem(item)
    
    if (type === 'vocabulary') {
      setVocabForm(item)
    } else if (type === 'grammar') {
      setGrammarForm({
        pattern: item.pattern,
        romaji: item.romaji,
        meaning: item.meaning,
        level: item.level,
        explanation: item.explanation,
        example1Jp: item.examples?.[0]?.japanese || '',
        example1Romaji: item.examples?.[0]?.romaji || '',
        example1Meaning: item.examples?.[0]?.meaning || '',
        example2Jp: item.examples?.[1]?.japanese || '',
        example2Romaji: item.examples?.[1]?.romaji || '',
        example2Meaning: item.examples?.[1]?.meaning || ''
      })
    } else if (type === 'exercises') {
      setExerciseForm({
        type: item.type,
        question: item.question,
        answer: item.answer,
        option1: item.options?.[0] || '',
        option2: item.options?.[1] || '',
        option3: item.options?.[2] || '',
        option4: item.options?.[3] || '',
        level: item.level,
        category: item.category
      })
    }
    
    setShowAddModal(true)
  }

  // Import JSON
  const handleImport = () => {
    try {
      const data = JSON.parse(importText)
      const items = Array.isArray(data) ? data : [data]
      
      if (activeTab === 'vocabulary') {
        const newItems = items.map((item, i) => ({
          id: `vocab-import-${Date.now()}-${i}`,
          kanji: item.kanji || item.word || '',
          reading: item.reading || item.hiragana || '',
          romaji: item.romaji || '',
          meaning: item.meaning || item.english || '',
          meaningVi: item.meaningVi || item.vietnamese || '',
          example: item.example || '',
          exampleMeaning: item.exampleMeaning || '',
          level: item.level || 'N5',
          type: item.type || 'Noun',
          createdAt: Date.now()
        }))
        saveVocab([...customVocab, ...newItems])
        alert(`Đã import ${newItems.length} từ vựng!`)
      } else if (activeTab === 'grammar') {
        const newItems = items.map((item, i) => ({
          id: `grammar-import-${Date.now()}-${i}`,
          pattern: item.pattern || '',
          romaji: item.romaji || '',
          meaning: item.meaning || '',
          level: item.level || 'N5',
          explanation: item.explanation || '',
          examples: item.examples || [],
          createdAt: Date.now()
        }))
        saveGrammar([...customGrammar, ...newItems])
        alert(`Đã import ${newItems.length} mẫu ngữ pháp!`)
      } else if (activeTab === 'exercises') {
        const newItems = items.map((item, i) => ({
          id: `exercise-import-${Date.now()}-${i}`,
          type: item.type || 'fill-blank',
          question: item.question || '',
          answer: item.answer || '',
          options: item.options || [],
          level: item.level || 'N5',
          category: item.category || 'grammar',
          createdAt: Date.now()
        }))
        saveExercises([...customExercises, ...newItems])
        alert(`Đã import ${newItems.length} bài tập!`)
      }
      
      setImportText('')
    } catch (e) {
      alert('Lỗi: Format JSON không hợp lệ')
    }
  }

  // Open add modal
  const openAddModal = (type) => {
    setModalType(type)
    setEditingItem(null)
    if (type === 'vocabulary') resetVocabForm()
    else if (type === 'grammar') resetGrammarForm()
    else if (type === 'exercises') resetExerciseForm()
    setShowAddModal(true)
  }

  const tabs = [
    { id: 'vocabulary', label: 'Từ vựng', icon: 'translate', count: customVocab.length },
    { id: 'grammar', label: 'Ngữ pháp', icon: 'menu_book', count: customGrammar.length },
    { id: 'exercises', label: 'Bài tập', icon: 'quiz', count: customExercises.length }
  ]

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Quản lý nội dung</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Thêm từ vựng, ngữ pháp và bài tập để tự học</p>
          {saveStatus && (
            <p className="text-sm text-primary font-medium mt-1">{saveStatus}</p>
          )}
        </div>
        <div className="flex gap-2">
          {activeTab === 'grammar' && (
            <button 
              onClick={handleImportN3Grammar}
              disabled={importingN3}
              className={`flex items-center gap-2 px-4 py-2 border-2 border-primary text-primary font-medium rounded-xl transition-colors ${
                importingN3 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined">{importingN3 ? 'hourglass_empty' : 'download'}</span>
              {importingN3 ? 'Đang import...' : 'Import N3 (97 mẫu)'}
            </button>
          )}
          <button 
            onClick={() => openAddModal(activeTab)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-colors"
          >
            <span className="material-symbols-outlined">add</span>
            Thêm mới
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                : 'bg-white dark:bg-surface-dark text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-primary'
            }`}
          >
            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
            {tab.label}
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Vocabulary Tab */}
          {activeTab === 'vocabulary' && (
            <>
              {customVocab.length === 0 ? (
                <EmptyState icon="translate" message="Chưa có từ vựng nào" onAdd={() => openAddModal('vocabulary')} />
              ) : (
                customVocab.map((item) => (
                  <div key={item.id} className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl font-bold text-gray-900 dark:text-white">{item.kanji}</span>
                          <span className="text-lg text-gray-500 dark:text-gray-400">{item.reading}</span>
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-xs rounded-full">{item.level}</span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300">{item.meaning}</p>
                        {item.meaningVi && <p className="text-primary text-sm mt-1">{item.meaningVi}</p>}
                        {item.example && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 italic">"{item.example}"</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit('vocabulary', item)} className="p-2 text-gray-400 hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button onClick={() => handleDelete('vocabulary', item.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* Grammar Tab */}
          {activeTab === 'grammar' && (
            <>
              {customGrammar.length === 0 ? (
                <EmptyState icon="menu_book" message="Chưa có mẫu ngữ pháp nào" onAdd={() => openAddModal('grammar')} />
              ) : (
                customGrammar.map((item) => (
                  <div key={item.id} className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xl font-bold text-purple-600 dark:text-purple-400">{item.pattern}</span>
                          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 text-xs rounded-full">{item.level}</span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 font-medium">{item.meaning}</p>
                        {item.explanation && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{item.explanation}</p>
                        )}
                        {item.examples?.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {item.examples.map((ex, i) => (
                              <p key={i} className="text-sm">
                                <span className="text-gray-800 dark:text-gray-200">{ex.japanese}</span>
                                <span className="text-gray-500 dark:text-gray-400 ml-2">- {ex.meaning}</span>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit('grammar', item)} className="p-2 text-gray-400 hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button onClick={() => handleDelete('grammar', item.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* Exercises Tab */}
          {activeTab === 'exercises' && (
            <>
              {customExercises.length === 0 ? (
                <EmptyState icon="quiz" message="Chưa có bài tập nào" onAdd={() => openAddModal('exercises')} />
              ) : (
                customExercises.map((item) => (
                  <div key={item.id} className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            item.type === 'fill-blank' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600'
                          }`}>
                            {item.type === 'fill-blank' ? 'Điền từ' : 'Trắc nghiệm'}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">{item.level}</span>
                        </div>
                        <p className="text-gray-800 dark:text-gray-200 font-medium">{item.question}</p>
                        <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                          <span className="font-medium">Đáp án:</span> {item.answer}
                        </p>
                        {item.options?.length > 1 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {item.options.map((opt, i) => (
                              <span key={i} className={`px-3 py-1 rounded-lg text-sm ${
                                opt === item.answer 
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700' 
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                              }`}>
                                {opt}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit('exercises', item)} className="p-2 text-gray-400 hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button onClick={() => handleDelete('exercises', item.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Import */}
          <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">upload</span>
              Import JSON
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Dán dữ liệu JSON để import {activeTab === 'vocabulary' ? 'từ vựng' : activeTab === 'grammar' ? 'ngữ pháp' : 'bài tập'}.
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={activeTab === 'vocabulary' 
                ? '[{"kanji": "猫", "reading": "ねこ", "meaning": "cat", "meaningVi": "con mèo"}]'
                : activeTab === 'grammar'
                ? '[{"pattern": "〜は〜です", "meaning": "X is Y", "explanation": "..."}]'
                : '[{"type": "fill-blank", "question": "私___学生です", "answer": "は", "options": ["は", "が", "を"]}]'
              }
              className="w-full h-32 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm font-mono resize-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <button 
              onClick={handleImport}
              disabled={!importText.trim()}
              className={`w-full mt-4 py-2 rounded-lg font-medium transition-colors ${
                importText.trim()
                  ? 'bg-primary hover:bg-primary-hover text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              Import
            </button>
          </div>

          {/* Stats */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
            <h3 className="font-bold mb-4">Thống kê</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="opacity-80">Từ vựng</span>
                <span className="font-bold">{customVocab.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-80">Ngữ pháp</span>
                <span className="font-bold">{customGrammar.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-80">Bài tập</span>
                <span className="font-bold">{customExercises.length}</span>
              </div>
              <hr className="border-white/20" />
              <div className="flex justify-between font-bold">
                <span>Tổng cộng</span>
                <span>{customVocab.length + customGrammar.length + customExercises.length}</span>
              </div>
            </div>
          </div>

          {/* Format Help */}
          <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30 p-4">
            <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-2">Format JSON</h4>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2 font-mono">
              <p><b>Từ vựng:</b> kanji, reading, meaning, meaningVi</p>
              <p><b>Ngữ pháp:</b> pattern, meaning, explanation, examples[]</p>
              <p><b>Bài tập:</b> type, question, answer, options[]</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-surface-dark rounded-2xl w-full max-w-lg my-8 animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingItem ? 'Chỉnh sửa' : 'Thêm mới'} {modalType === 'vocabulary' ? 'Từ vựng' : modalType === 'grammar' ? 'Ngữ pháp' : 'Bài tập'}
              </h3>
              <button onClick={() => { setShowAddModal(false); setEditingItem(null); }} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* Vocabulary Form */}
              {modalType === 'vocabulary' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="Kanji/Từ *" value={vocabForm.kanji} onChange={(v) => setVocabForm({...vocabForm, kanji: v})} placeholder="猫" />
                    <InputField label="Hiragana" value={vocabForm.reading} onChange={(v) => setVocabForm({...vocabForm, reading: v})} placeholder="ねこ" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="Romaji" value={vocabForm.romaji} onChange={(v) => setVocabForm({...vocabForm, romaji: v})} placeholder="neko" />
                    <SelectField label="Level" value={vocabForm.level} onChange={(v) => setVocabForm({...vocabForm, level: v})} options={['N5', 'N4', 'N3', 'N2', 'N1']} />
                  </div>
                  <InputField label="Nghĩa tiếng Anh *" value={vocabForm.meaning} onChange={(v) => setVocabForm({...vocabForm, meaning: v})} placeholder="cat" />
                  <InputField label="Nghĩa tiếng Việt" value={vocabForm.meaningVi} onChange={(v) => setVocabForm({...vocabForm, meaningVi: v})} placeholder="con mèo" />
                  <InputField label="Ví dụ" value={vocabForm.example} onChange={(v) => setVocabForm({...vocabForm, example: v})} placeholder="猫が好きです。" />
                  <InputField label="Nghĩa ví dụ" value={vocabForm.exampleMeaning} onChange={(v) => setVocabForm({...vocabForm, exampleMeaning: v})} placeholder="I like cats." />
                </div>
              )}

              {/* Grammar Form */}
              {modalType === 'grammar' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="Mẫu câu *" value={grammarForm.pattern} onChange={(v) => setGrammarForm({...grammarForm, pattern: v})} placeholder="〜は〜です" />
                    <SelectField label="Level" value={grammarForm.level} onChange={(v) => setGrammarForm({...grammarForm, level: v})} options={['N5', 'N4', 'N3', 'N2', 'N1']} />
                  </div>
                  <InputField label="Romaji" value={grammarForm.romaji} onChange={(v) => setGrammarForm({...grammarForm, romaji: v})} placeholder="~wa~desu" />
                  <InputField label="Ý nghĩa *" value={grammarForm.meaning} onChange={(v) => setGrammarForm({...grammarForm, meaning: v})} placeholder="X is Y (polite)" />
                  <TextareaField label="Giải thích" value={grammarForm.explanation} onChange={(v) => setGrammarForm({...grammarForm, explanation: v})} placeholder="Đây là mẫu câu cơ bản nhất..." />
                  
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Ví dụ 1</h4>
                    <InputField label="Tiếng Nhật" value={grammarForm.example1Jp} onChange={(v) => setGrammarForm({...grammarForm, example1Jp: v})} placeholder="私は学生です。" />
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <InputField label="Romaji" value={grammarForm.example1Romaji} onChange={(v) => setGrammarForm({...grammarForm, example1Romaji: v})} placeholder="Watashi wa..." />
                      <InputField label="Nghĩa" value={grammarForm.example1Meaning} onChange={(v) => setGrammarForm({...grammarForm, example1Meaning: v})} placeholder="I am a student." />
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Ví dụ 2</h4>
                    <InputField label="Tiếng Nhật" value={grammarForm.example2Jp} onChange={(v) => setGrammarForm({...grammarForm, example2Jp: v})} placeholder="これは本です。" />
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <InputField label="Romaji" value={grammarForm.example2Romaji} onChange={(v) => setGrammarForm({...grammarForm, example2Romaji: v})} placeholder="Kore wa..." />
                      <InputField label="Nghĩa" value={grammarForm.example2Meaning} onChange={(v) => setGrammarForm({...grammarForm, example2Meaning: v})} placeholder="This is a book." />
                    </div>
                  </div>
                </div>
              )}

              {/* Exercise Form */}
              {modalType === 'exercises' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <SelectField label="Loại bài tập" value={exerciseForm.type} onChange={(v) => setExerciseForm({...exerciseForm, type: v})} options={[{value: 'fill-blank', label: 'Điền từ'}, {value: 'multiple-choice', label: 'Trắc nghiệm'}]} />
                    <SelectField label="Level" value={exerciseForm.level} onChange={(v) => setExerciseForm({...exerciseForm, level: v})} options={['N5', 'N4', 'N3', 'N2', 'N1']} />
                  </div>
                  <SelectField label="Danh mục" value={exerciseForm.category} onChange={(v) => setExerciseForm({...exerciseForm, category: v})} options={[{value: 'grammar', label: 'Ngữ pháp'}, {value: 'vocabulary', label: 'Từ vựng'}, {value: 'kanji', label: 'Kanji'}]} />
                  <TextareaField label="Câu hỏi *" value={exerciseForm.question} onChange={(v) => setExerciseForm({...exerciseForm, question: v})} placeholder="私___学生です。" />
                  <InputField label="Đáp án đúng *" value={exerciseForm.answer} onChange={(v) => setExerciseForm({...exerciseForm, answer: v})} placeholder="は" />
                  
                  {exerciseForm.type === 'multiple-choice' && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Các lựa chọn</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <InputField label="Lựa chọn 1" value={exerciseForm.option1} onChange={(v) => setExerciseForm({...exerciseForm, option1: v})} placeholder="は" />
                        <InputField label="Lựa chọn 2" value={exerciseForm.option2} onChange={(v) => setExerciseForm({...exerciseForm, option2: v})} placeholder="が" />
                        <InputField label="Lựa chọn 3" value={exerciseForm.option3} onChange={(v) => setExerciseForm({...exerciseForm, option3: v})} placeholder="を" />
                        <InputField label="Lựa chọn 4" value={exerciseForm.option4} onChange={(v) => setExerciseForm({...exerciseForm, option4: v})} placeholder="に" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button 
                onClick={() => { setShowAddModal(false); setEditingItem(null); }}
                className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={() => {
                  if (modalType === 'vocabulary') handleAddVocab()
                  else if (modalType === 'grammar') handleAddGrammar()
                  else if (modalType === 'exercises') handleAddExercise()
                }}
                className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold transition-colors"
              >
                {editingItem ? 'Cập nhật' : 'Thêm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper Components
function EmptyState({ icon, message, onAdd }) {
  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
      <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">{icon}</span>
      <p className="text-gray-500 dark:text-gray-400 mb-4">{message}</p>
      <button onClick={onAdd} className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors">
        Thêm ngay
      </button>
    </div>
  )
}

function InputField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
      />
    </div>
  )
}

function TextareaField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary resize-none"
      />
    </div>
  )
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
      >
        {options.map((opt) => (
          typeof opt === 'string' 
            ? <option key={opt} value={opt}>{opt}</option>
            : <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

export default ContentPage
