import { useContext } from 'react'
import { Link } from 'react-router-dom'
import { AppContext } from '../App'

function Header({ onMenuClick }) {
  const { darkMode, toggleDarkMode, user } = useContext(AppContext)

  return (
    <header className="md:hidden flex items-center justify-between p-4 bg-surface-light dark:bg-surface-dark border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
      <Link to="/" className="flex items-center gap-2">
        <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-[18px]">school</span>
        </div>
        <span className="font-bold text-gray-900 dark:text-white">Nihongo Master</span>
      </Link>

      <div className="flex items-center gap-2">
        {/* Dark Mode Toggle */}
        <button 
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">
            {darkMode ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        {/* Streak */}
        <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 rounded-full">
          <span className="material-symbols-outlined text-orange-500 text-[16px]">local_fire_department</span>
          <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{user.streak}</span>
        </div>

        {/* Menu Button */}
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="p-2 text-gray-600 dark:text-gray-300"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
      </div>
    </header>
  )
}

export default Header
