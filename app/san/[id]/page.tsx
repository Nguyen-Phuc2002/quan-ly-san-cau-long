'use client'
import { useEffect, useState, use } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import { 
  Calendar, User, Phone, CheckCircle, ArrowLeft, Clock, 
  MapPin, Wifi, Car, Zap, Info, ShieldCheck, ChevronRight 
} from 'lucide-react'
import { toast } from 'sonner'

// CẤU HÌNH GIỜ & GIÁ
const OPEN_HOUR = 5
const CLOSE_HOUR = 23
const PRICE_PER_HOUR = 60000 

export default function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const courtId = id 

  // --- STATE ---
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })

  const [customerName, setCustomerName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  
  const [startHour, setStartHour] = useState<number | null>(null)
  const [duration, setDuration] = useState<number>(1)
  const [busySlots, setBusySlots] = useState<number[]>([])
  const [loading, setLoading] = useState(false)

  const timeSlots = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i)

  // --- FETCH DATA & REALTIME (NÂNG CẤP) ---
  useEffect(() => {
    // 1. Hàm lấy dữ liệu
    const fetchBookings = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('start_hour, end_hour, status')
        .eq('court_id', courtId)
        .eq('date', date)
        .neq('status', 'cancelled') 

      let slots: number[] = []
      if (data) {
        data.forEach((b: any) => {
          for (let i = b.start_hour; i < b.end_hour; i++) {
            slots.push(i)
          }
        })
      }
      setBusySlots(slots)
      
      // Nếu giờ đang chọn bị người khác đặt mất -> Reset
      if (startHour && slots.includes(startHour)) {
          setStartHour(null)
          toast.warning('Khung giờ này vừa có người đặt mất rồi!')
      }
    }

    fetchBookings()

    // 2. Kích hoạt REALTIME (Lắng nghe thay đổi)
    const channel = supabase
      .channel(`room_court_${courtId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'bookings',
        filter: `court_id=eq.${courtId}` // Chỉ nghe tin của sân này
      }, (payload) => {
        // Có thay đổi (Thêm/Xóa/Sửa) -> Tải lại dữ liệu ngay
        console.log('Realtime update:', payload)
        fetchBookings()
      })
      .subscribe()

    // Dọn dẹp khi thoát
    return () => {
      supabase.removeChannel(channel)
    }
  }, [courtId, date, startHour]) // Thêm startHour vào dependency để check reset

  // --- LOGIC ---
  const isTimeRangeValid = (start: number | null, dur: number) => {
    if (!start) return false
    for (let i = 0; i < dur; i++) {
      const checkingHour = start + i
      if (busySlots.includes(checkingHour)) return false
      if (checkingHour >= CLOSE_HOUR) return false
    }
    return true
  }

  const estimatedPrice = () => {
    if (!startHour) return 0
    return duration * PRICE_PER_HOUR
  }

  const handleBooking = async () => {
    if (!customerName || !startHour) return toast.error('Vui lòng chọn giờ và điền tên!')
    if (phoneNumber.length < 10) return toast.error('Số điện thoại không hợp lệ')
    if (!isTimeRangeValid(startHour, duration)) return toast.error('Khung giờ này bị trùng hoặc quá giờ!')

    setLoading(true)
    const { error } = await supabase.from('bookings').insert({
      court_id: courtId,
      customer_name: customerName,
      phone_number: phoneNumber,
      date: date,
      start_hour: startHour,
      end_hour: startHour + duration,
      is_paid: false,
      total_bill: estimatedPrice(),
      status: 'confirmed'
    })

    // Xử lý lỗi Database trả về (Ví dụ lỗi trùng sân do Constraint)
    if (error) {
        if (error.code === '23P01') { // Mã lỗi của Exclusion Constraint
            toast.error('Ouch! Có người vừa nhanh tay đặt giờ này rồi. Vui lòng chọn giờ khác.')
            // Tải lại dữ liệu để hiện ô màu xám
            const { data } = await supabase.from('bookings').select('start_hour, end_hour').eq('court_id', courtId).eq('date', date).neq('status', 'cancelled')
            // ... logic update lại slots (đã có ở realtime nhưng làm thêm cho chắc)
        } else {
            toast.error(error.message)
        }
    } else {
      toast.success('Đặt sân thành công!', {
        description: `Sân ${courtId} | ${startHour}h - ${startHour + duration}h | Tổng: ${estimatedPrice().toLocaleString()}đ`,
        duration: 5000,
      })
      router.push('/tra-cuu')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center text-slate-500 hover:text-blue-600 mb-6 transition font-bold text-sm group">
            <div className="bg-white p-2 rounded-full border border-slate-200 shadow-sm group-hover:shadow-md mr-2 transition">
                <ArrowLeft className="w-4 h-4" />
            </div>
            Quay lại danh sách
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden h-64 flex flex-col justify-end">
                    <div className="absolute top-0 right-0 p-10 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
                    <div className="relative z-10">
                        <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 inline-block">Sân Tiêu Chuẩn</span>
                        <h1 className="text-4xl font-black mb-1">SÂN SỐ {courtId}</h1>
                        <p className="text-blue-100 flex items-center gap-1 text-sm"><MapPin className="w-4 h-4"/> Khu vực A - Thảm Yonex</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Info className="w-5 h-5 text-blue-500"/> Tiện ích sân</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><Wifi className="w-5 h-5 text-slate-500"/> <span className="text-sm font-medium text-slate-700">Wifi Free</span></div>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><Car className="w-5 h-5 text-slate-500"/> <span className="text-sm font-medium text-slate-700">Bãi xe rộng</span></div>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><Zap className="w-5 h-5 text-slate-500"/> <span className="text-sm font-medium text-slate-700">Đèn LED chuẩn</span></div>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><ShieldCheck className="w-5 h-5 text-slate-500"/> <span className="text-sm font-medium text-slate-700">An ninh 24/7</span></div>
                    </div>
                </div>
                
                <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100">
                    <h3 className="font-bold text-orange-800 mb-2">Bảng giá niêm yết</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center border-b border-orange-200 pb-2">
                            <span className="text-orange-600">Đồng giá các khung giờ</span>
                            <span className="font-bold text-orange-800 text-lg">{PRICE_PER_HOUR.toLocaleString()}đ/h</span>
                        </div>
                        <p className="text-xs text-orange-500 pt-1 italic">* Giá áp dụng cho tất cả các ngày trong tuần</p>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-2">
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100">
                    <div className="mb-8">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">1. Chọn ngày thi đấu</label>
                        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                            {next7Days.map((d) => {
                                const isSelected = date === d
                                const dayName = new Date(d).toLocaleDateString('vi-VN', { weekday: 'short' })
                                const dayNum = d.split('-')[2]
                                return (
                                    <button key={d} onClick={() => setDate(d)}
                                        className={`flex-shrink-0 w-20 h-24 rounded-2xl flex flex-col items-center justify-center border-2 transition-all
                                        ${isSelected ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md transform scale-105' : 'border-slate-100 bg-white text-slate-500 hover:border-blue-200'}`}>
                                        <span className="text-xs font-medium uppercase">{dayName}</span>
                                        <span className="text-2xl font-black">{dayNum}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 mb-8">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">2. Bạn đánh mấy tiếng?</label>
                            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                                {[1, 2, 3].map((h) => (
                                    <button key={h} onClick={() => setDuration(h)}
                                        className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all
                                        ${duration === h ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                        {h} Tiếng
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">3. Chọn giờ bắt đầu</label>
                            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                {timeSlots.map((hour) => {
                                    const isBooked = busySlots.includes(hour)
                                    const isSelected = startHour === hour
                                    const isValid = isTimeRangeValid(hour, duration)
                                    return (
                                        <button key={hour} disabled={!isValid && !isSelected} onClick={() => setStartHour(hour)}
                                            className={`py-2 rounded-lg text-sm font-bold border transition-all relative
                                            ${isBooked 
                                                ? 'bg-slate-100 text-slate-300 border-transparent cursor-not-allowed decoration-slate-300 line-through' 
                                                : isSelected 
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-200' 
                                                    : !isValid
                                                        ? 'opacity-50 cursor-not-allowed border-slate-100'
                                                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-500 hover:text-blue-600'
                                            }`}>
                                            {hour}h
                                        </button>
                                    )
                                })}
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-[10px] uppercase font-bold text-slate-400">
                                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-white border border-slate-300 rounded-full"></div> Trống</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-slate-200 rounded-full"></div> Đã đặt</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-600 rounded-full"></div> Đang chọn</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 md:p-8 rounded-2xl border border-slate-200">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 block">4. Thông tin người đặt</label>
                        <div className="grid md:grid-cols-2 gap-4 mb-6">
                            <div className="flex items-center bg-white px-4 py-3 rounded-xl border border-slate-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition">
                                <User className="w-5 h-5 text-slate-400 mr-3" />
                                <input type="text" placeholder="Tên của bạn..." value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="bg-transparent w-full outline-none text-slate-800 font-bold" />
                            </div>
                            <div className="flex items-center bg-white px-4 py-3 rounded-xl border border-slate-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition">
                                <Phone className="w-5 h-5 text-slate-400 mr-3" />
                                <input type="tel" maxLength={10} placeholder="Số điện thoại..." value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))} className="bg-transparent w-full outline-none text-slate-800 font-bold" />
                            </div>
                        </div>

                        {startHour && (
                            <div className="flex justify-between items-center mb-6 p-4 bg-white border border-blue-100 rounded-xl shadow-sm">
                                <div><p className="text-xs text-slate-500 font-bold uppercase">Tổng tiền sân</p><p className="text-xs text-slate-400">{startHour}h - {startHour + duration}h • {date.split('-').reverse().join('/')}</p></div>
                                <div className="text-right"><p className="text-2xl font-black text-blue-600">{estimatedPrice().toLocaleString()}đ</p></div>
                            </div>
                        )}

                        <button onClick={handleBooking} disabled={loading || !startHour || !customerName || phoneNumber.length < 10}
                            className={`w-full py-4 rounded-xl font-black text-lg shadow-xl transition-all flex justify-center items-center gap-2 group
                            ${loading || !startHour || !customerName || phoneNumber.length < 10 ? 'bg-slate-300 text-white cursor-not-allowed shadow-none' : 'bg-slate-900 text-white hover:bg-blue-600 hover:shadow-blue-500/30 hover:scale-[1.01]'}`}>
                            {loading ? 'Đang xử lý...' : (<>Xác Nhận Đặt Sân <ChevronRight className="w-5 h-5 opacity-50 group-hover:translate-x-1 transition-transform"/></>)}
                        </button>
                        <p className="text-center text-xs text-slate-400 mt-4">Bằng việc đặt sân, bạn đồng ý với quy định của sân cầu lông.</p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}