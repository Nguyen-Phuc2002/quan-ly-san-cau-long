'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import { 
  Check, Trash2, X, Printer, ShoppingBag, Plus, Minus, DollarSign, 
  TrendingUp, ArrowLeft, Clock, User, LogOut, QrCode, Save, Settings, 
  Edit, XCircle, CalendarDays, CreditCard, UserX, FileSpreadsheet, 
  Wallet, PieChart as PieIcon, BarChart3, TrendingDown, ArrowUpRight, 
  LayoutDashboard, Users, Package, Menu, Search, ChevronLeft, ChevronRight, UserCheck 
} from 'lucide-react'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell } from 'recharts'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

// --- CẤU HÌNH ---
const COURTS = [1, 2, 3, 4]
const BANK_ID = 'MB'           
const ACCOUNT_NO = '0945915615'
const ACCOUNT_NAME = 'CHU SAN'  
const TEMPLATE = 'compact'      

const CATEGORIES = [
    { id: 'drink', name: 'Nước giải khát' },
    { id: 'food', name: 'Đồ ăn nhẹ' },
    { id: 'shuttlecock', name: 'Cầu & Dụng cụ' },
    { id: 'other', name: 'Khác' },
]

const EXPENSE_CATS = [
    { id: 'utilities', name: 'Điện / Nước / Mạng' },
    { id: 'import', name: 'Nhập hàng' },
    { id: 'salary', name: 'Lương nhân viên' },
    { id: 'maintenance', name: 'Bảo trì' },
    { id: 'marketing', name: 'Marketing' },
    { id: 'rent', name: 'Tiền thuê nhà' },
    { id: 'other', name: 'Khác' },
]

export default function AdminPage() {
  const router = useRouter()
  // UI State
  const [activeTab, setActiveTab] = useState('schedule') 
  const [isSidebarOpen, setSidebarOpen] = useState(true)
  const [searchTerm, setSearchTerm] = useState('') 
  
  // Data State
  const [role, setRole] = useState<string>('staff')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [bookings, setBookings] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [courts, setCourts] = useState<any[]>([]) 
  const [pricePerHour, setPricePerHour] = useState(60000) 

  // Modal & Logic State
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [cart, setCart] = useState<any[]>([]) 
  const [showFixedModal, setShowFixedModal] = useState(false)
  
  // Settings
  const [tempPrice, setTempPrice] = useState(0) 
  const [prodName, setProdName] = useState('')
  const [prodPrice, setProdPrice] = useState('')
  const [prodStock, setProdStock] = useState('') 
  const [prodCategory, setProdCategory] = useState('drink')
  const [editingId, setEditingId] = useState<number | null>(null)

  // Fixed Schedule
  const [fixedName, setFixedName] = useState('')
  const [fixedPhone, setFixedPhone] = useState('')
  const [fixedCourt, setFixedCourt] = useState(1)
  const [fixedStartHour, setFixedStartHour] = useState(17)
  const [fixedDuration, setFixedDuration] = useState(2)
  const [fixedStartDate, setFixedStartDate] = useState(new Date().toISOString().split('T')[0])
  const [fixedEndDate, setFixedEndDate] = useState('')
  const [fixedDays, setFixedDays] = useState<number[]>([])
  const [fixedTotalPrice, setFixedTotalPrice] = useState(3000000) 
  const [totalSessions, setTotalSessions] = useState(0)

  // Finance Report
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().substring(0, 7))
  const [expenseName, setExpenseName] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCat, setExpenseCat] = useState('utilities')
  const [revenueData, setRevenueData] = useState<any>({ total: 0, service: 0, court: 0, dailyChart: [], pieChart: [] })

  // --- AUTH ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      setRole(profile ? profile.role : 'staff') 
    }
    checkUser()
  }, [])

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  // --- FETCH DATA ---
  const fetchData = async () => {
    const { data: bookingData } = await supabase.from('bookings').select('*').eq('date', date)
    if (bookingData) setBookings(bookingData)

    const { data: productData } = await supabase.from('products').select('*').order('category')
    if (productData) setProducts(productData)

    const { data: courtData } = await supabase.from('courts').select('*').order('id')
    if (courtData && courtData.length > 0) {
        setCourts(courtData)
        setPricePerHour(courtData[0].price_per_hour)
        setTempPrice(courtData[0].price_per_hour)
    }
  }

  // === 🎯 REALTIME UPDATE (MỚI THÊM VÀO) ===
  useEffect(() => {
    // 1. Gọi dữ liệu lần đầu
    fetchData()

    // 2. Đăng ký lắng nghe thay đổi
    const channel = supabase
      .channel('admin_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        // Có ai đó đặt/hủy/sửa -> Gọi lại fetchData ngay
        fetchData()
      })
      .subscribe()

    // 3. Dọn dẹp
    return () => { supabase.removeChannel(channel) }
  }, [date]) // Khi ngày thay đổi -> Chạy lại từ đầu


  // --- REPORT DATA ---
  const fetchReportData = async () => {
    const { data: expData } = await supabase.from('expenses').select('*').ilike('date', `${reportMonth}%`).order('date', { ascending: false })
    if (expData) setExpenses(expData)

    const { data: incomeData } = await supabase.from('bookings').select('*').ilike('date', `${reportMonth}%`).eq('is_paid', true)
    
    let total = 0, service = 0, court = 0
    const dailyMap: Record<string, number> = {}

    if (incomeData) {
        incomeData.forEach(b => {
            const billTotal = (b.total_bill || 0)
            total += billTotal
            let billService = 0
            if (b.services_detail && Array.isArray(b.services_detail)) {
                b.services_detail.forEach((item: any) => billService += (item.price * item.qty))
            }
            service += billService
            court += (billTotal - billService)
            const day = b.date.split('-')[2]
            dailyMap[day] = (dailyMap[day] || 0) + billTotal
        })
    }

    const daysInMonth = new Date(Number(reportMonth.split('-')[0]), Number(reportMonth.split('-')[1]), 0).getDate()
    const dailyChart = Array.from({ length: daysInMonth }, (_, i) => {
        const d = (i + 1).toString().padStart(2, '0')
        return { day: d, revenue: dailyMap[d] || 0 }
    })

    setRevenueData({ 
        total, service, court, dailyChart,
        pieChart: [{ name: 'Sân', value: court, color: '#3b82f6' }, { name: 'Dịch Vụ', value: service, color: '#f97316' }]
    })
  }
  useEffect(() => { if (activeTab === 'finance') fetchReportData() }, [activeTab, reportMonth])

  // --- CRM DATA ---
  const customerList = useMemo(() => {
    if (activeTab !== 'crm') return []
    const customers: any = {}
    bookings.forEach(b => {
        if (!b.phone_number) return
        if (!customers[b.phone_number]) {
            customers[b.phone_number] = { 
                phone: b.phone_number, name: b.customer_name, 
                visits: 0, totalSpent: 0, lastVisit: b.date 
            }
        }
        customers[b.phone_number].visits += 1
        if(b.is_paid) customers[b.phone_number].totalSpent += (b.total_bill || 0)
        if(b.date > customers[b.phone_number].lastVisit) customers[b.phone_number].lastVisit = b.date
    })
    return Object.values(customers).sort((a:any, b:any) => b.totalSpent - a.totalSpent)
  }, [bookings, activeTab])

  // --- BOOKING LOGIC ---
  const handleSelectBooking = (booking: any) => { setSelectedBooking(booking); setCart(booking.services_detail || []) }
  const closeInvoice = () => { setSelectedBooking(null); setCart([]) }
  
  const addToCart = (product: any) => {
    if (product.stock !== null && product.stock <= 0) return toast.error(`Hết hàng! Kho còn: ${product.stock}`)
    const existing = cart.find(item => item.id === product.id)
    if (existing) {
        if (product.stock !== null && existing.qty >= product.stock) return toast.error('Không đủ số lượng trong kho')
        setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item))
    } else {
        setCart([...cart, { ...product, qty: 1 }])
    }
  }
  
  const removeFromCart = (productId: number) => {
    const existing = cart.find(item => item.id === productId)
    if (existing?.qty === 1) setCart(cart.filter(item => item.id !== productId))
    else setCart(cart.map(item => item.id === productId ? { ...item, qty: item.qty - 1 } : item))
  }

  const calculateTotal = () => {
    if (!selectedBooking) return 0
    if (selectedBooking.total_bill && selectedBooking.total_bill > 0 && selectedBooking.group_id) {
       const serviceFee = cart.reduce((sum, item) => sum + (item.price * item.qty), 0)
       return selectedBooking.total_bill + serviceFee 
    }
    const hours = selectedBooking.end_hour - selectedBooking.start_hour
    const courtFee = hours * pricePerHour
    const serviceFee = cart.reduce((sum, item) => sum + (item.price * item.qty), 0)
    return courtFee + serviceFee
  }

  const handleUpdateOrder = async () => {
    if (!selectedBooking) return
    const total = calculateTotal()
    await supabase.from('bookings').update({ total_bill: total, services_detail: cart }).eq('id', selectedBooking.id)
    toast.success('Đã lưu món!')
    fetchData()
  }

  const handleCheckout = async () => {
    if (!selectedBooking) return
    const total = calculateTotal()
    for (const item of cart) {
        const product = products.find(p => p.id === item.id)
        if (product && product.stock !== null) {
            await supabase.from('products').update({ stock: product.stock - item.qty }).eq('id', item.id)
        }
    }
    await supabase.from('bookings').update({ is_paid: true, total_bill: total, services_detail: cart, status: 'confirmed' }).eq('id', selectedBooking.id)
    toast.success('Thanh toán thành công!', { description: `Đã thu ${total.toLocaleString()}đ` })
    fetchData()
  }

  // --- ACTIONS ---
  const handleDelete = async (id: number) => {
    if (role !== 'admin') return toast.error('Chỉ Admin mới có quyền xóa!')
    if(confirm('Xóa VĨNH VIỄN lịch này?')) {
        await supabase.from('bookings').delete().eq('id', id); toast.info('Đã xóa'); setSelectedBooking(null); fetchData()
    }
  }
  const handleDeleteGroup = async (groupId: string) => {
    if (role !== 'admin') return toast.error('Chỉ Admin mới có quyền xóa nhóm!')
    if(confirm('Xóa TOÀN BỘ lịch cố định của nhóm này?')) {
        await supabase.from('bookings').delete().eq('group_id', groupId); toast.success('Đã xóa nhóm lịch'); setSelectedBooking(null); fetchData()
    }
  }
  const handleCancelSession = async () => {
    if(!selectedBooking) return
    if(confirm(`Xác nhận đội ${selectedBooking.customer_name} VẮNG hôm nay?`)) {
        await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', selectedBooking.id)
        toast.warning('Đã báo vắng!'); setSelectedBooking(null); fetchData()
    }
  }
  
  const handleCheckIn = async () => {
    if(!selectedBooking) return
    await supabase.from('bookings').update({ is_checked_in: true }).eq('id', selectedBooking.id)
    toast.success('Đã Check-in khách vào sân!'); fetchData()
  }

  // --- SETTINGS ---
  const updateCourtPrice = async () => {
    const { error } = await supabase.from('courts').update({ price_per_hour: Number(tempPrice) }).gt('id', 0)
    if (!error) { toast.success('Cập nhật giá thành công'); fetchData() }
  }
  const handleSaveProduct = async () => {
    const payload = { name: prodName, price: Number(prodPrice), category: prodCategory, stock: Number(prodStock) }
    if (editingId) await supabase.from('products').update(payload).eq('id', editingId)
    else await supabase.from('products').insert(payload)
    toast.success('Đã lưu món'); setEditingId(null); setProdName(''); setProdPrice(''); setProdStock(''); fetchData()
  }
  const startEdit = (p: any) => { setEditingId(p.id); setProdName(p.name); setProdPrice(p.price); setProdCategory(p.category || 'drink'); setProdStock(p.stock) }
  const cancelEdit = () => { setEditingId(null); setProdName(''); setProdPrice(''); setProdStock(''); setProdCategory('drink') }
  const deleteProduct = async (id: number) => { if(confirm('Xóa?')) { await supabase.from('products').delete().eq('id', id); fetchData() } }

  // --- FIXED SCHEDULE ---
  const setQuickDuration = (months: number) => {
    const start = new Date(fixedStartDate); const end = new Date(start)
    end.setDate(end.getDate() + (months * 30) - 1)
    setFixedEndDate(end.toISOString().split('T')[0]); setFixedTotalPrice(3000000 * months)
  }
  useEffect(() => {
    if (!fixedStartDate || !fixedEndDate || fixedDays.length === 0) { setTotalSessions(0); return }
    let sessions = 0; let current = new Date(fixedStartDate); const end = new Date(fixedEndDate)
    while (current <= end) { if (fixedDays.includes(current.getDay())) sessions++; current.setDate(current.getDate() + 1) }
    setTotalSessions(sessions)
  }, [fixedStartDate, fixedEndDate, fixedDays])
  const toggleDay = (d: number) => { fixedDays.includes(d) ? setFixedDays(fixedDays.filter(i=>i!==d)) : setFixedDays([...fixedDays, d]) }
  const handleFixedBooking = async (payNow: boolean = false) => {
    const dates: string[] = []; let current = new Date(fixedStartDate); const end = new Date(fixedEndDate)
    while (current <= end) { if (fixedDays.includes(current.getDay())) dates.push(current.toISOString().split('T')[0]); current.setDate(current.getDate() + 1) }
    const { data: existing } = await supabase.from('bookings').select('*').eq('court_id', fixedCourt).eq('status', 'confirmed').in('date', dates)
    const conflicts: string[] = []; const valids: any[] = []; const bill = payNow ? Math.round(fixedTotalPrice / dates.length) : 0
    dates.forEach(d => {
        if (existing?.some((b: any) => b.date === d && (fixedStartHour < b.end_hour && b.start_hour < fixedStartHour + fixedDuration))) conflicts.push(d)
        else valids.push({ court_id: fixedCourt, customer_name: fixedName, phone_number: fixedPhone, date: d, start_hour: fixedStartHour, end_hour: fixedStartHour + fixedDuration, is_paid: payNow, total_bill: bill, group_id: `${Date.now()}_fixed`, status: 'confirmed' })
    })
    if (conflicts.length > 0) return toast.error(`Trùng lịch: ${conflicts.join(', ')}`)
    await supabase.from('bookings').insert(valids); toast.success(`Đã tạo ${valids.length} buổi!`); setShowFixedModal(false); fetchData()
  }

  // --- FINANCE REPORT ---
  const handleAddExpense = async () => {
    if (!expenseName || !expenseAmount) return toast.error('Nhập đủ thông tin!')
    await supabase.from('expenses').insert({ title: expenseName, amount: Number(expenseAmount), date: new Date().toISOString().split('T')[0], category: expenseCat })
    toast.success('Đã thêm chi phí'); setExpenseName(''); setExpenseAmount(''); fetchReportData()
  }
  const handleDeleteExpense = async (id: number) => { if(confirm('Xóa?')) { await supabase.from('expenses').delete().eq('id', id); fetchReportData() } }
  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0)
  const netProfit = revenueData.total - totalExpense

  // --- XUẤT EXCEL ---
  const handleExportExcel = async () => {
    const currentMonth = date.substring(0, 7)
    toast.loading('Đang tải dữ liệu...')
    const { data: monthData } = await supabase.from('bookings').select('*').ilike('date', `${currentMonth}%`).order('date')
    if (!monthData || monthData.length === 0) { toast.dismiss(); return toast.warning('Không có dữ liệu') }
    const excelData = monthData.map(b => ({
        'Ngày': b.date, 'Giờ': `${b.start_hour}h-${b.end_hour}h`, 'Sân': b.court_id, 'Khách': b.customer_name,
        'Tổng tiền': b.total_bill, 'Trạng thái': b.is_paid ? 'Đã thu' : 'Chưa thu'
    }))
    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, `Tháng ${currentMonth}`)
    XLSX.writeFile(wb, `DoanhThu_${currentMonth}.xlsx`); toast.dismiss(); toast.success('Đã tải file!')
  }

  // --- UTILS ---
  const changeDate = (days: number) => {
    const currentDate = new Date(date)
    currentDate.setDate(currentDate.getDate() + days)
    setDate(currentDate.toISOString().split('T')[0])
  }
  const setToday = () => setDate(new Date().toISOString().split('T')[0])

  const getBookingForSlot = (courtId: number, hour: number) => {
    const slotBookings = bookings.filter(b => b.court_id === courtId && hour >= b.start_hour && hour < b.end_hour)
    if (searchTerm) {
        return slotBookings.find(b => b.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) || (b.phone_number && b.phone_number.includes(searchTerm)))
    }
    return slotBookings.find(b => b.status === 'confirmed') || slotBookings.find(b => b.status === 'cancelled')
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <div className={`bg-slate-900 text-white flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-4 flex items-center gap-3 border-b border-slate-800 h-16">
            <div className="bg-blue-600 p-2 rounded-lg"><LayoutDashboard className="w-5 h-5"/></div>
            {isSidebarOpen && <h1 className="font-black text-lg tracking-tight">BADMINTON<span className="text-blue-500">PRO</span></h1>}
        </div>
        <div className="flex-1 py-6 space-y-2 px-3">
            {[
                { id: 'schedule', label: 'Sơ đồ sân', icon: <CalendarDays className="w-5 h-5"/> },
                { id: 'crm', label: 'Khách hàng', icon: <Users className="w-5 h-5"/> },
                { id: 'finance', label: 'Tài chính', icon: <Wallet className="w-5 h-5"/> },
                { id: 'settings', label: 'Cài đặt & Kho', icon: <Package className="w-5 h-5"/> },
            ].map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all
                    ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    {item.icon}
                    {isSidebarOpen && <span className="font-bold text-sm">{item.label}</span>}
                </button>
            ))}
        </div>
        <div className="p-4 border-t border-slate-800">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition">
                <LogOut className="w-5 h-5"/>
                {isSidebarOpen && <span className="font-bold text-sm">Đăng xuất</span>}
            </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* SCHEDULE TAB */}
        {activeTab === 'schedule' && (
            <div className="flex h-full">
                {/* Lưới Sân */}
                <div className="flex-1 flex flex-col border-r border-slate-200">
                    <div className="h-16 bg-white border-b border-slate-200 flex justify-between items-center px-6 shadow-sm">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg"><Menu className="w-5 h-5 text-slate-600"/></button>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400"/>
                                <input type="text" placeholder="Tìm tên khách..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 bg-slate-100 rounded-full text-sm font-medium border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 w-64 transition-all"/>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition"><ChevronLeft className="w-4 h-4 text-slate-600"/></button>
                            <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="bg-transparent outline-none text-slate-800 font-bold text-sm mx-2" />
                            <button onClick={() => setToday()} className="text-xs font-bold text-blue-600 hover:underline px-2">Hôm nay</button>
                            <button onClick={() => changeDate(1)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition"><ChevronRight className="w-4 h-4 text-slate-600"/></button>
                        </div>
                        <button onClick={() => setShowFixedModal(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-200"><CalendarDays className="w-4 h-4"/> Đặt lịch tháng</button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
                        <div className="grid grid-cols-2 xl:grid-cols-4 gap-6 pb-20">
                            {courts.map(court => (
                                <div key={court.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden min-h-[400px]">
                                    <div className="p-4 bg-slate-50 border-b border-slate-200 text-center font-black text-slate-700 text-lg uppercase tracking-wide">{court.name}</div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                        {Array.from({length: 18}, (_, i) => i + 5).map(hour => {
                                            const booking = getBookingForSlot(court.id, hour)
                                            if (!booking) return <div key={hour} className="h-12 border-b border-slate-50 flex items-center justify-center text-[10px] text-slate-300 hover:bg-slate-50">{hour}h</div>
                                            if (booking.start_hour !== hour) return null
                                            const isSelected = selectedBooking?.id === booking.id
                                            const duration = booking.end_hour - booking.start_hour
                                            const isCancelled = booking.status === 'cancelled'
                                            return (
                                                <div key={booking.id} style={{ height: `${duration * 48}px` }} onClick={() => handleSelectBooking(booking)}
                                                    className={`m-1 rounded-xl border cursor-pointer relative group flex flex-col justify-center px-3 shadow-sm transition-all hover:scale-[1.02]
                                                    ${isCancelled ? 'bg-slate-100 border-slate-200 opacity-60 grayscale' : isSelected ? 'bg-blue-600 border-blue-600 text-white ring-2 ring-offset-2 ring-blue-500' : booking.is_paid ? (booking.group_id ? 'bg-purple-50 border-purple-200' : 'bg-emerald-50 border-emerald-200') : 'bg-white border-l-4 border-l-blue-500 border-y border-r border-slate-200'}`}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <span className={`font-bold text-xs ${isCancelled ? 'line-through text-slate-400' : isSelected ? 'text-white' : booking.is_paid ? 'text-emerald-700' : 'text-blue-700'}`}>{booking.start_hour}h - {booking.end_hour}h</span>
                                                        <div className="flex items-center gap-1">
                                                            {booking.is_checked_in && <UserCheck className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-blue-500'}`}/>}
                                                            {!isCancelled && booking.is_paid && <Check className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-emerald-600'}`}/>}
                                                        </div>
                                                    </div>
                                                    <p className={`font-bold text-sm truncate ${isCancelled ? 'text-slate-400' : isSelected ? 'text-white' : 'text-slate-800'}`}>{booking.customer_name}</p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar Phải: Hóa Đơn */}
                <div className={`w-[400px] bg-white border-l border-slate-200 flex flex-col transition-all ${!selectedBooking ? 'translate-x-full w-0' : 'translate-x-0'}`}>
                    {selectedBooking && (
                        <>
                            <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-slate-50">
                                <h3 className="font-black text-slate-800 uppercase">{selectedBooking.status === 'cancelled' ? 'LỊCH ĐÃ HỦY' : 'THANH TOÁN'}</h3>
                                <button onClick={closeInvoice} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-5 h-5 text-slate-500"/></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6">
                                {selectedBooking.status === 'cancelled' ? (
                                    <div className="bg-slate-100 p-6 rounded-xl text-center border-2 border-dashed border-slate-300">
                                        <UserX className="w-12 h-12 text-slate-400 mx-auto mb-2"/>
                                        <h3 className="font-bold text-slate-700">Khách báo vắng</h3>
                                        <p className="text-sm text-slate-500 mb-4">Slot này trống, có thể đặt đè.</p>
                                        {role === 'admin' && <button onClick={() => handleDelete(selectedBooking.id)} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold">Xóa lịch sử</button>}
                                    </div>
                                ) : (
                                    <>
                                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-6 relative">
                                            <button onClick={handleCheckIn} className={`absolute top-4 right-4 p-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${selectedBooking.is_checked_in ? 'bg-emerald-100 text-emerald-700 pointer-events-none' : 'bg-white border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white shadow-sm'}`}>
                                                {selectedBooking.is_checked_in ? <><UserCheck className="w-3 h-3"/> Đã đến</> : 'Check-in'}
                                            </button>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold"><User className="w-5 h-5"/></div>
                                                <div><p className="font-bold text-slate-800">{selectedBooking.customer_name}</p><p className="text-xs text-slate-500">{selectedBooking.phone_number}</p></div>
                                            </div>
                                            <div className="flex justify-between text-sm py-2 border-t border-blue-200/50"><span className="text-slate-500">Sân {selectedBooking.court_id}</span><span className="font-bold text-slate-800">{selectedBooking.start_hour}h - {selectedBooking.end_hour}h</span></div>
                                        </div>

                                        <div className="space-y-4 mb-6">
                                            <div className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <div className="flex flex-col"><span className="text-slate-500">Tiền sân</span>{selectedBooking.group_id && selectedBooking.is_paid && <span className="text-[10px] text-purple-600 font-bold">(Đã đóng tháng)</span>}</div>
                                                <span className="font-bold text-slate-800">{selectedBooking.group_id && selectedBooking.is_paid ? '0đ' : ((selectedBooking.end_hour - selectedBooking.start_hour) * pricePerHour).toLocaleString() + 'đ'}</span>
                                            </div>
                                            {cart.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-sm group">
                                                    <div><p className="font-medium text-slate-700">{item.name}</p><p className="text-[10px] text-slate-400">{item.price.toLocaleString()} x {item.qty}</p></div>
                                                    <div className="flex items-center gap-2"><button onClick={() => removeFromCart(item.id)} className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-500 hover:text-red-500"><Minus className="w-3 h-3"/></button><span className="font-bold text-xs w-4 text-center">{item.qty}</span><button onClick={() => addToCart(item)} className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-500 hover:text-blue-500"><Plus className="w-3 h-3"/></button></div>
                                                    <p className="font-bold text-slate-800">{(item.price * item.qty).toLocaleString()}đ</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="border-t border-slate-200 pt-4">
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-3">Thêm dịch vụ</p>
                                            <div className="space-y-4">
                                                {CATEGORIES.map(cat => {
                                                    const items = products.filter(p => p.category === cat.id || (!p.category && cat.id === 'drink'))
                                                    if(!items.length) return null
                                                    return (
                                                        <div key={cat.id}>
                                                            <p className="text-[10px] font-bold text-blue-600 mb-2">{cat.name}</p>
                                                            <div className="grid grid-cols-2 gap-2">{items.map(p => (<button key={p.id} onClick={() => addToCart(p)} className="text-left p-2 border border-slate-200 rounded-lg hover:border-blue-500 transition relative overflow-hidden"><p className="text-xs font-bold text-slate-700 truncate">{p.name}</p><div className="flex justify-between items-end mt-1"><span className="text-[10px] text-slate-500">{p.price.toLocaleString()}</span>{p.stock !== null && <span className={`text-[9px] px-1 rounded ${p.stock < 5 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>Kho: {p.stock}</span>}</div></button>))}</div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    
                                        <div className="mt-4 p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-3">
                                            <img src={`https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-${TEMPLATE}.png?amount=${calculateTotal()}&addInfo=SAN ${selectedBooking.court_id} ${selectedBooking.customer_name}&accountName=${ACCOUNT_NAME}`} alt="QR" className="w-16 h-16 rounded-lg border border-slate-100"/>
                                            <div className="flex-1 overflow-hidden"><p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><QrCode className="w-3 h-3"/> Quét mã MBBANK</p><p className="text-xs text-slate-500 truncate">{ACCOUNT_NO}</p><p className="text-blue-600 font-black text-lg mt-0.5">{calculateTotal().toLocaleString()}đ</p></div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {selectedBooking.status !== 'cancelled' && (
                                <div className="p-6 border-t border-slate-200 bg-slate-50">
                                    <div className="flex justify-between items-end mb-4"><span className="text-sm text-slate-500 font-bold">Tổng cộng</span><span className="text-3xl font-black text-blue-600">{calculateTotal().toLocaleString()}đ</span></div>
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        {selectedBooking.group_id && role === 'admin' && <button onClick={() => handleDeleteGroup(selectedBooking.group_id)} className="py-3 rounded-xl border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50">Xóa Nhóm</button>}
                                        <button onClick={handleCancelSession} className="py-3 rounded-xl border border-orange-200 text-orange-600 text-xs font-bold hover:bg-orange-50">Báo Vắng</button>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={handleUpdateOrder} className="flex-1 bg-white border border-slate-300 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50">Lưu</button>
                                        <button onClick={handleCheckout} className="flex-[2] bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-blue-600 shadow-lg flex justify-center items-center gap-2"><Printer className="w-4 h-4"/> Thu Tiền</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        )}

        {/* ... (GIỮ NGUYÊN CÁC TAB KHÁC VÀ MODAL NHƯ CŨ) ... */}
        {activeTab === 'finance' && (
            <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-2xl font-black text-slate-800 mb-6">Báo Cáo Tài Chính</h2>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-8 flex items-center gap-4"><span className="font-bold text-slate-500">Chọn tháng:</span><input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)} className="p-2 border border-slate-300 rounded-lg font-bold text-slate-800"/></div>
                    <div className="grid grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><p className="text-xs font-bold text-slate-400 uppercase">Tổng Thu</p><p className="text-3xl font-black text-blue-600 mt-2">{revenueData.total.toLocaleString()}đ</p></div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><p className="text-xs font-bold text-slate-400 uppercase">Tổng Chi</p><p className="text-3xl font-black text-red-500 mt-2">{totalExpense.toLocaleString()}đ</p></div>
                        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg"><p className="text-xs font-bold text-slate-400 uppercase">Lợi Nhuận Ròng</p><p className="text-3xl font-black mt-2">{(revenueData.total - totalExpense).toLocaleString()}đ</p></div>
                    </div>
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-80"><h3 className="font-bold text-slate-700 mb-4">Biểu đồ doanh thu ngày</h3><ResponsiveContainer width="100%" height="100%"><AreaChart data={revenueData.dailyChart}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/><XAxis dataKey="day" axisLine={false} tickLine={false}/><Tooltip/><Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={0.2} /></AreaChart></ResponsiveContainer></div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-80"><h3 className="font-bold text-slate-700 mb-4">Quản lý chi tiêu</h3><div className="flex gap-2 mb-4"><select value={expenseCat} onChange={e => setExpenseCat(e.target.value)} className="p-2 border rounded-lg text-sm bg-white flex-1">{EXPENSE_CATS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><input type="text" placeholder="Tên..." value={expenseName} onChange={e => setExpenseName(e.target.value)} className="p-2 border rounded-lg text-sm w-32"/><input type="number" placeholder="Tiền..." value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} className="p-2 border rounded-lg text-sm w-24"/><button onClick={handleAddExpense} className="bg-red-500 text-white p-2 rounded-lg"><Plus className="w-4 h-4"/></button></div><div className="flex-1 overflow-y-auto h-48 custom-scrollbar space-y-2">{expenses.map(exp => (<div key={exp.id} className="flex justify-between items-center p-2 border-b border-slate-50 text-sm"><span>{exp.title}</span><div className="flex items-center gap-2"><span className="font-bold text-red-500">-{exp.amount.toLocaleString()}</span><button onClick={() => handleDeleteExpense(exp.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-3 h-3"/></button></div></div>))}</div></div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'settings' && (
            <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-black text-slate-800 mb-6">Cài đặt & Kho Hàng</h2>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8"><h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-blue-500"/> Giá sân cơ bản</h3><div className="flex gap-4"><input type="number" value={tempPrice} onChange={(e) => setTempPrice(Number(e.target.value))} className="p-3 border border-slate-300 rounded-xl font-bold text-lg w-48"/><button onClick={updateCourtPrice} className="bg-blue-600 text-white px-6 rounded-xl font-bold hover:bg-blue-700">Cập nhật giá</button></div></div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Package className="w-5 h-5 text-orange-500"/> Quản lý Menu & Kho</h3><div className="flex gap-2 mb-4 bg-slate-50 p-4 rounded-xl"><select value={prodCategory} onChange={e => setProdCategory(e.target.value)} className="p-2 border rounded-lg text-sm font-bold outline-none"><option value="drink">Nước</option><option value="food">Đồ ăn</option><option value="shuttlecock">Cầu</option><option value="other">Khác</option></select><input type="text" placeholder="Tên món" value={prodName} onChange={(e) => setProdName(e.target.value)} className="flex-1 p-2 border rounded-lg text-sm"/><input type="number" placeholder="Giá bán" value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} className="w-24 p-2 border rounded-lg text-sm"/><input type="number" placeholder="Tồn kho" value={prodStock} onChange={(e) => setProdStock(e.target.value)} className="w-20 p-2 border rounded-lg text-sm"/><button onClick={handleSaveProduct} className={`px-4 rounded-lg font-bold text-sm text-white ${editingId ? 'bg-orange-500' : 'bg-emerald-600'}`}>{editingId ? 'Lưu' : 'Thêm'}</button>{editingId && <button onClick={cancelEdit} className="bg-slate-200 px-3 rounded-lg"><XCircle className="w-4 h-4"/></button>}</div><div className="grid grid-cols-2 gap-3">{products.map(p => (<div key={p.id} className={`flex justify-between items-center p-3 rounded-xl border transition bg-white ${editingId === p.id ? 'border-orange-400 ring-1 ring-orange-400' : 'border-slate-200'}`}><div><p className="font-bold text-slate-700">{p.name}</p><p className="text-xs text-slate-400">Kho: <span className={p.stock < 5 ? 'text-red-500 font-bold' : ''}>{p.stock ?? '∞'}</span></p></div><div className="flex items-center gap-2"><span className="text-blue-600 font-bold text-sm">{p.price.toLocaleString()}đ</span><button onClick={() => startEdit(p)} className="p-2 bg-slate-100 rounded-lg hover:bg-blue-100 text-slate-500 hover:text-blue-600"><Edit className="w-4 h-4"/></button><button onClick={() => deleteProduct(p.id)} className="p-2 bg-slate-100 rounded-lg hover:bg-red-100 text-slate-500 hover:text-red-600"><Trash2 className="w-4 h-4"/></button></div></div>))}</div></div>
                </div>
            </div>
        )}

        {activeTab === 'crm' && (
            <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-2xl font-black text-slate-800 mb-6">Danh Sách Khách Hàng</h2>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"><table className="w-full text-left border-collapse"><thead><tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500"><th className="p-4">Khách hàng</th><th className="p-4">Số điện thoại</th><th className="p-4 text-center">Lần cuối</th><th className="p-4 text-center">Số lần đến</th><th className="p-4 text-right">Tổng chi tiêu</th></tr></thead><tbody>{customerList.map((c: any, i: number) => (<tr key={i} className="border-b border-slate-100 hover:bg-blue-50/50 transition"><td className="p-4 font-bold text-slate-700">{c.name}</td><td className="p-4 text-slate-500 font-mono">{c.phone}</td><td className="p-4 text-center text-slate-500 text-sm">{c.lastVisit}</td><td className="p-4 text-center font-bold text-blue-600">{c.visits}</td><td className="p-4 text-right font-black text-emerald-600">{c.totalSpent.toLocaleString()}đ</td></tr>))}</tbody></table>{customerList.length === 0 && <p className="text-center p-8 text-slate-400">Đang tải dữ liệu...</p>}</div>
                </div>
            </div>
        )}

      </div>

      {/* ================= MODAL LỊCH CỐ ĐỊNH (GIỮ NGUYÊN) ================= */}
      {showFixedModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-emerald-50">
                    <h3 className="font-black text-emerald-800 text-lg flex items-center gap-2"><CalendarDays className="w-5 h-5"/> Đặt Lịch Cố Định</h3>
                    <button onClick={() => setShowFixedModal(false)} className="bg-white p-2 rounded-full hover:bg-red-50 hover:text-red-500 transition"><X className="w-5 h-5"/></button>
                </div>
                <div className="p-6 max-h-[75vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div><label className="text-xs font-bold text-slate-500 block mb-1">Tên đội / Khách</label><input type="text" value={fixedName} onChange={e => setFixedName(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="VD: Đội Anh Hùng"/></div>
                        <div><label className="text-xs font-bold text-slate-500 block mb-1">Số điện thoại</label><input type="tel" value={fixedPhone} onChange={e => setFixedPhone(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="09xxxx"/></div>
                    </div>
                    <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <div className="flex justify-between items-center mb-2"><label className="text-xs font-bold text-slate-600 uppercase">Giá trọn gói (Tổng tiền)</label><div className="relative"><input type="number" value={fixedTotalPrice} onChange={e => setFixedTotalPrice(Number(e.target.value))} className="w-32 p-1 text-right font-black text-blue-600 border rounded"/><span className="absolute right-8 top-1.5 text-xs text-slate-400">đ</span></div></div>
                        <div className="flex gap-2"><button onClick={() => setQuickDuration(1)} className="flex-1 bg-white text-blue-600 border border-blue-200 text-xs font-bold py-2 rounded hover:bg-blue-100">+1 Tháng</button><button onClick={() => setQuickDuration(2)} className="flex-1 bg-white text-blue-600 border border-blue-200 text-xs font-bold py-2 rounded hover:bg-blue-100">+2 Tháng</button><button onClick={() => setQuickDuration(3)} className="flex-1 bg-white text-blue-600 border border-blue-200 text-xs font-bold py-2 rounded hover:bg-blue-100">+3 Tháng</button></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div><label className="text-xs font-bold text-slate-500 block mb-1">Chọn Sân</label><select value={fixedCourt} onChange={e => setFixedCourt(Number(e.target.value))} className="w-full p-2 border rounded-lg font-bold">{courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                        <div><label className="text-xs font-bold text-slate-500 block mb-1">Giờ bắt đầu</label><select value={fixedStartHour} onChange={e => setFixedStartHour(Number(e.target.value))} className="w-full p-2 border rounded-lg">{Array.from({length: 18}, (_, i) => i + 5).map(h => <option key={h} value={h}>{h}h00</option>)}</select></div>
                        <div><label className="text-xs font-bold text-slate-500 block mb-1">Thời lượng</label><select value={fixedDuration} onChange={e => setFixedDuration(Number(e.target.value))} className="w-full p-2 border rounded-lg"><option value={1}>1 tiếng</option><option value={2}>2 tiếng</option><option value={3}>3 tiếng</option></select></div>
                    </div>
                    <div className="mb-4"><label className="text-xs font-bold text-slate-500 block mb-2">Chọn thứ trong tuần</label><div className="flex gap-2">{['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day, index) => (<button key={index} onClick={() => toggleDay(index)} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${fixedDays.includes(index) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{day}</button>))}</div></div>
                    <div className="grid grid-cols-2 gap-4 mb-6"><div><label className="text-xs font-bold text-slate-500 block mb-1">Từ ngày</label><input type="date" value={fixedStartDate} onChange={e => setFixedStartDate(e.target.value)} className="w-full p-2 border rounded-lg"/></div><div><label className="text-xs font-bold text-slate-500 block mb-1">Đến ngày</label><input type="date" value={fixedEndDate} onChange={e => setFixedEndDate(e.target.value)} className="w-full p-2 border rounded-lg"/></div></div>
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mb-4 flex justify-between items-center"><div><p className="text-xs font-bold text-emerald-600 uppercase">Tổng {totalSessions} buổi</p><p className="text-xs text-emerald-800">{totalSessions > 0 ? `~ ${(fixedTotalPrice/totalSessions).toLocaleString()}đ / buổi` : 'Chưa chọn ngày'}</p></div><p className="text-2xl font-black text-emerald-700">{fixedTotalPrice.toLocaleString()}đ</p></div>
                    <div className="flex gap-3"><button onClick={() => handleFixedBooking(false)} className="flex-1 bg-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-300 transition text-sm">Lưu (Chưa thu)</button><button onClick={() => handleFixedBooking(true)} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 shadow-lg flex justify-center items-center gap-2 text-sm"><CreditCard className="w-4 h-4"/> THANH TOÁN & LƯU</button></div>
                </div>
            </div>
        </div>
      )}

    </div>
  )
}