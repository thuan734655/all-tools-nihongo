// Sample vocabulary data for flashcards
export const sampleVocabulary = [
  {
    id: '1',
    kanji: '猫',
    reading: 'ねこ',
    romaji: 'neko',
    meaning: 'Cat',
    meaningVi: 'Con mèo',
    level: 'N5',
    type: 'Noun',
    example: '猫が好きです。',
    exampleMeaning: 'I like cats.',
    components: '犭 (animal) + 苗 (seedling)',
    strokes: 11,
    srsLevel: 3,
    nextReview: new Date()
  },
  {
    id: '2',
    kanji: '犬',
    reading: 'いぬ',
    romaji: 'inu',
    meaning: 'Dog',
    meaningVi: 'Con chó',
    level: 'N5',
    type: 'Noun',
    example: '犬を飼っています。',
    exampleMeaning: 'I have a dog.',
    components: '犬 (dog)',
    strokes: 4,
    srsLevel: 2,
    nextReview: new Date()
  },
  {
    id: '3',
    kanji: '勉強',
    reading: 'べんきょう',
    romaji: 'benkyou',
    meaning: 'Study',
    meaningVi: 'Học tập',
    level: 'N5',
    type: 'Noun/Verb',
    example: '毎日日本語を勉強します。',
    exampleMeaning: 'I study Japanese every day.',
    components: '勉 (exertion) + 強 (strong)',
    strokes: 16,
    srsLevel: 4,
    nextReview: new Date()
  },
  {
    id: '4',
    kanji: '天気',
    reading: 'てんき',
    romaji: 'tenki',
    meaning: 'Weather',
    meaningVi: 'Thời tiết',
    level: 'N5',
    type: 'Noun',
    example: '明日の天気はどうですか？',
    exampleMeaning: 'How is the weather tomorrow?',
    components: '天 (heaven) + 気 (spirit)',
    strokes: 10,
    srsLevel: 1,
    nextReview: new Date()
  },
  {
    id: '5',
    kanji: '食べる',
    reading: 'たべる',
    romaji: 'taberu',
    meaning: 'To eat',
    meaningVi: 'Ăn',
    level: 'N5',
    type: 'Verb',
    example: 'ご飯を食べます。',
    exampleMeaning: 'I eat rice.',
    components: '食 (eat) + べる',
    strokes: 9,
    srsLevel: 5,
    nextReview: new Date()
  }
]

// Sample grammar data
export const sampleGrammar = [
  {
    id: '1',
    pattern: '〜は〜です',
    romaji: '~wa~desu',
    meaning: 'X is Y (polite)',
    level: 'N5',
    explanation: 'This is the most basic sentence pattern in Japanese. は (wa) marks the topic and です (desu) is the polite copula meaning "is".',
    examples: [
      { japanese: '私は学生です。', romaji: 'Watashi wa gakusei desu.', meaning: 'I am a student.' },
      { japanese: 'これは本です。', romaji: 'Kore wa hon desu.', meaning: 'This is a book.' }
    ],
    exercises: [
      {
        type: 'fill-blank',
        question: '私___学生です。',
        answer: 'は',
        options: ['は', 'が', 'を', 'に']
      },
      {
        type: 'multiple-choice',
        question: 'How do you say "She is a teacher" in Japanese?',
        answer: '彼女は先生です。',
        options: ['彼女は先生です。', '彼女が先生です。', '彼女を先生です。', '彼女に先生です。']
      }
    ]
  },
  {
    id: '2',
    pattern: '〜を〜ます',
    romaji: '~wo~masu',
    meaning: 'Object marker + polite verb',
    level: 'N5',
    explanation: 'を (wo/o) marks the direct object of an action verb. ます (masu) is the polite verb ending.',
    examples: [
      { japanese: '本を読みます。', romaji: 'Hon wo yomimasu.', meaning: 'I read a book.' },
      { japanese: 'ご飯を食べます。', romaji: 'Gohan wo tabemasu.', meaning: 'I eat rice.' }
    ],
    exercises: [
      {
        type: 'fill-blank',
        question: '水___飲みます。',
        answer: 'を',
        options: ['は', 'が', 'を', 'に']
      }
    ]
  },
  {
    id: '3',
    pattern: '〜に行きます',
    romaji: '~ni ikimasu',
    meaning: 'Go to ~',
    level: 'N5',
    explanation: 'に (ni) marks the destination when used with movement verbs like 行きます (ikimasu - to go).',
    examples: [
      { japanese: '学校に行きます。', romaji: 'Gakkou ni ikimasu.', meaning: 'I go to school.' },
      { japanese: '日本に行きます。', romaji: 'Nihon ni ikimasu.', meaning: 'I go to Japan.' }
    ],
    exercises: [
      {
        type: 'fill-blank',
        question: '駅___行きます。',
        answer: 'に',
        options: ['は', 'が', 'を', 'に']
      }
    ]
  }
]

// Sample speaking sentences
export const sampleSpeaking = [
  {
    id: '1',
    lesson: 14,
    category: 'Daily Conversation',
    japanese: '明日の天気はどうですか？',
    romaji: 'Ashita no tenki wa dou desu ka?',
    meaning: 'How is the weather tomorrow?'
  },
  {
    id: '2',
    lesson: 14,
    category: 'Daily Conversation',
    japanese: 'お元気ですか？',
    romaji: 'Ogenki desu ka?',
    meaning: 'How are you?'
  },
  {
    id: '3',
    lesson: 14,
    category: 'Daily Conversation',
    japanese: '今日は何をしますか？',
    romaji: 'Kyou wa nani wo shimasu ka?',
    meaning: 'What are you doing today?'
  }
]

// Sample reading passages
export const sampleReading = [
  {
    id: '1',
    title: 'History of Tea: From Medicine to Culture',
    titleJp: 'お茶の歴史',
    level: 'N3',
    readTime: 15,
    paragraphs: [
      {
        japanese: '日本のお茶の歴史は古く、奈良時代に遣唐使によってもたらされたと言われています。',
        furigana: [
          { word: '日本', reading: 'にほん' },
          { word: 'お茶', reading: 'おちゃ' },
          { word: '歴史', reading: 'れきし' },
          { word: '古', reading: 'ふる' },
          { word: '奈良時代', reading: 'ならじだい' },
          { word: '遣唐使', reading: 'けんとうし' },
          { word: '言', reading: 'い' }
        ]
      },
      {
        japanese: '当初は薬として珍重されましたが、鎌倉時代には禅宗の広まりとともに喫茶の習慣が定着しました。',
        furigana: [
          { word: '当初', reading: 'とうしょ' },
          { word: '薬', reading: 'くすり' },
          { word: '珍重', reading: 'ちんちょう' },
          { word: '鎌倉時代', reading: 'かまくらじだい' },
          { word: '禅宗', reading: 'ぜんしゅう' },
          { word: '広', reading: 'ひろ' },
          { word: '喫茶', reading: 'きっさ' },
          { word: '習慣', reading: 'しゅうかん' },
          { word: '定着', reading: 'ていちゃく' }
        ]
      }
    ],
    questions: [
      {
        question: 'When was tea introduced to Japan?',
        options: ['Heian Period', 'Nara Period', 'Edo Period'],
        answer: 'Nara Period'
      },
      {
        question: 'Why was tea originally valued?',
        options: ['As a luxury item', 'As medicine', 'For religious ceremonies'],
        answer: 'As medicine'
      }
    ]
  }
]

// Sample kanji for writing practice
export const sampleKanji = [
  {
    id: '1',
    kanji: '一',
    reading: 'いち',
    meaning: 'One',
    strokes: 1,
    level: 'N5',
    strokeOrder: ['horizontal']
  },
  {
    id: '2',
    kanji: '二',
    reading: 'に',
    meaning: 'Two',
    strokes: 2,
    level: 'N5',
    strokeOrder: ['horizontal', 'horizontal']
  },
  {
    id: '3',
    kanji: '三',
    reading: 'さん',
    meaning: 'Three',
    strokes: 3,
    level: 'N5',
    strokeOrder: ['horizontal', 'horizontal', 'horizontal']
  },
  {
    id: '4',
    kanji: '日',
    reading: 'にち/ひ',
    meaning: 'Day/Sun',
    strokes: 4,
    level: 'N5',
    strokeOrder: ['vertical', 'horizontal-top', 'horizontal-middle', 'horizontal-bottom']
  },
  {
    id: '5',
    kanji: '月',
    reading: 'げつ/つき',
    meaning: 'Moon/Month',
    strokes: 4,
    level: 'N5',
    strokeOrder: ['vertical-left', 'horizontal-top', 'vertical-right', 'horizontal-bottom']
  }
]

// User stats
export const sampleUserStats = {
  streak: 12,
  totalVocab: 650,
  totalKanji: 150,
  grammarProgress: 45,
  pendingReviews: 142,
  newLessons: 20,
  avgAccuracy: 92,
  studyTimeThisWeek: [1.5, 3.2, 1.0, 5.0, 0, 0, 0] // Mon-Sun hours
}
