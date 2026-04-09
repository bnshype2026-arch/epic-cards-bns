import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Eye, Loader2, Sparkles, User, Gift, Zap, Filter, ArrowUpDown } from 'lucide-react'

export const AdminDropLogs = () => {
    const [drops, setDrops] = useState([])
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState(new Date())
    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [rarityFilter, setRarityFilter] = useState('All')
    const [sortOrder, setSortOrder] = useState('desc')
    const PAGE_SIZE = 50

    // Main fetch function with pagination and filters
    const fetchDrops = async (pageNumber = 0, isPolling = false) => {
        if (!isPolling) setLoading(true)
        try {
            const from = pageNumber * PAGE_SIZE
            const to = from + PAGE_SIZE - 1

            let query = supabase
                .from('card_instances')
                .select(`
                    id,
                    serial_number,
                    opened_at,
                    locked_discount_percentage,
                    locked_expiry_days,
                    active_from,
                    active_to,
                    user_profiles!card_instances_owner_id_fkey(email),
                    card_templates!inner(name, rarity, image_url)
                `)
                .not('owner_id', 'is', null)
                .order('opened_at', { ascending: sortOrder === 'asc' })

            if (rarityFilter !== 'All') {
                query = query.eq('card_templates.rarity', rarityFilter)
            }

            const { data, error } = await query.range(from, to)

            if (error) throw error
            if (data) {
                if (pageNumber === 0) {
                    setDrops(data)
                } else {
                    setDrops(prev => {
                        // Avoid duplicates when polling appends to existing list
                        const newIds = new Set(data.map(d => d.id))
                        const filteredPrev = prev.filter(p => !newIds.has(p.id))
                        return [...filteredPrev, ...data]
                    })
                }
                setHasMore(data.length === PAGE_SIZE)
                setLastUpdated(new Date())
            }
        } catch (err) {
            console.error('Failed to fetch drop logs:', err)
        } finally {
            if (!isPolling) setLoading(false)
        }
    }

    // Effect for handling filter/sort changes
    useEffect(() => {
        setDrops([])
        setPage(0)
        setHasMore(true)
        fetchDrops(0, false)
    }, [rarityFilter, sortOrder])

    // Set interval for real-time polling every 5 seconds (only polls first page to catch new drops)
    useEffect(() => {
        const intervalId = setInterval(() => {
            if (page === 0 && sortOrder === 'desc') {
                fetchDrops(0, true)
            }
        }, 5000)
        return () => clearInterval(intervalId)
    }, [page, sortOrder, rarityFilter])

    const getRarityAnimationClass = (rarity) => {
        const r = rarity?.toLowerCase()
        if (r === 'epic') return 'animate-epic-glow'
        if (r === 'legendary') return 'animate-legendary-shimmer'
        if (r === 'mythic' || r === 'mystic') return 'animate-mythic-intense'
        return ''
    }

    const formatWeakness = (drop) => {
        // Preference active period, then fallback to expiry days
        if (drop.active_from || drop.active_to) {
            return `Promo: ${drop.active_from ? new Date(drop.active_from).toLocaleDateString() : 'Now'} - ${drop.active_to ? new Date(drop.active_to).toLocaleDateString() : 'Forever'}`
        }
        if (drop.locked_expiry_days) {
            return `Expires in ${drop.locked_expiry_days} days`
        }
        return 'Lifetime Validity'
    }

    return (
        <div className="max-w-7xl mx-auto pb-12 px-4 sm:px-6">
            <style>{`
                @keyframes epicGlow {
                    0%, 100% { text-shadow: 0 0 5px rgba(168, 85, 247, 0.4); }
                    50% { text-shadow: 0 0 15px rgba(168, 85, 247, 0.9), 0 0 20px rgba(168, 85, 247, 0.6); }
                }
                @keyframes legendaryShimmer {
                    0% { text-shadow: 0 0 10px rgba(234, 179, 8, 0.5); transform: scale(1); filter: brightness(1); }
                    50% { text-shadow: 0 0 25px rgba(234, 179, 8, 1), 0 0 40px rgba(255, 215, 0, 0.8); transform: scale(1.05); filter: brightness(1.3); }
                    100% { text-shadow: 0 0 10px rgba(234, 179, 8, 0.5); transform: scale(1); filter: brightness(1); }
                }
                @keyframes mythicIntense {
                    0% { text-shadow: 0 0 15px rgba(239, 68, 68, 0.8), 0 0 30px rgba(239, 68, 68, 0.6); transform: scale(1) rotate(0deg); color: #ff0000; filter: contrast(1.2); }
                    25% { transform: scale(1.08) rotate(1deg); color: #ff4500; text-shadow: 0 0 40px rgba(255, 69, 0, 1); }
                    50% { text-shadow: 0 0 50px rgba(255, 0, 0, 1), 0 0 60px rgba(255, 100, 100, 0.9); transform: scale(1.04) rotate(-1.5deg); color: #ff1493; filter: contrast(1.5) brightness(1.2); }
                    75% { transform: scale(1.08) rotate(1deg); color: #ff00ff; text-shadow: 0 0 40px rgba(255, 0, 255, 1); }
                    100% { text-shadow: 0 0 15px rgba(239, 68, 68, 0.8), 0 0 30px rgba(239, 68, 68, 0.6); transform: scale(1) rotate(0deg); color: #ff0000; filter: contrast(1.2); }
                }
                .animate-epic-glow { animation: epicGlow 2s ease-in-out infinite; display: inline-block; }
                .animate-legendary-shimmer { animation: legendaryShimmer 1.5s ease-in-out infinite; display: inline-block; }
                .animate-mythic-intense { animation: mythicIntense 0.6s ease-in-out infinite; font-weight: 900; letter-spacing: 0.05em; display: inline-block; text-transform: uppercase; }
                
                .scanline {
                    background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2));
                    background-size: 100% 4px;
                    pointer-events: none;
                }
            `}</style>

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4 sm:gap-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-3 uppercase tracking-tight">
                        <Sparkles className="text-yellow-400" />
                        Live Drop Logs
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium tracking-tight">Real-time global monitor of lootbox openings and card acquisitions.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
                    <div className="flex items-center gap-3 bg-surface/80 backdrop-blur border border-white/10 rounded-2xl px-4 py-3 flex-1 lg:flex-initial shadow-lg">
                        <Filter className="text-gray-500 shrink-0" size={18} />
                        <select
                            value={rarityFilter}
                            onChange={(e) => setRarityFilter(e.target.value)}
                            className="bg-transparent text-white focus:outline-none cursor-pointer text-sm font-black uppercase tracking-widest w-full appearance-none pr-8 relative z-10"
                        >
                            <option value="All">All Rarities</option>
                            <option value="Common">Common</option>
                            <option value="Uncommon">Uncommon</option>
                            <option value="Rare">Rare</option>
                            <option value="Epic">Epic</option>
                            <option value="Legendary">Legendary</option>
                            <option value="Mythic">Mythic</option>
                        </select>
                    </div>

                    <div className="bg-surface/80 backdrop-blur border border-white/5 rounded-2xl px-4 py-3 flex items-center justify-between sm:justify-start gap-4 shadow-xl border-b-2 border-b-green-500/20">
                        <div className="flex items-center gap-2">
                            {page === 0 && sortOrder === 'desc' && <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse"></div>}
                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest whitespace-nowrap">Live Stream</span>
                        </div>
                        <span className="text-xs text-white font-mono whitespace-nowrap pl-4 border-l border-white/10 shrink-0 tabular-nums">{lastUpdated.toLocaleTimeString('id-ID')}</span>
                    </div>
                </div>
            </div>

            <div className="bg-surface border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative">
                {/* Visual Radar/Scanline Effect */}
                <div className="absolute inset-0 scanline opacity-10 pointer-events-none"></div>

                {/* Desktop View Table */}
                <div className="hidden lg:block overflow-x-auto relative z-10">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-black/60 border-b border-white/10 text-[10px] uppercase tracking-[0.2em] font-black text-gray-500 relative">
                                <th className="p-4 w-40">Tier Status</th>
                                <th className="p-4 w-56">Foundation</th>
                                <th className="p-4 w-32">Serial ID</th>
                                <th className="p-4 w-32">Attributes</th>
                                <th className="p-4 w-48">Active Window</th>
                                <th className="p-4">Discovered By</th>
                                <th
                                    className="p-4 w-48 cursor-pointer hover:text-white transition-colors group"
                                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                >
                                    <div className="flex items-center gap-2">
                                        Acquisition
                                        <ArrowUpDown size={12} className="opacity-50 group-hover:opacity-100" />
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading && drops.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-16 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <Loader2 className="animate-spin text-primary" size={40} />
                                            <p className="tracking-[0.2em] uppercase text-xs font-black text-gray-500">Linking Neural Feed...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : drops.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center text-gray-500 font-black uppercase tracking-widest text-xs">
                                        No recent anomalies detected.
                                    </td>
                                </tr>
                            ) : (
                                drops.map((drop) => {
                                    const rarityColor = `text-rarity-${drop.card_templates?.rarity?.toLowerCase() || 'common'}`

                                    return (
                                        <tr key={drop.id} className="hover:bg-white/5 transition-colors group/row">
                                            <td className="p-4 align-middle">
                                                <div className={`font-black text-xl tracking-tighter ${rarityColor} ${getRarityAnimationClass(drop.card_templates?.rarity)}`}>
                                                    {drop.card_templates?.rarity}
                                                </div>
                                            </td>

                                            <td className="p-4 align-middle">
                                                <div className="font-black text-white uppercase tracking-tight flex items-center gap-3">
                                                    {(drop.card_templates?.rarity?.toLowerCase() === 'mythic' || drop.card_templates?.rarity?.toLowerCase() === 'mystic') && <Sparkles size={14} className="text-red-500 animate-pulse" />}
                                                    <span className="truncate max-w-[200px]">{drop.card_templates?.name}</span>
                                                </div>
                                            </td>

                                            <td className="p-4 align-middle">
                                                <span className="text-[10px] font-mono font-black text-gray-400 bg-black/60 px-2 py-1 rounded border border-white/5 whitespace-nowrap tracking-widest shadow-inner">
                                                    #{drop.serial_number}
                                                </span>
                                            </td>

                                            <td className="p-4 align-middle">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 font-black text-xs">
                                                    <Zap size={14} />
                                                    {drop.locked_discount_percentage}%
                                                </span>
                                            </td>

                                            <td className="p-4 align-middle">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400/80 bg-orange-500/5 px-2.5 py-1 rounded-lg border border-orange-500/10">
                                                    {formatWeakness(drop)}
                                                </span>
                                            </td>

                                            <td className="p-4 align-middle">
                                                <div className="flex items-center gap-2 text-sm text-gray-300" title={drop.user_profiles?.email || 'Unknown'}>
                                                    <User size={14} className="text-gray-500" />
                                                    <span className="truncate max-w-[180px] font-bold">{drop.user_profiles?.email?.split('@')[0] || 'Unknown'}</span>
                                                </div>
                                            </td>

                                            <td className="p-4 align-middle whitespace-nowrap">
                                                <div className="flex flex-col text-sm text-gray-300">
                                                    <span className="font-bold text-white uppercase text-[10px] tracking-widest">
                                                        {drop.opened_at ? new Date(drop.opened_at).toLocaleDateString('id-ID') : 'N/A'}
                                                    </span>
                                                    {drop.opened_at && (
                                                        <span className="text-[10px] text-primary font-black mt-0.5 tracking-tighter tabular-nums">
                                                            {new Date(drop.opened_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View Cards */}
                <div className="lg:hidden divide-y divide-white/5 relative z-10">
                    {loading && drops.length === 0 ? (
                        <div className="p-16 text-center">
                            <Loader2 className="animate-spin text-primary mx-auto mb-4" size={32} />
                            <p className="tracking-[0.2em] uppercase text-[10px] font-black text-gray-500">Neural Sync...</p>
                        </div>
                    ) : drops.length === 0 ? (
                        <div className="p-12 text-center text-gray-500 font-black uppercase tracking-widest text-[10px]">
                            No live feed detected.
                        </div>
                    ) : (
                        drops.map((drop) => (
                            <div key={drop.id} className="p-5 flex flex-col gap-4 group/card active:bg-white/5 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                        <div className={`text-xl font-black tracking-tighter uppercase ${getRarityAnimationClass(drop.card_templates?.rarity)} text-rarity-${drop.card_templates?.rarity?.toLowerCase()}`}>
                                            {drop.card_templates?.rarity}
                                        </div>
                                        <div className="text-sm font-black text-white uppercase tracking-tight mt-0.5 truncate max-w-[200px]">
                                            {drop.card_templates?.name}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-mono font-black text-gray-500 bg-black/40 px-2 py-1 rounded border border-white/5 tracking-widest">
                                            #{drop.serial_number.split('-').pop()}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-black/30 p-2.5 rounded-2xl border border-white/5 flex flex-col gap-1 items-center justify-center">
                                        <span className="text-[8px] text-gray-500 font-black uppercase tracking-[0.2em]">Acquisition</span>
                                        <span className="text-[10px] text-white font-black tabular-nums">
                                            {drop.opened_at ? new Date(drop.opened_at).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' }) : '---'}
                                        </span>
                                    </div>
                                    <div className="bg-white/5 p-2.5 rounded-2xl border border-white/5 flex flex-col gap-1 items-center justify-center">
                                        <span className="text-[8px] text-gray-500 font-black uppercase tracking-[0.2em]">Discovered By</span>
                                        <span className="text-[10px] text-primary font-black truncate w-full text-center">
                                            {drop.user_profiles?.email?.split('@')[0] || 'Unknown'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 flex items-center gap-2 bg-green-500/10 px-3 py-2 rounded-xl border border-green-500/20">
                                        <Zap size={12} className="text-green-400" />
                                        <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Power: {drop.locked_discount_percentage}% OFF</span>
                                    </div>
                                    <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                                        {drop.opened_at ? new Date(drop.opened_at).toLocaleDateString('id-ID') : ''}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {hasMore && (
                <div className="flex justify-center mt-6">
                    <button
                        onClick={() => {
                            const nextPage = page + 1
                            setPage(nextPage)
                            fetchDrops(nextPage, false)
                        }}
                        disabled={loading}
                        className="px-6 py-2.5 bg-surface/50 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-sm font-bold flex items-center gap-2"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        Load Older Drops
                    </button>
                </div>
            )}
        </div>
    )
}
