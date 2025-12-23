'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'
import Link from 'next/link'
import { MapPin, ArrowRight, Zap, Trophy, Search, Star, CalendarDays } from 'lucide-react'

interface Court {
  id: number
  name: string
  description: string
  price_per_hour: number
  is_active: boolean
}

export default function Home() {
  const [courts, setCourts] = useState<Court[]>([])

  useEffect(() => {
    const fetchCourts = async () => {
      const { data } = await supabase.from('courts').select('*').order('id')
      if (data) setCourts(data as Court[])
    }
    fetchCourts()
  }, [])

  return (
    <div className="min-h-screen pb-20">
      
      {/* --- HERO SECTION (BANNER ĐẦU TRANG) --- */}
      <div className="relative bg-blue-700 text-white pt-20 pb-32 rounded-b-[3rem] shadow-2xl overflow-hidden">
        {/* Họa tiết trang trí nền */}
        <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-blue-500 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-purple-500 rounded-full blur-3xl opacity-50"></div>

        <div className="relative max-w-7xl mx-auto px-4 text-center z-10">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-1.5 rounded-full text-sm font-semibold mb-6 shadow-sm">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> 
                <span>Hệ thống sân cầu lông số #1</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 drop-shadow-md">
                CHUYÊN NGHIỆP & ĐẲNG CẤP<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-200"></span>
            </h1>
            
            <p className="text-blue-100 text-lg md:text-xl max-w-2xl mx-auto mb-8 font-light">
                Trải nghiệm sân thi đấu tiêu chuẩn quốc tế. Đặt lịch nhanh chóng, thanh toán tiện lợi chỉ trong 30 giây.
            </p>

            {/* Nút Tra Cứu To & Nổi Bật */}
            <div className="mt-8 flex justify-center gap-3 flex-wrap">
            <Link href="/tra-cuu">
                <button className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-6 py-3 rounded-full font-bold shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-all">
                    <Search className="w-4 h-4 text-blue-600"/> Tra cứu lịch
                </button>
            </Link>
            
            {/* NÚT GIẢI ĐẤU MỚI */}
            <Link href="/giai-dau">
                <button className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white border border-transparent px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-orange-200 hover:-translate-y-1 transition-all">
                    <Trophy className="w-4 h-4"/> Giải Đấu HOT
                </button>
            </Link>
        </div>
        </div>
      </div>

      {/* --- DANH SÁCH SÂN (NỔI LÊN TRÊN BANNER) --- */}
      <div className="max-w-7xl mx-auto px-4 -mt-20 relative z-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {courts.map((court) => (
            <div 
                key={court.id} 
                className="group bg-white rounded-3xl shadow-lg border border-white/50 overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col h-full"
            >
                {/* Hình ảnh minh họa */}
                <div className={`h-40 w-full relative flex items-center justify-center overflow-hidden
                    ${court.is_active ? 'bg-gradient-to-br from-blue-600 to-indigo-600' : 'bg-slate-200'}`}>
                    
                    {/* Vòng tròn trang trí */}
                    <div className="absolute top-[-50%] left-[-50%] w-full h-full bg-white opacity-10 rounded-full blur-2xl"></div>
                    
                    {court.is_active ? (
                        <div className="text-center">
                            <Zap className="w-12 h-12 text-yellow-300 mx-auto mb-2 drop-shadow-md animate-pulse" />
                            <span className="text-white font-bold text-sm tracking-widest uppercase bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">Sẵn sàng</span>
                        </div>
                    ) : (
                        <span className="text-slate-400 font-bold uppercase flex items-center gap-2">
                            <span className="w-2 h-2 bg-slate-400 rounded-full"></span> Bảo trì
                        </span>
                    )}
                </div>

                {/* Nội dung thẻ */}
                <div className="p-6 flex-1 flex flex-col">
                    <h2 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                        {court.name}
                    </h2>
                    
                    <p className="text-sm text-slate-500 mb-6 flex items-start gap-1.5 min-h-[40px] leading-relaxed">
                        <MapPin className="w-4 h-4 mt-0.5 text-blue-400 shrink-0" /> 
                        {court.description || 'Sân tiêu chuẩn, thảm xịn, ánh sáng tốt.'}
                    </p>

                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Giá thuê</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black text-slate-900">{court.price_per_hour.toLocaleString()}</span>
                                <span className="text-xs font-semibold text-slate-500">đ/h</span>
                            </div>
                        </div>
                        
                        <Link href={`/san/${court.id}`}>
                            <button className="h-12 w-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-blue-600 hover:scale-105 transition-all shadow-lg shadow-slate-300/50 group-hover:shadow-blue-500/30">
                                <ArrowRight className="w-6 h-6" />
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
            ))}
        </div>
        
        {/* Footer nhỏ */}
        <div className="text-center mt-12 text-slate-400 text-sm font-medium">
             © 2026 BadmintonPro System. Hệ thống đặt sân tự động.
        </div>
      </div>
    </div>
  )
}