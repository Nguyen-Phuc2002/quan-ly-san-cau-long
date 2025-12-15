'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Trophy } from 'lucide-react'

export default function Navbar() {
  const pathname = usePathname()

  if (pathname.startsWith('/admin') || pathname.startsWith('/login')) {
    return null
  }

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-blue-600 p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
             <Trophy className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-xl text-slate-800 tracking-tight">
            BADMINTON<span className="text-blue-600">PRO</span>
          </span>
        </Link>

        {/* MENU */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <button className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all
              ${pathname === '/' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
              <Home className="w-4 h-4" /> <span className="hidden md:inline">Trang chủ</span>
            </button>
          </Link>

          <Link href="/tra-cuu">
            <button className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all
              ${pathname === '/tra-cuu' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
              <Search className="w-4 h-4" /> <span className="hidden md:inline">Tra cứu</span>
            </button>
          </Link>
          
          {/* ĐÃ XÓA NÚT ADMIN Ở ĐÂY */}
        </div>
      </div>
    </nav>
  )
}