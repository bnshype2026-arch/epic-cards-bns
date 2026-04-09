import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { FileText, Clock, Hash, User, Loader2, ArrowUpDown, Ban, Search, Filter, Database, Download } from 'lucide-react'
import { exportToExcel } from '../../utils/exportExcel'
export const AdminCardLibrary = () => {
    const [cards, setCards] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [sortOrder, setSortOrder] = useState('desc') // 'desc' | 'asc'
    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('All') // All, Activated, Inactive, Expired, Disabled
    const [disablingId, setDisablingId] = useState(null)

    const PAGE_SIZE = 50

    useEffect(() => {
        setCards([])
        setPage(0)
        setHasMore(true)
        fetchCards(0)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortOrder, statusFilter]) // Refresh when sort or status changes

    // Added a slight debounce/manual trigger for search to avoid thrashing the DB
    const handleSearch = (e) => {
        e.preventDefault()
        setCards([])
        setPage(0)
        setHasMore(true)
        fetchCards(0)
    }

    const fetchCards = async (pageNumber) => {
        setLoading(true)
        try {
            const from = pageNumber * PAGE_SIZE
            const to = from + PAGE_SIZE - 1

            let query = supabase
                .from('card_instances')
                .select(`
                    id,
                    serial_number,
                    activation_status,
                    pool_status,
                    opened_at,
                    expiry_date,
                    activated_at,
                    activated_invoice_number,
                    locked_discount_percentage,
                    active_from,
                    active_to,
                    user_profiles!card_instances_owner_id_fkey(email),
                    card_templates(name, rarity, discount_percentage)
                `)
                .not('owner_id', 'is', null) // Only fetch cards that have been distributed/opened
                .order('opened_at', { ascending: sortOrder === 'asc' })

            // Apply Filters
            if (statusFilter !== 'All') {
                if (statusFilter === 'Expired') {
                    const now = new Date().toISOString()
                    query = query.or(`activation_status.eq.Expired,and(activation_status.eq.Inactive,expiry_date.lt.${now})`)
                } else if (statusFilter === 'Inactive') {
                    const now = new Date().toISOString()
                    // Must be Inactive AND (expiry_date >= now OR expiry_date IS NULL)
                    query = query.eq('activation_status', 'Inactive').or(`expiry_date.gte.${now},expiry_date.is.null`)
                } else {
                    query = query.eq('activation_status', statusFilter)
                }
            }

            if (searchQuery.trim() !== '') {
                // Supabase text search on serial_number or owner email
                // For simplicity in a single query without complex RPCs, we'll check serial_number exact match
                // or ilike on serial.
                query = query.ilike('serial_number', `%${searchQuery.trim()}%`)
            }

            const { data, error: fetchError } = await query.range(from, to)

            if (fetchError) throw fetchError

            if (data) {
                if (pageNumber === 0) {
                    setCards(data)
                } else {
                    setCards(prev => [...prev, ...data])
                }
                setHasMore(data.length === PAGE_SIZE)
            }
        } catch (err) {
            console.error(err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const toggleSort = () => {
        setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))
    }

    const handleDisableCard = async (instanceId, serialNumber) => {
        // Confirmation dialog
        const confirmed = window.confirm(`WARNING: Are you absolutely sure you want to DISABLE card #${serialNumber}?\n\nThis will permanently void the card, making it un-activatable and unusable for the customer. This action cannot be easily undone without database access.`)
        if (!confirmed) return

        setDisablingId(instanceId)
        try {
            // Update the activation_status to Disabled
            const { error: updateError } = await supabase
                .from('card_instances')
                .update({ activation_status: 'Disabled' })
                .eq('id', instanceId)

            if (updateError) throw updateError

            // Update UI optimistically
            setCards(prevCards =>
                prevCards.map(card =>
                    card.id === instanceId
                        ? { ...card, activation_status: 'Disabled' }
                        : card
                )
            )

            // Optional: Log this action in audit_logs
            const { data: userData } = await supabase.auth.getUser()
            if (userData?.user) {
                await supabase.from('audit_logs').insert([{
                    user_id: userData.user.id,
                    action: 'ADMIN_DISABLED_CARD',
                    details: { instance_id: instanceId, serial_number: serialNumber }
                }])
            }

            alert(`Card #${serialNumber} has been successfully disabled.`)
        } catch (err) {
            console.error('Failed to disable card:', err)
            alert(`Failed to disable card: ${err.message}`)
        } finally {
            setDisablingId(null)
        }
    }

    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4 sm:gap-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-3 uppercase tracking-tight">
                        <Database className="text-primary" />
                        Master Card Library
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium">View all distributed cards. Manage statuses and void active items.</p>
                </div>

                <div className="bg-surface/80 backdrop-blur border border-white/5 rounded-2xl overflow-hidden w-full sm:w-auto shadow-xl flex">
                    <div className="flex-1 sm:flex-none px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 bg-black/20">
                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none">Total Distributed</span>
                        <span className="text-xl sm:text-2xl font-black text-white leading-none">{cards.length.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-surface/80 backdrop-blur border border-white/10 rounded-2xl p-4 mb-6 flex flex-col lg:flex-row gap-4 shadow-lg">
                <form onSubmit={handleSearch} className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search Serial Number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary transition-colors text-sm sm:text-base"
                    />
                </form>

                <div className="flex flex-col sm:flex-row gap-4 shrink-0">
                    <div className="flex items-center gap-3 flex-1 sm:flex-none bg-black/20 px-3 py-1 rounded-xl border border-white/5">
                        <Filter className="text-gray-500" size={18} />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-transparent border-none rounded-xl py-2 text-sm text-white focus:outline-none cursor-pointer flex-1"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Inactive">Active (Unused)</option>
                            <option value="Activated">Activated (Used)</option>
                            <option value="Expired">Expired</option>
                            <option value="Disabled">Disabled</option>
                        </select>
                    </div>

                    <button
                        onClick={() => {
                            const exportData = cards.map(card => {
                                const expiryStr = card.expiry_date ? new Date(card.expiry_date).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : ''
                                const activatedStr = card.activated_at ? new Date(card.activated_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : ''

                                return {
                                    'Status':
                                        card.activation_status === 'Disabled' ? 'Disabled' :
                                            card.activation_status === 'Activated' ? 'Activated' :
                                                (card.activation_status === 'Inactive' && card.expiry_date && new Date(card.expiry_date) < new Date()) ? 'Expired' :
                                                    (card.activation_status === 'Inactive' ? 'Active' : card.activation_status),
                                    'Card Name': card.card_templates?.name,
                                    'Rarity': card.card_templates?.rarity,
                                    'Discount (%)': card.locked_discount_percentage || card.card_templates?.discount_percentage || 0,
                                    'Serial Number': card.serial_number,
                                    'Owner Email': card.user_profiles?.email || 'N/A',
                                    'Acquired At (WIB)': card.opened_at ? new Date(card.opened_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '',
                                    'Expiry Date (WIB)': expiryStr,
                                    'Activated At (WIB)': activatedStr,
                                    'Invoice Ref': card.activated_invoice_number || ''
                                }
                            })
                            exportToExcel(exportData, 'Master_Card_Library_Export')
                        }}
                        className="px-6 py-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 font-black uppercase tracking-tighter border border-green-500/20 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <Download size={18} />
                        <span className="text-sm">Export</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-8 font-medium">
                    Error loading library: {error}
                </div>
            )}

            <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                {/* Desktop View Table */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-black/40 border-b border-white/10 text-xs uppercase tracking-wider text-gray-400 font-black">
                                <th className="p-4 font-semibold w-48">Card Details</th>
                                <th className="p-4 font-semibold w-32">Serial</th>
                                <th className="p-4 font-semibold w-32">Status</th>
                                <th className="p-4 font-semibold">Owner Email</th>
                                <th className="p-4 font-semibold cursor-pointer hover:bg-white/5 transition-colors group" onClick={toggleSort}>
                                    <div className="flex items-center gap-2">
                                        Acquired Date
                                        <ArrowUpDown size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </th>
                                <th className="p-4 font-semibold">Validity & Invoice</th>
                                <th className="p-4 font-semibold min-w-[100px] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading && cards.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <Loader2 className="animate-spin text-primary" size={32} />
                                            <p>Loading global card library...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : cards.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center text-gray-500 font-medium">
                                        No cards found matching criteria.
                                    </td>
                                </tr>
                            ) : (
                                cards.map((card) => {
                                    let displayStatus = card.activation_status
                                    const isRealTimeExpired = card.activation_status === 'Inactive' && card.expiry_date && new Date(card.expiry_date) < new Date()
                                    if (isRealTimeExpired) displayStatus = 'Expired'

                                    return (
                                        <tr key={card.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4 align-top">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-bold text-white max-w-[180px] truncate" title={card.card_templates?.name}>
                                                        {card.card_templates?.name}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-rarity-${card.card_templates?.rarity.toLowerCase()}/20 text-rarity-${card.card_templates?.rarity.toLowerCase()}`}>
                                                            {card.card_templates?.rarity}
                                                        </span>
                                                        <span className="text-xs font-mono text-green-400">
                                                            -{card.locked_discount_percentage || card.card_templates?.discount_percentage || 0}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="p-4 align-top whitespace-nowrap">
                                                <span className="text-xs font-mono text-gray-300 bg-black/40 px-2 py-1 rounded flex items-center gap-1 w-fit border border-white/5">
                                                    <Hash size={12} className="text-gray-500" /> {card.serial_number}
                                                </span>
                                            </td>

                                            <td className="p-4 align-top">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md inline-flex items-center gap-1
                                                    ${displayStatus === 'Activated' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : ''}
                                                    ${displayStatus === 'Inactive' ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_8px_rgba(168,85,247,0.2)]' : ''}
                                                    ${displayStatus === 'Expired' ? 'bg-gray-500/10 text-gray-400 border border-gray-500/20' : ''}
                                                    ${displayStatus === 'Disabled' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : ''}
                                                `}>
                                                    {displayStatus === 'Inactive' ? 'Active' : displayStatus}
                                                </span>
                                            </td>

                                            <td className="p-4 align-top">
                                                <div className="flex items-center gap-2 text-sm text-gray-300 max-w-[180px]" title={card.user_profiles?.email || 'Unknown'}>
                                                    <User size={14} className="text-gray-500 shrink-0" />
                                                    <span className="truncate">{card.user_profiles?.email || 'Unknown'}</span>
                                                </div>
                                            </td>

                                            <td className="p-4 align-top whitespace-nowrap">
                                                <div className="flex flex-col text-sm text-gray-300">
                                                    <span className="font-medium text-white">
                                                        {card.opened_at ? new Date(card.opened_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }) : <span className="text-gray-600 italic">N/A</span>}
                                                    </span>
                                                    {card.opened_at && (
                                                        <span className="text-[10px] text-gray-500 flex items-center gap-1 font-bold">
                                                            <Clock size={10} /> {new Date(card.opened_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="p-4 align-top">
                                                <div className="flex flex-col gap-1.5 text-xs">
                                                    {displayStatus === 'Disabled' ? (
                                                        <div className="text-red-500 font-extrabold tracking-widest uppercase text-[10px]">VOIDED</div>
                                                    ) : displayStatus === 'Activated' ? (
                                                        <>
                                                            <div className="text-green-400 font-bold">
                                                                Activated: {card.activated_at ? new Date(card.activated_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }) : 'YES'}
                                                            </div>
                                                            {card.activated_invoice_number && (
                                                                <div className="font-mono bg-black/40 px-2 py-0.5 rounded w-fit text-gray-300 border border-white/5 text-[10px]">
                                                                    REF: {card.activated_invoice_number}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : card.expiry_date ? (
                                                        <div className={isRealTimeExpired ? 'text-gray-500 line-through' : 'text-primary font-bold'}>
                                                            Expires: {new Date(card.expiry_date).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}
                                                        </div>
                                                    ) : (
                                                        <div className="text-gray-500 italic">Lifetime Validity</div>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="p-4 align-top text-right">
                                                {card.activation_status !== 'Disabled' ? (
                                                    <button
                                                        onClick={() => handleDisableCard(card.id, card.serial_number)}
                                                        disabled={disablingId === card.id}
                                                        className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all text-xs font-black uppercase tracking-tighter inline-flex items-center gap-1.5 disabled:opacity-50"
                                                    >
                                                        {disablingId === card.id ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />}
                                                        Void
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Voided</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View Cards */}
                <div className="lg:hidden divide-y divide-white/5">
                    {loading && cards.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <Loader2 className="animate-spin text-primary mx-auto mb-3" size={32} />
                            <p>Loading library...</p>
                        </div>
                    ) : cards.length === 0 ? (
                        <div className="p-12 text-center text-gray-500 font-medium">
                            No cards found matching criteria.
                        </div>
                    ) : (
                        cards.map((card) => {
                            let displayStatus = card.activation_status
                            const isRealTimeExpired = card.activation_status === 'Inactive' && card.expiry_date && new Date(card.expiry_date) < new Date()
                            if (isRealTimeExpired) displayStatus = 'Expired'

                            return (
                                <div key={card.id} className="p-4 flex flex-col gap-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-black text-white text-lg leading-tight uppercase tracking-tighter">
                                                {card.card_templates?.name}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-rarity-${card.card_templates?.rarity.toLowerCase()}/20 text-rarity-${card.card_templates?.rarity.toLowerCase()}`}>
                                                    {card.card_templates?.rarity}
                                                </span>
                                                <span className="text-[10px] font-mono text-green-400 bg-green-400/10 px-1 rounded">
                                                    -{card.locked_discount_percentage || card.card_templates?.discount_percentage || 0}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-1">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md
                                                ${displayStatus === 'Activated' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : ''}
                                                ${displayStatus === 'Inactive' ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_8px_rgba(168,85,247,0.2)]' : ''}
                                                ${displayStatus === 'Expired' ? 'bg-gray-500/10 text-gray-400 border border-gray-500/20' : ''}
                                                ${displayStatus === 'Disabled' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : ''}
                                            `}>
                                                {displayStatus === 'Inactive' ? 'Active' : displayStatus}
                                            </span>
                                            <span className="text-[9px] font-mono text-gray-500 tracking-tighter">{card.serial_number}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                                            <span className="block text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">Owner Email</span>
                                            <div className="flex items-center gap-1.5">
                                                <User size={10} className="text-gray-500 shrink-0" />
                                                <span className="text-[10px] text-white truncate font-medium">
                                                    {card.user_profiles?.email || 'Unknown'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                                            <span className="block text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">Acquired On</span>
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={10} className="text-gray-500 shrink-0" />
                                                <span className="text-[10px] text-white font-medium">
                                                    {card.opened_at ? new Date(card.opened_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }) : 'Legacy'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Validity Details</span>
                                            {displayStatus === 'Activated' ? (
                                                <span className="text-[10px] text-green-400 font-bold uppercase tracking-tight">
                                                    Activated via {card.activated_invoice_number || 'Legacy'}
                                                </span>
                                            ) : card.expiry_date ? (
                                                <span className={`text-[10px] font-bold ${isRealTimeExpired ? 'text-red-400' : 'text-primary'}`}>
                                                    Expires {new Date(card.expiry_date).toLocaleDateString()}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-gray-400 font-bold">Lifetime Validity</span>
                                            )}
                                        </div>
                                        
                                        {card.activation_status !== 'Disabled' && (
                                            <button
                                                onClick={() => handleDisableCard(card.id, card.serial_number)}
                                                disabled={disablingId === card.id}
                                                className="px-4 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-all text-[10px] font-black uppercase tracking-widest"
                                            >
                                                {disablingId === card.id ? '...' : 'Void Card'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {hasMore && (
                <div className="flex justify-center mt-6">
                    <button
                        onClick={() => {
                            const nextPage = page + 1
                            setPage(nextPage)
                            fetchCards(nextPage)
                        }}
                        disabled={loading}
                        className="px-6 py-2.5 bg-surface/50 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-sm font-bold flex items-center gap-2"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        Load More Records
                    </button>
                </div>
            )}
        </div>
    )
}
