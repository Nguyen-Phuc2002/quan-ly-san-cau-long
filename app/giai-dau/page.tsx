'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import { ArrowLeft, Trophy, Calendar, Users, ChevronRight } from 'lucide-react'

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<any[]>([])

  useEffect(() => {
    const fetchTournaments = async () => {
      // Chỉ lấy các giải đang Active hoặc Sắp diễn ra
      const { data } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false })
      if (data) setTournaments(data)
    }
    fetchTournaments()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
            <Link href="/" className="bg-white p-2 rounded-full shadow-sm border hover:bg-slate-100"><ArrowLeft className="w-5 h-5 text-slate-600"/></Link>
            <h1 className="text-2xl font-black text-slate-800 uppercase flex items-center gap-2">
                <Trophy className="w-8 h-8 text-yellow-500"/> Các Giải Đấu Đang Mở
            </h1>
        </div>

        {/* Danh sách giải */}
        <div className="grid md:grid-cols-2 gap-6">
            {tournaments.map((tour) => (
                <Link key={tour.id} href={`/giai-dau/${tour.id}`}>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer group relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                            {tour.category || 'Giải đấu'}
                        </div>
                        
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
                                <Trophy className="w-8 h-8 text-blue-600"/>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition">{tour.name}</h2>
                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                    <Calendar className="w-3 h-3"/> Ngày tạo: {new Date(tour.created_at).toLocaleDateString('vi-VN')}
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                            <span className="text-sm font-bold text-slate-500 flex items-center gap-1">
                                <Users className="w-4 h-4"/> Xem chi tiết & Đăng ký
                            </span>
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
                                <ChevronRight className="w-5 h-5"/>
                            </div>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
      </div>
    </div>
  )
}