import { useState, useContext } from 'react'
import { Link } from 'react-router-dom'
import { AppContext } from '../App'
import { StreakBadge, LevelBadge, DailyGoalProgress } from '../components/Gamification'

function SettingsPage() {
  const { user, darkMode, toggleDarkMode, updateUserStats } = useContext(AppContext)
  const [activeTab, setActiveTab] = useState('profile')
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState(user?.displayName || '')
  const [dailyGoal, setDailyGoal] = useState(user?.dailyGoal || 20)
  const [notifications, setNotifications] = useState({
    dailyReminder: true,
    streakReminder: true,
    newContent: false,
    achievements: true
  })

  const handleSaveName = () => {
    if (newName.trim()) {
      updateUserStats({ displayName: newName.trim() })
      setEditingName(false)
    }
  }

  const handleSaveGoal = () => {
    updateUserStats({ dailyGoal })
  }

  const levels = ['N5', 'N4', 'N3', 'N2', 'N1']

  const tabs = [
    { id: 'profile', label: 'Profile', icon: 'person' },
    { id: 'learning', label: 'Learning', icon: 'school' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications' },
    { id: 'appearance', label: 'Appearance', icon: 'palette' },
    { id: 'data', label: 'Data & Privacy', icon: 'security' }
  ]

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Customize your learning experience</p>
        </div>
        <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="hidden sm:inline">Back</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary border-l-4 border-primary'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border-l-4 border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <>
              <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-6">Profile Information</h3>
                
                <div className="flex items-center gap-6 mb-6">
                  <img 
                    src={user?.avatar}
                    alt="Avatar"
                    className="size-20 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-lg"
                  />
                  <div>
                    <button className="px-4 py-2 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors">
                      Change Photo
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Display Name
                    </label>
                    {editingName ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                        <button 
                          onClick={handleSaveName}
                          className="px-4 py-2 rounded-lg bg-primary text-white font-medium"
                        >
                          Save
                        </button>
                        <button 
                          onClick={() => setEditingName(false)}
                          className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-900 dark:text-white font-medium">{user?.displayName}</span>
                        <button 
                          onClick={() => setEditingName(true)}
                          className="text-primary text-sm font-medium hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Current Level
                    </label>
                    <div className="flex items-center gap-2">
                      <LevelBadge level={user?.level?.split(' ')[1] || 'N5'} size="large" />
                      <span className="text-gray-900 dark:text-white">{user?.level}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Card */}
              <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">Your Progress</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                    <div className="flex justify-center mb-2">
                      <StreakBadge streak={user?.streak || 0} size="large" />
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Day Streak</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{user?.xp || 0}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total XP</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <div className="text-2xl font-bold text-primary">156</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Words Learned</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">24</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Kanji Mastered</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Learning Tab */}
          {activeTab === 'learning' && (
            <>
              <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-6">Learning Goals</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                      Daily Review Goal
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="5"
                        max="50"
                        step="5"
                        value={dailyGoal}
                        onChange={(e) => setDailyGoal(Number(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <span className="w-16 text-center text-lg font-bold text-gray-900 dark:text-white">
                        {dailyGoal}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Cards to review per day
                    </p>
                  </div>

                  <DailyGoalProgress current={user?.dailyProgress || 0} goal={dailyGoal} />

                  <button 
                    onClick={handleSaveGoal}
                    className="px-6 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">Target Level</h3>
                <div className="flex flex-wrap gap-3">
                  {levels.map((level) => (
                    <button
                      key={level}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        user?.level?.includes(level)
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      JLPT {level}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-6">Notification Preferences</h3>
              
              <div className="space-y-4">
                {[
                  { key: 'dailyReminder', label: 'Daily Study Reminder', desc: 'Get reminded to study every day' },
                  { key: 'streakReminder', label: 'Streak Reminder', desc: "Don't lose your streak!" },
                  { key: 'newContent', label: 'New Content', desc: 'When new lessons are available' },
                  { key: 'achievements', label: 'Achievements', desc: 'When you unlock achievements' }
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{item.label}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications[item.key]}
                        onChange={(e) => setNotifications(prev => ({ ...prev, [item.key]: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-6">Theme</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => darkMode && toggleDarkMode()}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    !darkMode 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="size-12 bg-white border border-gray-200 rounded-lg mb-3 flex items-center justify-center">
                    <span className="material-symbols-outlined text-yellow-500">light_mode</span>
                  </div>
                  <div className="font-medium text-gray-900 dark:text-white">Light</div>
                </button>

                <button
                  onClick={() => !darkMode && toggleDarkMode()}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    darkMode 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="size-12 bg-gray-900 rounded-lg mb-3 flex items-center justify-center">
                    <span className="material-symbols-outlined text-indigo-400">dark_mode</span>
                  </div>
                  <div className="font-medium text-gray-900 dark:text-white">Dark</div>
                </button>
              </div>
            </div>
          )}

          {/* Data & Privacy Tab */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">Export Data</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Download all your learning progress and data.
                </p>
                <button className="px-6 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">download</span>
                  Export Data
                </button>
              </div>

              <div className="bg-white dark:bg-surface-dark rounded-xl border border-red-200 dark:border-red-900/30 p-6">
                <h3 className="font-bold text-red-600 dark:text-red-400 mb-4">Danger Zone</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Reset all progress or delete your account. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button className="px-6 py-2 rounded-lg border-2 border-red-500 text-red-500 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    Reset Progress
                  </button>
                  <button className="px-6 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
