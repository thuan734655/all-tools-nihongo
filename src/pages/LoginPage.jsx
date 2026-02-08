import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      let result
      if (isSignUp) {
        result = await signUpWithEmail(email, password, name)
      } else {
        result = await signInWithEmail(email, password)
      }
      
      if (result.success) {
        navigate('/')
      } else {
        setError(getErrorMessage(result.error))
      }
    } catch (err) {
      setError('Có lỗi xảy ra. Vui lòng thử lại.')
    }
    
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    
    try {
      const result = await signInWithGoogle()
      if (result.success) {
        navigate('/')
      } else {
        setError(getErrorMessage(result.error))
      }
    } catch (err) {
      setError('Có lỗi xảy ra với Google Sign-in.')
    }
    
    setLoading(false)
  }

  const getErrorMessage = (error) => {
    if (error?.includes('user-not-found')) return 'Email không tồn tại'
    if (error?.includes('wrong-password')) return 'Mật khẩu không đúng'
    if (error?.includes('email-already-in-use')) return 'Email đã được sử dụng'
    if (error?.includes('weak-password')) return 'Mật khẩu phải có ít nhất 6 ký tự'
    if (error?.includes('invalid-email')) return 'Email không hợp lệ'
    if (error?.includes('popup-closed')) return 'Đăng nhập bị hủy'
    return error || 'Có lỗi xảy ra'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-background-dark dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-16 bg-primary rounded-2xl mb-4 shadow-lg shadow-blue-500/30">
            <span className="text-3xl">🇯🇵</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Nihongo</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">学習 - Học tiếng Nhật</p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl dark:shadow-black/20 p-8 border border-gray-100 dark:border-gray-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            {isSignUp ? 'Tạo tài khoản' : 'Chào mừng trở lại'}
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tên hiển thị
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                  placeholder="Tên của bạn"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                placeholder="email@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mật khẩu
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Đang xử lý...
                </span>
              ) : isSignUp ? 'Đăng ký' : 'Đăng nhập'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
            <span className="text-sm text-gray-500 dark:text-gray-400">hoặc</span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
          </div>

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 font-medium flex items-center justify-center gap-3 transition-colors"
          >
            <svg className="size-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
              <path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09c1.97 3.92 6.02 6.62 10.71 6.62z"/>
              <path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29v-3.09h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09z"/>
              <path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42c-2.07-1.94-4.78-3.13-8.02-3.13-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
            </svg>
            Đăng nhập với Google
          </button>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {isSignUp ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              className="text-primary hover:underline font-medium"
            >
              {isSignUp ? 'Đăng nhập' : 'Đăng ký'}
            </button>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-8">
          Bằng việc tiếp tục, bạn đồng ý với Điều khoản sử dụng và Chính sách bảo mật
        </p>
      </div>
    </div>
  )
}

export default LoginPage
