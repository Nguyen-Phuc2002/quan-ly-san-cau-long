'use client'
import { useEffect, useState, use, useMemo } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trophy, Calendar, Users, CheckCircle, Share2, Swords, LayoutGrid, CheckSquare, Square, UserPlus, Trash2, Plus, ChevronDown, ChevronUp, Layers } from 'lucide-react'
import { toast } from 'sonner'

// Định nghĩa kiểu cho 1 cặp VĐV
type PlayerPair = {
    player1: string;
    player2: string;
}

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  
  const [tournament, setTournament] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([]) 
  const [activeTab, setActiveTab] = useState('register') 
  
  // State đăng ký chung
  const [teamName, setTeamName] = useState('')
  const [phone, setPhone] = useState('')

  // State chọn nội dung
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([]) 
  const [memberMap, setMemberMap] = useState<Record<string, PlayerPair[]>>({}) 
  
  // State quản lý đóng/mở nhóm (Accordion)
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])

  // State hiển thị dữ liệu
  const [registrations, setRegistrations] = useState<any[]>([])
  const [viewCatId, setViewCatId] = useState<string>('all') 

  useEffect(() => {
    const fetchData = async () => {
      const { data: tourData } = await supabase.from('tournaments').select('*').eq('id', id).single()
      if (tourData) setTournament(tourData)

      const { data: catData } = await supabase.from('tournament_categories').select('*').eq('tournament_id', id).order('group_name')
      if (catData && catData.length > 0) {
          setCategories(catData)
          setViewCatId(catData[0].id.toString()) 
          
          // Mặc định mở nhóm đầu tiên cho khách thấy
          if (catData[0].group_name) {
              setExpandedGroups([catData[0].group_name])
          }
      }

      const { data: regData } = await supabase.from('tournament_registrations')
        .select(`*, tournament_categories (name, group_name)`)
        .eq('tournament_id', id)
        .order('created_at')
      
      if (regData) setRegistrations(regData)
    }
    fetchData()
  }, [id])

  // --- LOGIC GOM NHÓM (GROUPING) ---
  const groupedCategories = useMemo(() => {
    return categories.reduce((acc: any, cat: any) => {
        const group = cat.group_name || 'Khác';
        if (!acc[group]) acc[group] = [];
        acc[group].push(cat);
        return acc;
    }, {});
  }, [categories]);

  const toggleGroup = (groupName: string) => {
      if (expandedGroups.includes(groupName)) {
          setExpandedGroups(expandedGroups.filter(g => g !== groupName))
      } else {
          setExpandedGroups([...expandedGroups, groupName])
      }
  }

  // --- LOGIC CHỌN NHIỀU & QUẢN LÝ CẶP VĐV ---
  
  const toggleCategory = (catId: string) => {
      if (selectedCatIds.includes(catId)) {
          setSelectedCatIds(selectedCatIds.filter(id => id !== catId))
          const newMap = { ...memberMap }
          delete newMap[catId]
          setMemberMap(newMap)
      } else {
          setSelectedCatIds([...selectedCatIds, catId])
          setMemberMap(prev => ({
              ...prev,
              [catId]: [{ player1: '', player2: '' }]
          }))
      }
  }

  const addPair = (catId: string) => {
      const currentPairs = memberMap[catId] || []
      setMemberMap({ ...memberMap, [catId]: [...currentPairs, { player1: '', player2: '' }] })
  }

  const removePair = (catId: string, index: number) => {
      const currentPairs = memberMap[catId] || []
      if (currentPairs.length === 1) return 
      const newPairs = currentPairs.filter((_, i) => i !== index)
      setMemberMap({ ...memberMap, [catId]: newPairs })
  }

  const handleInputChange = (catId: string, index: number, field: 'player1' | 'player2', value: string) => {
      const currentPairs = [...(memberMap[catId] || [])]
      if (!currentPairs[index]) return 
      currentPairs[index][field] = value
      setMemberMap({ ...memberMap, [catId]: currentPairs })
  }

  const handleRegister = async () => {
    if(!teamName || !phone) return toast.error('Vui lòng nhập tên CLB và SĐT!')
    if(selectedCatIds.length === 0) return toast.error('Vui lòng chọn ít nhất 1 nội dung!')
    
    for (const catId of selectedCatIds) {
        const pairs = memberMap[catId] || []
        for (const pair of pairs) {
            if (!pair.player1.trim()) return toast.error('Vui lòng nhập tên VĐV!')
        }
    }
    
    const registrationsToInsert: any[] = []

    selectedCatIds.forEach(catId => {
        const pairs = memberMap[catId] || []
        pairs.forEach((pair, index) => {
            const memberString = pair.player2 ? `${pair.player1} - ${pair.player2}` : pair.player1
            const displayTeamName = pairs.length > 1 ? `${teamName} (Cặp ${index + 1})` : teamName

            registrationsToInsert.push({
                tournament_id: id,
                category_id: catId, 
                team_name: displayTeamName,
                phone_number: phone,
                members: memberString,
                status: 'approved'
            })
        })
    })

    const { error } = await supabase.from('tournament_registrations').insert(registrationsToInsert)

    if(error) toast.error('Lỗi đăng ký: ' + error.message)
    else {
        toast.success(`Đăng ký thành công ${registrationsToInsert.length} suất thi đấu!`)
        setTeamName(''); setPhone(''); setSelectedCatIds([]); setMemberMap({})
        const { data } = await supabase.from('tournament_registrations').select(`*, tournament_categories (name, group_name)`).eq('tournament_id', id)
        if(data) setRegistrations(data)
        setActiveTab('teams')
    }
  }

  const filteredRegistrations = viewCatId === 'all' 
    ? registrations 
    : registrations.filter(r => r.category_id.toString() === viewCatId)

  const activeBracket = categories.find(c => c.id.toString() === viewCatId)?.rounds_data

  if (!tournament) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white p-6 md:p-10 pb-28 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-20 bg-blue-500 rounded-full blur-3xl opacity-20 translate-x-1/2 -translate-y-1/2"></div>
        <button onClick={() => router.back()} className="absolute top-6 left-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition backdrop-blur-md"><ArrowLeft className="w-5 h-5"/></button>
        
        <div className="max-w-5xl mx-auto relative z-10 mt-4">
            <span className="bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wider mb-4 inline-block shadow-lg">Giải Đấu Đang Mở</span>
            <h1 className="text-3xl md:text-5xl font-black uppercase mb-4 leading-tight">{tournament.name}</h1>
            <div className="flex flex-wrap gap-6 text-sm text-blue-100/80">
                <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-yellow-400"/> Ngày tạo: {new Date(tournament.created_at).toLocaleDateString('vi-VN')}</span>
                <span className="flex items-center gap-2"><Users className="w-4 h-4 text-yellow-400"/> {registrations.length} Đội tham gia</span>
            </div>
            {tournament.rules && (
                <div className="mt-6 p-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10 text-sm text-slate-200">
                    <p className="font-bold text-white mb-1 uppercase text-xs opacity-70">Điều lệ giải:</p>
                    {tournament.rules}
                </div>
            )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 -mt-20 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden min-h-[600px]">
            
            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/50 overflow-x-auto">
                <button onClick={() => setActiveTab('register')} className={`flex-1 py-4 px-4 font-bold text-sm flex justify-center items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'register' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500 hover:text-slate-800'}`}><CheckCircle className="w-4 h-4"/> Đăng Ký</button>
                <button onClick={() => setActiveTab('teams')} className={`flex-1 py-4 px-4 font-bold text-sm flex justify-center items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'teams' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500 hover:text-slate-800'}`}><Users className="w-4 h-4"/> Danh Sách Đội</button>
                <button onClick={() => setActiveTab('bracket')} className={`flex-1 py-4 px-4 font-bold text-sm flex justify-center items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'bracket' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500 hover:text-slate-800'}`}><Swords className="w-4 h-4"/> Nhánh Đấu</button>
                <button onClick={() => setActiveTab('schedule')} className={`flex-1 py-4 px-4 font-bold text-sm flex justify-center items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'schedule' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500 hover:text-slate-800'}`}><LayoutGrid className="w-4 h-4"/> Lịch Thi Đấu</button>
            </div>

            <div className="p-6 md:p-8">
                
                {/* 1. ĐĂNG KÝ (GIAO DIỆN MỚI GỌN GÀNG) */}
                {activeTab === 'register' && (
                    <div className="max-w-xl mx-auto">
                        <div className="text-center mb-8">
                            <h3 className="text-2xl font-black text-slate-800">Đăng Ký Tham Gia</h3>
                            <p className="text-slate-500 text-sm mt-1">Đăng ký cho CLB hoặc Cá nhân</p>
                        </div>
                        
                        <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-slate-500 uppercase block mb-2">Tên Đội / CLB</label><input type="text" value={teamName} onChange={e => setTeamName(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl font-bold text-sm" placeholder="VD: CLB Cầu Lông Vui"/></div>
                                <div><label className="text-xs font-bold text-slate-500 uppercase block mb-2">Số điện thoại</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl font-bold text-sm" placeholder="09xxxx"/></div>
                            </div>
                            
                            {/* DANH SÁCH NHÓM & NỘI DUNG (ACCORDION) */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-3">Chọn Nội Dung & Nhập VĐV</label>
                                <div className="space-y-3">
                                    {Object.entries(groupedCategories).map(([groupName, cats]: [string, any]) => {
                                        const isExpanded = expandedGroups.includes(groupName)
                                        // Kiểm tra xem trong nhóm này có mục nào được chọn không để highlight
                                        const hasSelection = cats.some((c:any) => selectedCatIds.includes(c.id.toString()))
                                        
                                        return (
                                            <div key={groupName} className={`rounded-xl border overflow-hidden transition-all duration-300 ${hasSelection ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200 bg-white'}`}>
                                                {/* Header Nhóm - Bấm để mở */}
                                                <button 
                                                    onClick={() => toggleGroup(groupName)}
                                                    className="w-full p-4 flex justify-between items-center bg-white hover:bg-slate-50 transition"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Layers className={`w-4 h-4 ${hasSelection ? 'text-blue-600' : 'text-slate-400'}`}/>
                                                        <span className={`font-bold text-sm ${hasSelection ? 'text-blue-700' : 'text-slate-700'}`}>{groupName}</span>
                                                        {hasSelection && <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">Đã chọn</span>}
                                                    </div>
                                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
                                                </button>

                                                {/* Danh sách nội dung bên trong */}
                                                {isExpanded && (
                                                    <div className="p-4 pt-0 border-t border-slate-100 space-y-3 bg-slate-50/50">
                                                        {cats.map((cat: any) => {
                                                            const isSelected = selectedCatIds.includes(cat.id.toString())
                                                            const pairs = memberMap[cat.id.toString()] || []
                                                            
                                                            return (
                                                                <div key={cat.id} className={`p-3 rounded-lg border transition-all ${isSelected ? 'bg-white border-blue-500 ring-1 ring-blue-500/20 shadow-sm' : 'bg-white border-slate-200'}`}>
                                                                    {/* Checkbox */}
                                                                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleCategory(cat.id.toString())}>
                                                                        {isSelected ? <CheckSquare className="w-5 h-5 text-blue-600 flex-shrink-0"/> : <Square className="w-5 h-5 text-slate-300 flex-shrink-0"/>}
                                                                        <div>
                                                                            <p className={`font-bold text-sm ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{cat.name}</p>
                                                                            <p className="text-xs text-slate-500">{cat.level || 'Tự do'}</p>
                                                                        </div>
                                                                    </div>

                                                                    {/* Ô nhập liệu (chỉ hiện khi chọn) */}
                                                                    {isSelected && (
                                                                        <div className="mt-3 pl-8 animate-in fade-in slide-in-from-top-2">
                                                                            <div className="space-y-2">
                                                                                {pairs.map((pair, index) => (
                                                                                    <div key={index} className="flex gap-2 items-center">
                                                                                        <span className="text-xs font-bold text-slate-400 w-8 flex-shrink-0">#{index + 1}</span>
                                                                                        <input type="text" placeholder="VĐV 1" value={pair.player1} onChange={(e) => handleInputChange(cat.id.toString(), index, 'player1', e.target.value)} className="flex-1 p-2 border border-blue-200 bg-blue-50/50 rounded-lg text-sm focus:border-blue-500 outline-none"/>
                                                                                        <span className="text-slate-300">-</span>
                                                                                        <input type="text" placeholder="VĐV 2" value={pair.player2} onChange={(e) => handleInputChange(cat.id.toString(), index, 'player2', e.target.value)} className="flex-1 p-2 border border-blue-200 bg-blue-50/50 rounded-lg text-sm focus:border-blue-500 outline-none"/>
                                                                                        {pairs.length > 1 && <button onClick={() => removePair(cat.id.toString(), index)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                            <button onClick={() => addPair(cat.id.toString())} className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"><Plus className="w-3 h-3"/> Thêm cặp nữa</button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <button onClick={handleRegister} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 shadow-lg hover:shadow-blue-200 transition-all transform hover:-translate-y-0.5">
                                Gửi Đăng Ký ({selectedCatIds.length} nội dung)
                            </button>
                        </div>
                    </div>
                )}

                {/* --- MENU FILTER (TAB KHÁC) --- */}
                {activeTab !== 'register' && (
                    <div className="mb-6 flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
                        {activeTab === 'teams' && <button onClick={() => setViewCatId('all')} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition border ${viewCatId === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>Tất cả</button>}
                        {categories.map(cat => (
                            <button key={cat.id} onClick={() => setViewCatId(cat.id.toString())} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition border flex flex-col items-start ${viewCatId === cat.id.toString() ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}><span>{cat.group_name}</span><span className="text-[10px] opacity-80 font-normal">{cat.name}</span></button>
                        ))}
                    </div>
                )}

                {/* 2. DANH SÁCH ĐỘI */}
                {activeTab === 'teams' && (
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredRegistrations.length === 0 ? <p className="text-slate-400 text-center col-span-2 py-10">Chưa có đội nào đăng ký.</p> :
                            filteredRegistrations.map((reg, idx) => (
                                <div key={reg.id} className="flex items-center gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50 hover:border-blue-200 transition">
                                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-black text-slate-300 border border-slate-200">{idx + 1}</div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-lg">{reg.team_name}</p>
                                        <div className="flex gap-2 text-xs text-slate-500 mt-1"><span className="bg-white px-2 py-0.5 rounded border border-slate-200">{reg.tournament_categories?.group_name} - {reg.tournament_categories?.name}</span></div>
                                        <p className="text-sm text-blue-600 font-medium mt-1 flex items-center gap-1"><Users className="w-3 h-3"/> {reg.members}</p>
                                    </div>
                                    <div className="ml-auto"><span className="text-[10px] px-2 py-1 rounded-full font-bold uppercase bg-green-100 text-green-700">Đã tham gia</span></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. NHÁNH ĐẤU (GIỮ NGUYÊN) */}
                {activeTab === 'bracket' && (
                    <div className="overflow-x-auto pb-4">
                         <div className="min-w-[800px] flex justify-start gap-12">
                            {activeBracket ? activeBracket.map((round: any[], roundIndex: number) => (
                                <div key={roundIndex} className="flex flex-col justify-center gap-8 w-56">
                                    <div className="text-center font-bold text-white uppercase text-xs mb-4 tracking-wider bg-slate-400 py-1 rounded-full">{round.length === 1 ? 'Chung Kết' : `Vòng ${roundIndex + 1}`}</div>
                                    {round.map((match: any, matchIndex: number) => (
                                        <div key={match.id} className="relative flex flex-col gap-px">
                                            {roundIndex < activeBracket.length - 1 && (<div className="absolute top-1/2 -right-12 w-12 h-0.5 bg-slate-200 z-0"></div>)}
                                            {roundIndex < activeBracket.length - 1 && matchIndex % 2 === 0 && (<div className="absolute top-1/2 -right-12 w-0.5 h-[calc(100%+2rem)] bg-slate-200 z-0 translate-y-1/2"></div>)}
                                            <div className={`p-3 border rounded-t-xl text-sm font-bold flex justify-between items-center relative z-10 ${match.winner === match.player1 ? 'text-green-700 bg-green-50 border-green-200' : 'text-slate-700 bg-white border-slate-200'}`}><span>{match.player1}</span>{match.winner === match.player1 && <CheckCircle className="w-4 h-4"/>}</div>
                                            <div className={`p-3 border rounded-b-xl text-sm font-bold flex justify-between items-center -mt-px relative z-10 ${match.winner === match.player2 ? 'text-green-700 bg-green-50 border-green-200' : 'text-slate-700 bg-white border-slate-200'}`}><span>{match.player2}</span>{match.winner === match.player2 && <CheckCircle className="w-4 h-4"/>}</div>
                                        </div>
                                    ))}
                                </div>
                            )) : <div className="w-full text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl"><Trophy className="w-12 h-12 mx-auto mb-2 opacity-20"/><p>Chưa có nhánh đấu.</p></div>}
                            {activeBracket && activeBracket[activeBracket.length - 1][0].winner && (<div className="flex flex-col justify-center items-center w-40 pl-8"><div className="text-center font-bold text-yellow-500 uppercase text-[10px] mb-2 tracking-wider">Nhà Vô Địch</div><div className="p-4 bg-gradient-to-b from-yellow-100 to-yellow-50 border-2 border-yellow-400 text-yellow-800 rounded-2xl shadow-xl text-center"><Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-600"/><p className="font-black text-sm">{activeBracket[activeBracket.length - 1][0].winner}</p></div></div>)}
                         </div>
                    </div>
                )}

                {/* 4. LỊCH THI ĐẤU (GIỮ NGUYÊN) */}
                {activeTab === 'schedule' && (
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map(court => (
                                <div key={court} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                    <div className="bg-slate-100 p-3 text-center font-bold text-slate-700 border-b border-slate-200">SÂN {court}</div>
                                    <div className="p-4 space-y-3 min-h-[200px]"><div className="bg-blue-50 p-3 rounded-lg text-xs border border-blue-100"><span className="font-bold block text-blue-700 mb-1">Trận 1</span><div className="flex justify-between text-slate-600"><span>A</span> <span>vs</span> <span>B</span></div></div><p className="text-center text-xs text-slate-300 italic pt-4">Trống lịch</p></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  )
}