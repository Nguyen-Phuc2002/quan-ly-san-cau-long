'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import { 
  Check, Trash2, X, Printer, ShoppingBag, Plus, Minus, DollarSign, 
  TrendingUp, ArrowLeft, Clock, User, LogOut, QrCode, Save, Settings, 
  Edit, XCircle, CalendarDays, CreditCard, UserX, FileSpreadsheet, 
  Wallet, PieChart as PieIcon, BarChart3, TrendingDown, ArrowUpRight, 
  LayoutDashboard, Users, Package, Menu, Search, ChevronLeft, ChevronRight, UserCheck,
  Trophy, Shuffle, Crown, Swords, Shield, Layers, PlusCircle
} from 'lucide-react'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell, Legend } from 'recharts'
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

// DANH MỤC NỘI DUNG THI ĐẤU CƠ BẢN
const BASE_CATEGORIES = ['Đôi Nam', 'Đôi Nữ', 'Đôi Nam Nữ', 'Đơn Nam', 'Đơn Nữ']

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
  const [showProfitModal, setShowProfitModal] = useState(false)
  
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

  // --- STATE GIẢI ĐẤU ---
  const [tournaments, setTournaments] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [registeredTeams, setRegisteredTeams] = useState<any[]>([])
  
  const [newTourName, setNewTourName] = useState('')
  const [newTourRules, setNewTourRules] = useState('')
  const [groupNameInput, setGroupNameInput] = useState('') 
  const [selectedCatsForGroup, setSelectedCatsForGroup] = useState<string[]>([]) 
  const [groupsToAdd, setGroupsToAdd] = useState<any[]>([]) 

  const [selectedTourId, setSelectedTourId] = useState<number | null>(null)
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null)
  const [activeBracket, setActiveBracket] = useState<any>(null)

  const [teamInput, setTeamInput] = useState('')
  const [participants, setParticipants] = useState<any[]>([])

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
    const { data: tourData } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false })
    if (tourData) setTournaments(tourData)
  }
  
  useEffect(() => {
    fetchData()
    const channel = supabase.channel('admin_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [date])

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

  // --- CRM & BOOKING LOGIC ---
  const customerList = useMemo(() => {
    if (activeTab !== 'crm') return []
    const customers: any = {}
    bookings.forEach(b => {
        if (!b.phone_number) return
        if (!customers[b.phone_number]) customers[b.phone_number] = { phone: b.phone_number, name: b.customer_name, visits: 0, totalSpent: 0, lastVisit: b.date }
        customers[b.phone_number].visits += 1
        if(b.is_paid) customers[b.phone_number].totalSpent += (b.total_bill || 0)
        if(b.date > customers[b.phone_number].lastVisit) customers[b.phone_number].lastVisit = b.date
    })
    return Object.values(customers).sort((a:any, b:any) => b.totalSpent - a.totalSpent)
  }, [bookings, activeTab])

  const handleSelectBooking = (booking: any) => { setSelectedBooking(booking); setCart(booking.services_detail || []) }
  const closeInvoice = () => { setSelectedBooking(null); setCart([]) }
  const addToCart = (product: any) => {
    if (product.stock !== null && product.stock <= 0) return toast.error(`Hết hàng! Kho còn: ${product.stock}`)
    const existing = cart.find(item => item.id === product.id)
    if (existing) {
        if (product.stock !== null && existing.qty >= product.stock) return toast.error('Không đủ số lượng trong kho')
        setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item))
    } else { setCart([...cart, { ...product, qty: 1 }]) }
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
  const calculateTotalForDB = () => {
    if (!selectedBooking) return 0
    const serviceFee = cart.reduce((sum, item) => sum + (item.price * item.qty), 0)
    let courtFee = 0
    if (selectedBooking.group_id) {
        const oldServiceFee = selectedBooking.services_detail ? selectedBooking.services_detail.reduce((sum:any, i:any) => sum + (i.price * i.qty), 0) : 0
        courtFee = (selectedBooking.total_bill || 0) - oldServiceFee
    } else {
        const hours = selectedBooking.end_hour - selectedBooking.start_hour
        courtFee = hours * pricePerHour
    }
    return courtFee + serviceFee
  }
  const handleUpdateOrder = async () => {
    if (!selectedBooking) return
    const total = calculateTotalForDB()
    await supabase.from('bookings').update({ total_bill: total, services_detail: cart }).eq('id', selectedBooking.id)
    toast.success('Đã lưu món!'); fetchData()
  }
  const handleCheckout = async () => {
    if (!selectedBooking) return
    for (const item of cart) {
        const product = products.find(p => p.id === item.id)
        if (product && product.stock !== null) {
            await supabase.from('products').update({ stock: product.stock - item.qty }).eq('id', item.id)
        }
    }
    const total = calculateTotalForDB()
    await supabase.from('bookings').update({ is_paid: true, total_bill: total, services_detail: cart, status: 'confirmed' }).eq('id', selectedBooking.id)
    toast.success('Thanh toán thành công!', { description: `Thu thêm: ${calculateTotal().toLocaleString()}đ` }); fetchData()
  }
  const handleDelete = async (id: number) => {
    if (role !== 'admin') return toast.error('Chỉ Admin mới có quyền xóa!')
    if(confirm('Xóa VĨNH VIỄN lịch này?')) { await supabase.from('bookings').delete().eq('id', id); toast.info('Đã xóa'); setSelectedBooking(null); fetchData() }
  }
  const handleDeleteGroup = async (groupId: string) => {
    if (role !== 'admin') return toast.error('Chỉ Admin mới có quyền xóa nhóm!')
    if(confirm('Xóa TOÀN BỘ lịch cố định của nhóm này?')) { await supabase.from('bookings').delete().eq('group_id', groupId); toast.success('Đã xóa nhóm lịch'); setSelectedBooking(null); fetchData() }
  }
  const handleCancelSession = async () => {
    if(!selectedBooking) return
    if(confirm(`Xác nhận đội ${selectedBooking.customer_name} VẮNG hôm nay?`)) { await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', selectedBooking.id); toast.warning('Đã báo vắng!'); setSelectedBooking(null); fetchData() }
  }
  const handleCheckIn = async () => {
    if(!selectedBooking) return
    await supabase.from('bookings').update({ is_checked_in: true }).eq('id', selectedBooking.id); toast.success('Đã Check-in!'); fetchData()
  }
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
    end.setDate(end.getDate() + (months * 30) - 1); setFixedEndDate(end.toISOString().split('T')[0]); setFixedTotalPrice(3000000 * months)
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

  // --- REPORT & UTILS ---
  const handleAddExpense = async () => {
    if (!expenseName || !expenseAmount) return toast.error('Nhập đủ thông tin!'); await supabase.from('expenses').insert({ title: expenseName, amount: Number(expenseAmount), date: new Date().toISOString().split('T')[0], category: expenseCat }); toast.success('Đã thêm chi phí'); setExpenseName(''); setExpenseAmount(''); fetchReportData()
  }
  const handleDeleteExpense = async (id: number) => { if(confirm('Xóa?')) { await supabase.from('expenses').delete().eq('id', id); fetchReportData() } }
  
  // 🎯 FIX LỖI: ĐÃ THÊM BIẾN netProfit
  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0)
  const netProfit = revenueData.total - totalExpense
  const profitMargin = revenueData.total > 0 ? (netProfit / revenueData.total) * 100 : 0
  
  const handleExportExcel = async () => {
    const currentMonth = date.substring(0, 7)
    toast.loading('Đang tải...'); const { data: monthData } = await supabase.from('bookings').select('*').ilike('date', `${currentMonth}%`).order('date')
    if (!monthData || !monthData.length) { toast.dismiss(); return toast.warning('Không có dữ liệu') }
    const excelData = monthData.map(b => ({ 'Ngày': b.date, 'Giờ': `${b.start_hour}h-${b.end_hour}h`, 'Sân': b.court_id, 'Khách': b.customer_name, 'Tổng tiền': b.total_bill, 'Trạng thái': b.is_paid ? 'Đã thu' : 'Chưa thu' }))
    const ws = XLSX.utils.json_to_sheet(excelData); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, `Tháng ${currentMonth}`); XLSX.writeFile(wb, `DoanhThu_${currentMonth}.xlsx`); toast.dismiss(); toast.success('Đã tải file!')
  }
  const changeDate = (days: number) => { const d = new Date(date); d.setDate(d.getDate() + days); setDate(d.toISOString().split('T')[0]) }
  const setToday = () => setDate(new Date().toISOString().split('T')[0])
  const getBookingForSlot = (courtId: number, hour: number) => {
    const slotBookings = bookings.filter(b => b.court_id === courtId && hour >= b.start_hour && hour < b.end_hour)
    if (searchTerm) return slotBookings.find(b => b.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) || (b.phone_number && b.phone_number.includes(searchTerm)))
    return slotBookings.find(b => b.status === 'confirmed') || slotBookings.find(b => b.status === 'cancelled')
  }

  // === 🎯 TOURNAMENT LOGIC ===
  const toggleCatForGroup = (cat: string) => {
      if (selectedCatsForGroup.includes(cat)) setSelectedCatsForGroup(selectedCatsForGroup.filter(c => c !== cat))
      else setSelectedCatsForGroup([...selectedCatsForGroup, cat])
  }
  const addGroup = () => {
      if (!groupNameInput || selectedCatsForGroup.length === 0) return
      setGroupsToAdd([...groupsToAdd, { name: groupNameInput, cats: selectedCatsForGroup }])
      setGroupNameInput(''); setSelectedCatsForGroup([])
  }
  const removeGroup = (index: number) => setGroupsToAdd(groupsToAdd.filter((_, i) => i !== index))

  const createTournament = async () => {
    if (!newTourName) return toast.error('Nhập tên giải!')
    if (groupsToAdd.length === 0) return toast.error('Chưa có nhóm nào!')
    const { data: tour, error } = await supabase.from('tournaments').insert({ name: newTourName, rules: newTourRules, status: 'open' }).select().single()
    if (error) return toast.error('Lỗi tạo giải')
    const catsToInsert: any[] = []
    groupsToAdd.forEach(group => {
        group.cats.forEach((catName: string) => {
            catsToInsert.push({ tournament_id: tour.id, name: catName, group_name: group.name, status: 'open' })
        })
    })
    await supabase.from('tournament_categories').insert(catsToInsert)
    toast.success('Đã mở giải đấu thành công!'); setNewTourName(''); setNewTourRules(''); setGroupsToAdd([]); fetchData()
  }

  const handleSelectTournament = async (tour: any) => {
      setSelectedTourId(tour.id); setSelectedCatId(null); setActiveBracket(null)
      const { data } = await supabase.from('tournament_categories').select('*').eq('tournament_id', tour.id).order('group_name')
      if(data) setCategories(data)
  }

  const handleSelectCategory = async (cat: any) => {
      setSelectedCatId(cat.id); setActiveBracket(cat.rounds_data)
      const { data } = await supabase.from('tournament_registrations')
          .select('*')
          .eq('category_id', cat.id)
          .eq('status', 'approved') 
      if(data) setRegisteredTeams(data)
  }

  // --- XÓA ĐỘI (KHI BỊ TỐ CÁO) ---
  const deleteTeam = async (teamId: number) => {
      if(confirm('Xác nhận xóa đội này khỏi giải đấu?')) {
          await supabase.from('tournament_registrations').delete().eq('id', teamId)
          toast.success('Đã xóa đội thành công')
          if(selectedCatId) {
             const { data } = await supabase.from('tournament_registrations').select('*').eq('category_id', selectedCatId).eq('status', 'approved')
             if(data) setRegisteredTeams(data)
          }
      }
  }

  const generateBracket = async () => {
    if(!selectedCatId || registeredTeams.length < 2) return toast.error('Cần > 2 đội để quay nhánh!')
    const teams = [...registeredTeams]; for (let i = teams.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [teams[i], teams[j]] = [teams[j], teams[i]] }
    const round1 = []; for (let i = 0; i < teams.length; i += 2) { round1.push({ id: `r1-${i}`, player1: teams[i].team_name, player2: teams[i+1]?.team_name || 'BYE', winner: teams[i+1] ? null : teams[i].team_name }) }
    const roundsData = [round1]
    await supabase.from('tournament_categories').update({ rounds_data: roundsData, status: 'active' }).eq('id', selectedCatId)
    toast.success('Đã tạo nhánh!'); setActiveBracket(roundsData)
  }

  const handleWin = async (roundIndex: number, matchIndex: number, winnerName: string) => {
    if (!activeBracket) return
    const newRounds = [...activeBracket]; newRounds[roundIndex][matchIndex].winner = winnerName
    if (newRounds[roundIndex].every((m: any) => m.winner !== null)) {
        const winners = newRounds[roundIndex].map((m: any) => m.winner)
        if (winners.length === 1) toast.success(`👑 VÔ ĐỊCH: ${winners[0]} 👑`)
        else {
            const nextRound = []; for (let i = 0; i < winners.length; i += 2) { nextRound.push({ id: `r${roundIndex + 1}-${i}`, player1: winners[i], player2: winners[i+1] || 'BYE', winner: winners[i+1] ? null : winners[i] }) }
            if (newRounds[roundIndex + 1]) newRounds[roundIndex + 1] = nextRound; else newRounds.push(nextRound)
        }
    }
    await supabase.from('tournament_categories').update({ rounds_data: newRounds }).eq('id', selectedCatId)
    setActiveBracket(newRounds)
  }
  const deleteTournament = async (id: number) => { if(confirm('Xóa giải?')) { await supabase.from('tournaments').delete().eq('id', id); setSelectedTourId(null); fetchData() } }

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
      
      {/* SIDEBAR (GIỮ NGUYÊN) */}
      <div className={`bg-slate-900 text-white flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-4 flex items-center gap-3 border-b border-slate-800 h-16"><div className="bg-blue-600 p-2 rounded-lg"><LayoutDashboard className="w-5 h-5"/></div>{isSidebarOpen && <h1 className="font-black text-lg tracking-tight">BADMINTON<span className="text-blue-500">PRO</span></h1>}</div>
        <div className="flex-1 py-6 space-y-2 px-3">
            {[
                { id: 'schedule', label: 'Sơ đồ sân', icon: <CalendarDays className="w-5 h-5"/> },
                { id: 'tournament', label: 'Giải đấu', icon: <Trophy className="w-5 h-5"/> },
                { id: 'crm', label: 'Khách hàng', icon: <Users className="w-5 h-5"/> },
                { id: 'finance', label: 'Tài chính', icon: <Wallet className="w-5 h-5"/> },
                { id: 'settings', label: 'Cài đặt & Kho', icon: <Package className="w-5 h-5"/> },
            ].map(item => (<button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>{item.icon}{isSidebarOpen && <span className="font-bold text-sm">{item.label}</span>}</button>))}
        </div>
        <div className="p-4 border-t border-slate-800"><button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition"><LogOut className="w-5 h-5"/>{isSidebarOpen && <span className="font-bold text-sm">Đăng xuất</span>}</button></div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* TAB 1: SCHEDULE */}
        {activeTab === 'schedule' && (
            <div className="flex h-full">
                {/* Lưới Sân */}
                <div className="flex-1 flex flex-col border-r border-slate-200">
                    <div className="h-16 bg-white border-b border-slate-200 flex justify-between items-center px-6 shadow-sm">
                        <div className="flex items-center gap-4"><button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg"><Menu className="w-5 h-5 text-slate-600"/></button><div className="relative"><Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400"/><input type="text" placeholder="Tìm tên khách..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 bg-slate-100 rounded-full text-sm font-medium border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 w-64 transition-all"/></div></div>
                        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200"><button onClick={() => changeDate(-1)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition"><ChevronLeft className="w-4 h-4 text-slate-600"/></button><input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="bg-transparent outline-none text-slate-800 font-bold text-sm mx-2" /><button onClick={() => setToday()} className="text-xs font-bold text-blue-600 hover:underline px-2">Hôm nay</button><button onClick={() => changeDate(1)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition"><ChevronRight className="w-4 h-4 text-slate-600"/></button></div>
                        <button onClick={() => setShowFixedModal(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-200"><CalendarDays className="w-4 h-4"/> Đặt lịch tháng</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
                        <div className="grid grid-cols-2 xl:grid-cols-4 gap-6 pb-20">
                            {courts.map(court => (
                                <div key={court.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden min-h-[400px]">
                                    <div className="p-4 bg-slate-50 border-b border-slate-200 text-center font-black text-slate-700 text-lg uppercase tracking-wide">{court.name}</div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                        {Array.from({length: 18}, (_, i) => i + 5).map(hour => {
                                            const booking = getBookingForSlot(court.id, hour); if (!booking) return <div key={hour} className="h-12 border-b border-slate-50 flex items-center justify-center text-[10px] text-slate-300 hover:bg-slate-50">{hour}h</div>; if (booking.start_hour !== hour) return null;
                                            const isSelected = selectedBooking?.id === booking.id; const duration = booking.end_hour - booking.start_hour; const isCancelled = booking.status === 'cancelled';
                                            return (<div key={booking.id} style={{ height: `${duration * 48}px` }} onClick={() => handleSelectBooking(booking)} className={`m-1 rounded-xl border cursor-pointer relative group flex flex-col justify-center px-3 shadow-sm transition-all hover:scale-[1.02] ${isCancelled ? 'bg-slate-100 border-slate-200 opacity-60 grayscale' : isSelected ? 'bg-blue-600 border-blue-600 text-white ring-2 ring-offset-2 ring-blue-500' : booking.is_paid ? (booking.group_id ? 'bg-purple-50 border-purple-200' : 'bg-emerald-50 border-emerald-200') : 'bg-white border-l-4 border-l-blue-500 border-y border-r border-slate-200'}`}><div className="flex justify-between items-center"><span className={`font-bold text-xs ${isCancelled ? 'line-through text-slate-400' : isSelected ? 'text-white' : booking.is_paid ? 'text-emerald-700' : 'text-blue-700'}`}>{booking.start_hour}h - {booking.end_hour}h</span><div className="flex items-center gap-1">{booking.is_checked_in && <UserCheck className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-blue-500'}`}/>}{!isCancelled && booking.is_paid && <Check className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-emerald-600'}`}/>}</div></div><p className={`font-bold text-sm truncate ${isCancelled ? 'text-slate-400' : isSelected ? 'text-white' : 'text-slate-800'}`}>{booking.customer_name}</p></div>)
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
                                    <div className="bg-slate-100 p-6 rounded-xl text-center border-2 border-dashed border-slate-300"><UserX className="w-12 h-12 text-slate-400 mx-auto mb-2"/><h3 className="font-bold text-slate-700">Khách báo vắng</h3><p className="text-sm text-slate-500 mb-4">Slot này trống, có thể đặt đè.</p>{role === 'admin' && <button onClick={() => handleDelete(selectedBooking.id)} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold mt-2">Xóa lịch sử</button>}</div>
                                ) : (
                                    <>
                                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-6 relative"><button onClick={handleCheckIn} className={`absolute top-4 right-4 p-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${selectedBooking.is_checked_in ? 'bg-emerald-100 text-emerald-700 pointer-events-none' : 'bg-white border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white shadow-sm'}`}>{selectedBooking.is_checked_in ? <><UserCheck className="w-3 h-3"/> Đã đến</> : 'Check-in'}</button><div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold"><User className="w-5 h-5"/></div><div><p className="font-bold text-slate-800">{selectedBooking.customer_name}</p><p className="text-xs text-slate-500">{selectedBooking.phone_number}</p></div></div><div className="flex justify-between text-sm py-2 border-t border-blue-200/50"><span className="text-slate-500">Sân {selectedBooking.court_id}</span><span className="font-bold text-slate-800">{selectedBooking.start_hour}h - {selectedBooking.end_hour}h</span></div></div>
                                        <div className="space-y-4 mb-6"><div className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-lg border border-slate-100"><div className="flex flex-col"><span className="text-slate-500">Tiền sân</span>{selectedBooking.group_id && selectedBooking.is_paid && <span className="text-[10px] text-purple-600 font-bold">(Đã đóng tháng)</span>}</div><span className="font-bold text-slate-800">{selectedBooking.group_id && selectedBooking.is_paid ? '0đ' : ((selectedBooking.end_hour - selectedBooking.start_hour) * pricePerHour).toLocaleString() + 'đ'}</span></div>{cart.map((item, idx) => (<div key={idx} className="flex justify-between items-center text-sm group"><div><p className="font-medium text-slate-700">{item.name}</p><p className="text-[10px] text-slate-400">{item.price.toLocaleString()} x {item.qty}</p></div><div className="flex items-center gap-2"><button onClick={() => removeFromCart(item.id)} className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-500 hover:text-red-500"><Minus className="w-3 h-3"/></button><span className="font-bold text-xs w-4 text-center">{item.qty}</span><button onClick={() => addToCart(item)} className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-500 hover:text-blue-500"><Plus className="w-3 h-3"/></button></div><p className="font-bold text-slate-800">{(item.price * item.qty).toLocaleString()}đ</p></div>))}</div>
                                        <div className="border-t border-slate-200 pt-4"><p className="text-xs font-bold text-slate-400 uppercase mb-3">Thêm dịch vụ</p><div className="space-y-4">{CATEGORIES.map(cat => {const items = products.filter(p => p.category === cat.id || (!p.category && cat.id === 'drink')); if(!items.length) return null; return (<div key={cat.id}><p className="text-[10px] font-bold text-blue-600 mb-2">{cat.name}</p><div className="grid grid-cols-2 gap-2">{items.map(p => (<button key={p.id} onClick={() => addToCart(p)} className="text-left p-2 border border-slate-200 rounded-lg hover:border-blue-500 transition relative overflow-hidden"><p className="text-xs font-bold text-slate-700 truncate">{p.name}</p><div className="flex justify-between items-end mt-1"><span className="text-[10px] text-slate-500">{p.price.toLocaleString()}</span>{p.stock !== null && <span className={`text-[9px] px-1 rounded ${p.stock < 5 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>Kho: {p.stock}</span>}</div></button>))}</div></div>)})}</div></div>
                                        <div className="mt-4 p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-3"><img src={`https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-${TEMPLATE}.png?amount=${calculateTotal()}&addInfo=SAN ${selectedBooking.court_id} ${selectedBooking.customer_name}&accountName=${ACCOUNT_NAME}`} alt="QR" className="w-16 h-16 rounded-lg border border-slate-100"/><div className="flex-1 overflow-hidden"><p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><QrCode className="w-3 h-3"/> Quét mã MBBANK</p><p className="text-xs text-slate-500 truncate">{ACCOUNT_NO}</p><p className="text-blue-600 font-black text-lg mt-0.5">{calculateTotal().toLocaleString()}đ</p></div></div>
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
                                    <div className="flex gap-3"><button onClick={handleUpdateOrder} className="flex-1 bg-white border border-slate-300 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50">Lưu</button><button onClick={handleCheckout} className="flex-[2] bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-blue-600 shadow-lg flex justify-center items-center gap-2"><Printer className="w-4 h-4"/> Thu Tiền</button></div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        )}

        {/* TAB 2: TOURNAMENT (GIẢI ĐẤU) */}
        {activeTab === 'tournament' && (
            <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2"><Trophy className="w-8 h-8 text-yellow-500"/> Quản Lý Giải Đấu</h2>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                        
                        {/* CỘT 1: TẠO GIẢI (4/12) */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                <h3 className="font-bold text-slate-700 mb-4 uppercase text-sm flex items-center gap-2"><Plus className="w-4 h-4"/> 1. Tạo giải mới</h3>
                                <div className="space-y-4">
                                    <input type="text" placeholder="Tên giải đấu (VD: Giải Mùa Hè)" value={newTourName} onChange={(e) => setNewTourName(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl text-sm font-bold"/>
                                    <textarea placeholder="Điều lệ giải (VD: Thời gian, địa điểm, thể thức...)" value={newTourRules} onChange={(e) => setNewTourRules(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl text-sm h-24 resize-none"/>
                                    
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                        <p className="text-xs font-bold text-slate-500 mb-2">Thêm nhóm/bảng đấu</p>
                                        <div className="space-y-2 mb-3">
                                            <input type="text" placeholder="Tên nhóm (VD: Nhóm 1 - Trình A)" value={groupNameInput} onChange={(e) => setGroupNameInput(e.target.value)} className="w-full p-2 border rounded-lg text-sm"/>
                                            <div className="flex flex-wrap gap-2">
                                                {BASE_CATEGORIES.map(cat => (
                                                    <button key={cat} onClick={() => toggleCatForGroup(cat)} className={`text-[10px] px-2 py-1 rounded border transition ${selectedCatsForGroup.includes(cat) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300'}`}>
                                                        {cat}
                                                    </button>
                                                ))}
                                            </div>
                                            <button onClick={addGroup} className="w-full bg-blue-100 text-blue-700 text-xs font-bold py-2 rounded-lg hover:bg-blue-200">+ Thêm nhóm này</button>
                                        </div>

                                        <div className="space-y-1">
                                            {groupsToAdd.map((g, i) => (
                                                <div key={i} className="flex justify-between items-center bg-white px-2 py-2 rounded border border-slate-100 text-xs">
                                                    <div><span className="font-bold text-slate-700 block">{g.name}</span><span className="text-slate-400 text-[10px]">{g.cats.join(', ')}</span></div>
                                                    <button onClick={() => removeGroup(i)}><X className="w-3 h-3 text-red-400"/></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button onClick={createTournament} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-600 transition shadow-lg">
                                        Tạo Giải Đấu
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                                <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase">Danh sách giải</h3>
                                <div className="space-y-2">
                                    {tournaments.map(t => (
                                        <div key={t.id} onClick={() => handleSelectTournament(t)} className={`p-3 rounded-xl border cursor-pointer transition flex justify-between items-center ${selectedTourId === t.id ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                                            <div><p className="font-bold text-slate-800 text-sm">{t.name}</p><p className="text-[10px] text-slate-400">{new Date(t.created_at).toLocaleDateString('vi-VN')}</p></div>
                                            <button onClick={(e) => {e.stopPropagation(); deleteTournament(t.id)}} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* CỘT 2: CHỌN NỘI DUNG (3/12) */}
                        <div className="lg:col-span-3 space-y-6">
                            {selectedTourId ? (
                                <>
                                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                                        <h3 className="font-bold text-slate-700 mb-3 text-sm uppercase">2. Chọn nội dung</h3>
                                        <div className="space-y-3">
                                            {Object.entries(categories.reduce((acc:any, item:any) => {
                                                const group = item.group_name || 'Khác'; if (!acc[group]) acc[group] = []; acc[group].push(item); return acc;
                                            }, {})).map(([groupName, cats]: [string, any]) => (
                                                <div key={groupName}>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">{groupName}</p>
                                                    <div className="space-y-1">
                                                        {cats.map((c:any) => (
                                                            <div key={c.id} onClick={() => handleSelectCategory(c)} 
                                                                className={`p-3 rounded-xl border cursor-pointer transition ${selectedCatId === c.id ? 'bg-orange-50 border-orange-200 text-orange-700 shadow-sm' : 'bg-white hover:bg-slate-50'}`}>
                                                                <p className="font-bold text-sm">{c.name}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {selectedCatId && (
                                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                                            <h3 className="font-bold text-slate-700 mb-2 text-sm uppercase">Đội tham gia ({registeredTeams.length})</h3>
                                            <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1 mb-4">
                                                {registeredTeams.length === 0 ? <p className="text-xs text-slate-400 italic">Chưa có đội nào đăng ký</p> : 
                                                registeredTeams.map((team, idx) => (
                                                    <div key={team.id} className="text-xs p-2 bg-slate-50 rounded border border-slate-100 flex justify-between items-center group">
                                                        <div><span className="font-bold text-slate-400">{idx+1}.</span> {team.team_name}</div>
                                                        <button onClick={() => deleteTeam(team.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 className="w-3 h-3"/></button>
                                                    </div>
                                                ))}
                                            </div>
                                            <button onClick={generateBracket} className="w-full bg-purple-600 text-white py-2 rounded-lg font-bold text-xs hover:bg-purple-700 flex justify-center items-center gap-2"><Shuffle className="w-3 h-3"/> TẠO NHÁNH ĐẤU</button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400 text-sm italic border-2 border-dashed rounded-2xl border-slate-200">Chọn giải đấu bên trái</div>
                            )}
                        </div>

                        {/* CỘT 3: SƠ ĐỒ THI ĐẤU (5/12) */}
                        <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-x-auto">
                            <h3 className="font-bold text-slate-700 mb-6 text-sm uppercase flex items-center gap-2"><Swords className="w-4 h-4"/> 3. Sơ đồ nhánh đấu</h3>
                            {activeBracket ? (
                                <div className="min-w-[500px]">
                                    <div className="flex justify-start gap-8">
                                        {activeBracket.map((round: any[], roundIndex: number) => (
                                            <div key={roundIndex} className="flex flex-col justify-center gap-6 w-40">
                                                <div className="text-center font-bold text-blue-600 uppercase text-[10px] mb-2 bg-blue-50 py-1 rounded">
                                                    {round.length === 1 ? 'Chung Kết' : `Vòng ${roundIndex + 1}`}
                                                </div>
                                                {round.map((match, matchIndex) => (
                                                    <div key={match.id} className="relative flex flex-col gap-px group">
                                                        {/* CSS Connector */}
                                                        {roundIndex < activeBracket.length - 1 && (<div className="absolute top-1/2 -right-8 w-8 h-px bg-slate-300 z-0"></div>)}
                                                        {roundIndex < activeBracket.length - 1 && matchIndex % 2 === 0 && (<div className="absolute top-1/2 -right-8 w-px h-[calc(100%+1.5rem)] bg-slate-300 z-0 translate-y-1/2"></div>)}

                                                        <div className="z-10 bg-white border border-slate-300 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all text-xs">
                                                            <button disabled={!match.player1 || match.player1 === 'BYE'} onClick={() => handleWin(roundIndex, matchIndex, match.player1)} className={`w-full p-2 text-left font-bold transition-all flex justify-between items-center ${match.winner === match.player1 ? 'bg-green-100 text-green-800' : 'hover:bg-slate-50 text-slate-700'}`}>{match.player1}{match.winner === match.player1 && <Check className="w-3 h-3"/>}</button>
                                                            <div className="h-px bg-slate-200"></div>
                                                            <button disabled={!match.player2 || match.player2 === 'BYE'} onClick={() => handleWin(roundIndex, matchIndex, match.player2)} className={`w-full p-2 text-left font-bold transition-all flex justify-between items-center ${match.winner === match.player2 ? 'bg-green-100 text-green-800' : 'hover:bg-slate-50 text-slate-700'}`}>{match.player2}{match.winner === match.player2 && <Check className="w-3 h-3"/>}</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                        {activeBracket[activeBracket.length - 1][0].winner && <div className="flex flex-col justify-center items-center w-32"><div className="text-center font-bold text-yellow-500 uppercase text-[10px] mb-2 tracking-wider">Vô Địch</div><div className="p-4 bg-yellow-50 border-2 border-yellow-400 text-yellow-800 rounded-xl shadow-lg text-center animate-bounce"><Crown className="w-6 h-6 mx-auto mb-1"/><p className="font-black text-sm">{activeBracket[activeBracket.length - 1][0].winner}</p></div></div>}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50"><Trophy className="w-16 h-16 mb-2"/><p className="text-xs">Chọn nội dung và bấm quay nhánh</p></div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* TAB 3 & 4 & 5 (FINANCE, SETTINGS, CRM) - GIỮ NGUYÊN */}
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

        {/* TAB 6: CRM */}
        {activeTab === 'crm' && (
            <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-2xl font-black text-slate-800 mb-6">Danh Sách Khách Hàng</h2>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"><table className="w-full text-left border-collapse"><thead><tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500"><th className="p-4">Khách hàng</th><th className="p-4">Số điện thoại</th><th className="p-4 text-center">Lần cuối</th><th className="p-4 text-center">Số lần đến</th><th className="p-4 text-right">Tổng chi tiêu</th></tr></thead><tbody>{customerList.map((c: any, i: number) => (<tr key={i} className="border-b border-slate-100 hover:bg-blue-50/50 transition"><td className="p-4 font-bold text-slate-700">{c.name}</td><td className="p-4 text-slate-500 font-mono">{c.phone}</td><td className="p-4 text-center text-slate-500 text-sm">{c.lastVisit}</td><td className="p-4 text-center font-bold text-blue-600">{c.visits}</td><td className="p-4 text-right font-black text-emerald-600">{c.totalSpent.toLocaleString()}đ</td></tr>))}</tbody></table>{customerList.length === 0 && <p className="text-center p-8 text-slate-400">Đang tải dữ liệu...</p>}</div>
                </div>
            </div>
        )}

      </div>

      {/* ================= MODAL LỊCH CỐ ĐỊNH ================= */}
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