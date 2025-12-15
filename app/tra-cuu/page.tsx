'use client'
import { useState } from 'react'
import { supabase } from '@/utils/supabase'
import { Search, Calendar, Clock, MapPin, Phone, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function SearchPage() {
  const [phone, setPhone] = useState('')
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false) // Đã bấm tìm hay chưa

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (phone.length < 10) return alert('Vui lòng nhập đúng số điện thoại!')
    
    setLoading(true)
    setSearched(true)
    
    // Tìm lịch sử đặt của SĐT này (sắp xếp ngày mới nhất lên đầu)
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('phone_number', phone)
      .order('date', { ascending: false }) // Ngày gần nhất lên trên
      .order('start_hour', { ascending: true })

    if (data) setBookings(data)
    else setBookings([])
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans">
      <div className="max-w-md mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-2 mb-8 mt-4">
            <Link href="/" className="bg-white p-2 rounded-full shadow-sm border border-slate-200 hover:bg-slate-100">
                <ArrowLeft className="w-5 h-5 text-slate-600"/>
            </Link>
            <h1 className="text-xl font-black text-slate-800 uppercase">Tra cứu lịch đặt</h1>
        </div>

        {/* Form tìm kiếm */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Nhập số điện thoại của bạn</label>
            <form onSubmit={handleSearch} className="relative">
                <Phone className="w-5 h-5 text-slate-400 absolute left-3 top-3.5"/>
                <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="VD: 0912345678"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                />
                <button 
                    disabled={loading}
                    className="w-full mt-3 bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-blue-700 transition flex justify-center items-center gap-2"
                >
                    {loading ? 'Đang tìm...' : <><Search className="w-4 h-4"/> Tìm Kiếm</>}
                </button>
            </form>
        </div>

        {/* Kết quả hiển thị */}
        {searched && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="font-bold text-slate-700 px-1">
                    Kết quả: {bookings.length} lịch đặt
                </h2>

                {bookings.length === 0 ? (
                    <div className="text-center py-10 opacity-50">
                        <Search className="w-12 h-12 mx-auto mb-2 text-slate-300"/>
                        <p>Không tìm thấy lịch đặt nào với SĐT này.</p>
                    </div>
                ) : (
                    bookings.map((item) => {
                        // Kiểm tra xem lịch này đã qua chưa
                        const isPast = new Date(item.date) < new Date(new Date().setHours(0,0,0,0))
                        
                        return (
                            <div key={item.id} className={`p-4 rounded-2xl border transition-all relative overflow-hidden
                                ${isPast 
                                    ? 'bg-slate-100 border-slate-200 opacity-70 grayscale' // Lịch cũ thì mờ đi
                                    : 'bg-white border-blue-100 shadow-sm' // Lịch sắp tới thì sáng
                                }`}>
                                
                                {/* Badge trạng thái */}
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border
                                        ${item.is_paid 
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                            : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                        {item.is_paid ? 'Đã Thanh Toán' : 'Chưa Thanh Toán'}
                                    </span>
                                    <span className="text-xs font-bold text-slate-400">#{item.id}</span>
                                </div>

                                {/* Thông tin chính */}
                                <div className="flex items-center gap-4 mb-3">
                                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold border
                                        ${isPast ? 'bg-slate-200 text-slate-500' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                        <span className="text-xs uppercase">Sân</span>
                                        <span className="text-lg leading-none">{item.court_id}</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                            {item.start_hour}h00 <span className="text-slate-300">➔</span> {item.end_hour}h00
                                        </h3>
                                        <p className="text-sm text-slate-500 font-medium flex items-center gap-1">
                                            <Calendar className="w-3 h-3"/> {item.date.split('-').reverse().join('/')}
                                        </p>
                                    </div>
                                </div>

                                {/* Chi tiết tiền */}
                                <div className="pt-3 border-t border-dashed border-slate-200 flex justify-between items-center">
                                    <p className="text-xs text-slate-400 font-bold uppercase">Tổng cộng</p>
                                    <p className={`font-black text-lg ${item.is_paid ? 'text-emerald-600' : 'text-slate-800'}`}>
                                        {(item.total_bill || ((item.end_hour - item.start_hour) * 50000)).toLocaleString()}đ
                                    </p>
                                </div>
                                
                                {/* Icon trang trí */}
                                {item.is_paid && (
                                    <CheckCircle className="absolute -bottom-4 -right-4 w-20 h-20 text-emerald-500/10 rotate-12"/>
                                )}
                            </div>
                        )
                    })
                )}
            </div>
        )}

      </div>
    </div>
  )
}