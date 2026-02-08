import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const openMobileMenu = () => setMobileMenuOpen(true)
  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex">
      {/* Sidebar - Hidden on mobile */}
      <Sidebar />

      {/* Mobile sidebar drawer + overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={closeMobileMenu}
        />
      )}
      <div className="md:hidden">
        <Sidebar mobile open={mobileMenuOpen} onClose={closeMobileMenu} />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <Header onMenuClick={openMobileMenu} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
