import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { FileText, Clock, Hash, User, Loader2, ArrowUpDown, Download } from 'lucide-react'
import { exportToExcel } from '../../utils/exportExcel'
export const AdminActivatedCards = () => {
    const [activations, setActivations] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [sortOrder, setSortOrder] = useState('desc') // 'desc' | 'asc'
    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const PAGE_SIZE = 50

    useEffect(() => {
        setActivations([])
        setPage(0)
        setHasMore(true)
        fetchActivations(0)
    }, [sortOrder])

    const fetchActivations = async (pageNumber) => {
        setLoading(true)
        try {
            const from = pageNumber * PAGE_SIZE
            const to = from + PAGE_SIZE - 1
            const { data, error: fetchError } = await supabase
                .from('card_instances')
                .select(`
          id,
          serial_number,
          opened_at,
          activated_at,
          activated_invoice_number,
          user_profiles!card_instances_owner_id_fkey(email),
          activator:user_profiles!card_instances_activated_by_fkey(email),
          card_templates(name, rarity)
        `)
                .eq('activation_status', 'Activated')
                .order('activated_at', { ascending: sortOrder === 'asc' })
                .range(from, to)

            if (fetchError) throw fetchError

            if (data) {
                if (pageNumber === 0) {
                    setActivations(data)
                } else {
                    setActivations(prev => [...prev, ...data])
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

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <FileText className="text-primary" />
                        Activated Cards Ledger
                    </h1>
                    <p className="text-gray-400 mt-2">Log of all successfully activated cards and their associated invoices.</p>
                </div>

                <div className="flex bg-surface/50 border border-white/5 rounded-xl overflow-hidden w-full sm:w-auto">
                    <div className="px-4 py-2 flex items-center gap-3 bg-black/20">
                        <span className="text-sm text-gray-400 font-bold uppercase tracking-wider">Total Records</span>
                        <span className="text-2xl font-mono text-white">{activations.length}</span>
                    </div>
                    <button
                        onClick={() => {
                            const exportData = activations.map(record => ({
                                'Card Name': record.card_templates?.name,
                                'Rarity': record.card_templates?.rarity,
                                'Serial Number': record.serial_number,
                                'Opened At (WIB)': record.opened_at ? new Date(record.opened_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : 'Legacy',
                                'Activated At (WIB)': new Date(record.activated_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
                                'Invoice Ref': record.activated_invoice_number || 'Legacy Activation',
                                'Owner Email': record.user_profiles?.email || 'Unknown',
                                'Activated By': record.activator?.email || 'System'
                            }))
                            exportToExcel(exportData, 'Activated_Cards_Export')
                        }}
                        className="px-4 py-2 flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 font-bold transition-colors border-l border-white/5"
                        title="Export to Excel"
                    >
                        <Download size={18} />
                        Export
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-8 font-medium">
                    Error loading ledger: {error}
                </div>
            )}

            <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/40 border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
                                <th className="p-4 font-semibold w-48">Card Instance</th>
                                <th className="p-4 font-semibold w-40">Serial Number</th>
                                <th className="p-4 font-semibold">Date Opened (WIB)</th>
                                <th className="p-4 font-semibold cursor-pointer hover:bg-white/5 transition-colors group" onClick={toggleSort}>
                                    <div className="flex items-center gap-2">
                                        Activation Time (WIB)
                                        <ArrowUpDown size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </th>
                                <th className="p-4 font-semibold w-56">Invoice Ref</th>
                                <th className="p-4 font-semibold">Owner Email</th>
                                <th className="p-4 font-semibold">Activated By (Admin)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <Loader2 className="animate-spin text-primary" size={32} />
                                            <p>Loading ledger records...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : activations.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center text-gray-500">
                                        No activated cards found in the system.
                                    </td>
                                </tr>
                            ) : (
                                activations.map((record) => (
                                    <tr key={record.id} className="hover:bg-white/5 transition-colors">
                                        {/* Instance Column */}
                                        <td className="p-4 align-top">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-bold text-white max-w-[200px] truncate" title={record.card_templates?.name}>
                                                    {record.card_templates?.name}
                                                </span>
                                                <div>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-rarity-${record.card_templates?.rarity.toLowerCase()}/20 text-rarity-${record.card_templates?.rarity.toLowerCase()}`}>
                                                        {record.card_templates?.rarity}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Serial Column */}
                                        <td className="p-4 align-top whitespace-nowrap">
                                            <span className="text-xs font-mono text-gray-400 bg-black/40 px-2 py-1 rounded flex items-center gap-1 w-fit">
                                                <Hash size={12} /> {record.serial_number}
                                            </span>
                                        </td>

                                        {/* Opened At Column */}
                                        <td className="p-4 align-top whitespace-nowrap">
                                            <div className="flex flex-col text-sm text-gray-300">
                                                <span className="text-white">
                                                    {record.opened_at ? new Date(record.opened_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }) : 'Legacy'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Time Column */}
                                        <td className="p-4 align-top whitespace-nowrap">
                                            <div className="flex flex-col text-sm text-gray-300">
                                                <span className="font-medium text-white">
                                                    {new Date(record.activated_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}
                                                </span>
                                                <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                    <Clock size={12} /> {new Date(record.activated_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Invoice Column */}
                                        <td className="p-4 align-top">
                                            {record.activated_invoice_number ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 font-mono text-sm shadow-inner">
                                                    <FileText size={14} />
                                                    {record.activated_invoice_number}
                                                </span>
                                            ) : (
                                                <span className="text-gray-600 text-sm italic">Legacy Activation</span>
                                            )}
                                        </td>

                                        {/* Owner Column */}
                                        <td className="p-4 align-top">
                                            <div className="flex items-center gap-2 text-sm text-gray-300 truncate max-w-[200px]" title={record.user_profiles?.email || 'Unknown'}>
                                                <User size={14} className="text-gray-500 shrink-0" />
                                                <span className="truncate">{record.user_profiles?.email || 'Unknown'}</span>
                                            </div>
                                        </td>

                                        {/* Admin Column */}
                                        <td className="p-4 align-top">
                                            <div className="flex flex-col text-sm text-gray-400">
                                                <span className="truncate max-w-[200px]" title={record.activator?.email || 'System'}>
                                                    {record.activator?.email || 'System'}
                                                </span>
                                                {record.activator?.email === record.user_profiles?.email && (
                                                    <span className="text-[10px] text-orange-400 mt-0.5">Self-activated (Warning)</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
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
                            fetchActivations(nextPage)
                        }}
                        className="px-6 py-2.5 bg-surface/50 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-sm font-bold"
                    >
                        Load Older Activations
                    </button>
                </div>
            )}
        </div>
    )
}
