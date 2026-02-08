import { useContext } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { AppContext } from '../App'

function Sidebar() {
  const { user, logout, isAuthenticated } = useContext(AppContext)
  const navigate = useNavigate()

  const navItems = [
    { path: '/', icon: 'dashboard', label: 'Dashboard' },
    { path: '/flashcard', icon: 'style', label: 'Flashcards' },
    { path: '/grammar', icon: 'menu_book', label: 'Ngữ pháp' },
    { path: '/speaking', icon: 'mic', label: 'Luyện nói' },
    { path: '/kanji', icon: 'edit', label: 'Viết Kanji' },
    { path: '/reading', icon: 'auto_stories', label: 'Đọc hiểu' },
    { path: '/content', icon: 'add_circle', label: 'Thêm nội dung' },
    { path: '/settings', icon: 'settings', label: 'Cài đặt' },
  ]

  const handleLogout = async () => {
    if (logout) {
      await logout()
      navigate('/login')
    }
  }

  if (!user) return null

  return (
    <aside className="w-64 bg-surface-light dark:bg-surface-dark border-r border-gray-200 dark:border-gray-800 flex flex-col justify-between h-screen hidden md:flex shrink-0 sticky top-0">
      <div className="p-6">
        {/* User Profile */}
        <div className="flex items-center gap-3 mb-8">
          <div className="relative size-10 rounded-full overflow-hidden border-2 border-primary/20">
            <img 
              alt="User profile" 
              className="w-full h-full object-cover" 
              src={user.avatar}
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">
              {user.displayName || user.email?.split('@')[0] || 'Người dùng'}
            </h1>
            <p className="text-xs text-primary font-medium">{user.level || 'JLPT N5'}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800">
        {/* User email */}
        <div className="px-3 py-2 mb-2">
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
            {user.email}
          </p>
        </div>
        
        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="text-sm font-medium">Đăng xuất</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
