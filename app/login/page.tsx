'use client'
import { useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import { Lock, Mail, ArrowRight, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Sai email hoặc mật khẩu!')
      setLoading(false)
    } else {
      // Đăng nhập thành công -> Chuyển hướng vào Admin
      router.push('/admin')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-200 transform -rotate-6">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 uppercase">Admin Đăng Nhập</h1>
          <p className="text-slate-500 text-sm mt-1">Hệ thống quản lý sân cầu lông</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold text-center border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email</label>
            <div className="flex items-center bg-slate-50 p-3 rounded-xl border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
              <Mail className="w-5 h-5 text-slate-400 mr-3" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent w-full outline-none text-slate-800 font-bold"
                placeholder="admin@badminton.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Mật khẩu</label>
            <div className="flex items-center bg-slate-50 p-3 rounded-xl border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
              <Lock className="w-5 h-5 text-slate-400 mr-3" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent w-full outline-none text-slate-800 font-bold"
                placeholder="••••••"
              />
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-600 hover:shadow-blue-300 transition-all flex items-center justify-center gap-2 mt-6"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Đăng Nhập <ArrowRight className="w-5 h-5" /></>}
          </button>
        </form>
      </div>
    </div>
  )
}