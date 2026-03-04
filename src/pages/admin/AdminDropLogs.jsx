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
        <div className="max-w-7xl mx-auto">
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

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Sparkles className="text-yellow-400" />
                        Live Drop Logs
                    </h1>
                    <p className="text-gray-400 mt-2">Real-time global monitor of lootbox openings and card acquisitions.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
                    <div className="flex items-center gap-3 bg-surface/50 border border-white/10 rounded-xl px-4 py-2 flex-1 sm:flex-initial">
                        <Filter className="text-gray-500" size={16} />
                        <select
                            value={rarityFilter}
                            onChange={(e) => setRarityFilter(e.target.value)}
                            className="bg-transparent text-white focus:outline-none cursor-pointer text-sm font-medium w-full"
                        >
                            <option value="All" className="bg-[#1e1e24]">All Rarities</option>
                            <option value="Common" className="bg-[#1e1e24] text-gray-400">Common</option>
                            <option value="Uncommon" className="bg-[#1e1e24] text-green-400">Uncommon</option>
                            <option value="Rare" className="bg-[#1e1e24] text-blue-400">Rare</option>
                            <option value="Epic" className="bg-[#1e1e24] text-purple-400">Epic</option>
                            <option value="Legendary" className="bg-[#1e1e24] text-yellow-400">Legendary</option>
                            <option value="Mythic" className="bg-[#1e1e24] text-red-500">Mythic / Mystic</option>
                        </select>
                    </div>

                    <div className="bg-surface/50 border border-white/5 rounded-xl px-4 py-2 flex items-center justify-between sm:justify-start gap-3">
                        <span className="text-sm text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5 flex-nowrap shrink-0">
                            {page === 0 && sortOrder === 'desc' && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>} Live Updates
                        </span>
                        <span className="text-xs text-gray-500 font-mono whitespace-nowrap pl-2 border-l border-white/10 shrink-0">Updated: {lastUpdated.toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>

            <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative">
                {/* Visual Radar/Scanline Effect */}
                <div className="absolute inset-0 scanline opacity-20"></div>

                <div className="overflow-x-auto relative z-10">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-black/60 border-b border-white/10 text-[10px] uppercase tracking-[0.2em] font-black text-gray-500 relative">
                                <th className="p-4 w-40">Rarity</th>
                                <th className="p-4 w-56">Card Name</th>
                                <th className="p-4 w-32">Serial</th>
                                <th className="p-4 w-32">Power (Discount)</th>
                                <th className="p-4 w-48">Weakness (Validity)</th>
                                <th className="p-4">Owner (Finder)</th>
                                <th
                                    className="p-4 w-48 cursor-pointer hover:text-white transition-colors group flex items-center gap-2"
                                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                >
                                    Acquired At (WIB)
                                    <ArrowUpDown size={12} className="opacity-50 group-hover:opacity-100" />
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading && drops.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-16 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <Loader2 className="animate-spin text-primary" size={32} />
                                            <p className="tracking-widest uppercase text-xs font-bold">Connecting to Drop Feed...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : drops.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center text-gray-500">
                                        No drops recorded in the database natively yet.
                                    </td>
                                </tr>
                            ) : (
                                drops.map((drop) => {
                                    const rarityColor = `text-rarity-${drop.card_templates?.rarity?.toLowerCase() || 'common'}`

                                    return (
                                        <tr key={drop.id} className="hover:bg-white/5 transition-colors group">
                                            {/* Rarity */}
                                            <td className="p-4 align-middle">
                                                <div className={`font-black text-lg ${rarityColor} ${getRarityAnimationClass(drop.card_templates?.rarity)}`}>
                                                    {drop.card_templates?.rarity}
                                                </div>
                                            </td>

                                            {/* Name */}
                                            <td className="p-4 align-middle">
                                                <div className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                                    {(drop.card_templates?.rarity?.toLowerCase() === 'mythic' || drop.card_templates?.rarity?.toLowerCase() === 'mystic') && <Sparkles size={14} className="text-red-500 animate-ping absolute -ml-5" />}
                                                    <span className="truncate max-w-[200px]" title={drop.card_templates?.name}>{drop.card_templates?.name}</span>
                                                </div>
                                            </td>

                                            {/* Serial */}
                                            <td className="p-4 align-middle">
                                                <span className="text-xs font-mono text-gray-300 bg-black/40 px-2 py-1 rounded border border-white/5 whitespace-nowrap">
                                                    #{drop.serial_number}
                                                </span>
                                            </td>

                                            {/* Power */}
                                            <td className="p-4 align-middle">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-green-500/10 border border-green-500/30 text-green-400 font-black shadow-[0_0_10px_rgba(34,197,94,0.1)] group-hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-shadow">
                                                    <Zap size={14} />
                                                    {drop.locked_discount_percentage}% OFF
                                                </span>
                                            </td>

                                            {/* Weakness (Validity) */}
                                            <td className="p-4 align-middle">
                                                <span className="text-xs font-mono text-orange-300 bg-orange-500/10 px-2.5 py-1 rounded border border-orange-500/20 whitespace-nowrap">
                                                    {formatWeakness(drop)}
                                                </span>
                                            </td>

                                            {/* Owner */}
                                            <td className="p-4 align-middle">
                                                <div className="flex items-center gap-2 text-sm text-gray-300" title={drop.user_profiles?.email || 'Unknown'}>
                                                    <User size={14} className="text-gray-500" />
                                                    <span className="truncate max-w-[180px] font-medium">{drop.user_profiles?.email || 'Unknown'}</span>
                                                </div>
                                            </td>

                                            {/* Acquired At */}
                                            <td className="p-4 align-middle whitespace-nowrap">
                                                <div className="flex flex-col text-sm text-gray-300">
                                                    <span className="font-medium text-white">
                                                        {drop.opened_at ? new Date(drop.opened_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }) : 'N/A'}
                                                    </span>
                                                    {drop.opened_at && (
                                                        <span className="text-xs text-blue-400/70 font-mono mt-0.5 tracking-wider">
                                                            {new Date(drop.opened_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}
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
