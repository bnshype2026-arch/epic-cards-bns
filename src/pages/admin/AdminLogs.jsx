import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { FileText, Clock, Gift, User, Loader2, Download, ArrowUpDown } from 'lucide-react'
import { exportToExcel } from '../../utils/exportExcel'

export const AdminLogs = () => {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [sortOrder, setSortOrder] = useState('desc')
    const PAGE_SIZE = 50

    useEffect(() => {
        setPage(0)
        setHasMore(true)
        setLogs([])
        fetchLogs(0)
    }, [sortOrder])

    const fetchLogs = async (pageNumber) => {
        try {
            const from = pageNumber * PAGE_SIZE
            const to = from + PAGE_SIZE - 1

            const { data, error } = await supabase
                .from('audit_logs')
                .select('*, user_profiles(email)')
                .eq('action', 'GRANTED_BOX')
                .order('created_at', { ascending: sortOrder === 'asc' })
                .range(from, to)

            if (error) throw error

            if (data) {
                if (pageNumber === 0) {
                    setLogs(data)
                } else {
                    setLogs(prev => [...prev, ...data])
                }
                setHasMore(data.length === PAGE_SIZE)
            }
        } catch (err) {
            console.error('Error fetching admin logs:', err)
        } finally {
            setLoading(false)
        }
    }

    const filteredLogs = logs.filter(log => {
        const emailMatch = log.user_profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase())
        const adminMatch = log.details.admin_email?.toLowerCase().includes(searchQuery.toLowerCase())
        const invoiceMatch = log.details.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase())
        return emailMatch || adminMatch || invoiceMatch
    })

    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 sm:gap-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-3 uppercase tracking-tight">
                        <Gift className="text-primary" />
                        Lootbox Grant Ledger
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium tracking-tight">Comprehensive audit log of all manual lootbox grants.</p>
                </div>

                <div className="flex bg-surface/80 backdrop-blur border border-white/5 rounded-2xl overflow-hidden w-full sm:w-auto shadow-xl">
                    <div className="flex-1 sm:flex-none px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 bg-black/20">
                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none">Total Distributed</span>
                        <span className="text-xl sm:text-2xl font-black text-white leading-none">{filteredLogs.length}</span>
                    </div>
                    <button
                        onClick={() => {
                            const exportData = filteredLogs.map(log => ({
                                'Timestamp (WIB)': new Date(log.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
                                'Recipient Email': log.user_profiles?.email || 'Unknown',
                                'Recipient ID': log.user_id,
                                'Amount': log.details.amount,
                                'Invoice Ref': log.details.invoice_number || 'N/A',
                                'Authorized By': log.details.admin_email || 'System'
                            }))
                            exportToExcel(exportData, 'Grant_Logs_Export')
                        }}
                        className="px-6 py-3 flex items-center justify-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 font-black uppercase tracking-tighter transition-all border-l border-white/5 active:scale-95"
                        title="Export to Excel"
                    >
                        <Download size={18} />
                        <span className="text-sm">Export</span>
                    </button>
                </div>
            </div>

            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search Logs..."
                    className="w-full bg-surface/80 backdrop-blur border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary transition-all shadow-lg text-sm sm:text-base"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                {/* Desktop View Table */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/40 border-b border-white/10 text-xs uppercase tracking-wider text-gray-400 font-black">
                                <th
                                    className="p-4 font-semibold w-48 cursor-pointer hover:bg-white/5 transition-colors group"
                                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                >
                                    <div className="flex items-center gap-2">
                                        Timestamp (WIB)
                                        <ArrowUpDown size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </th>
                                <th className="p-4 font-semibold">Recipient (User)</th>
                                <th className="p-4 font-semibold w-32 text-center">Amount</th>
                                <th className="p-4 font-semibold w-56">Invoice Ref</th>
                                <th className="p-4 font-semibold">Authorized By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading && logs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <Loader2 className="animate-spin text-primary" size={32} />
                                            <p className="text-xs font-black uppercase text-gray-500 tracking-widest">Calibrating Archive...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">
                                        No ledger entries found.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 align-top whitespace-nowrap">
                                            <div className="flex flex-col text-sm text-gray-300">
                                                <span className="font-bold text-white">
                                                    {new Date(log.created_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}
                                                </span>
                                                <span className="text-[10px] text-gray-500 font-black uppercase flex items-center gap-1 mt-0.5 tracking-tighter">
                                                    <Clock size={10} /> {new Date(log.created_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="p-4 align-top">
                                            <div className="flex items-center gap-2 text-sm text-white truncate max-w-[200px]" title={log.user_profiles?.email || 'Unknown'}>
                                                <User size={14} className="text-gray-400 shrink-0" />
                                                <span className="truncate flex-1 font-medium">{log.user_profiles?.email || 'Unknown'}</span>
                                            </div>
                                            <span className="text-[10px] font-mono text-gray-500 block mt-1">ID: {log.user_id.substring(0, 12)}...</span>
                                        </td>

                                        <td className="p-4 align-top text-center">
                                            <span className="inline-flex items-center justify-center bg-primary/10 text-primary font-black px-3 py-1 rounded-lg border border-primary/20 text-lg">
                                                +{log.details.amount}
                                            </span>
                                        </td>

                                        <td className="p-4 align-top">
                                            {log.details.invoice_number ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 font-mono text-xs w-full shadow-inner">
                                                    <FileText size={12} className="shrink-0" />
                                                    <span className="truncate">{log.details.invoice_number}</span>
                                                </span>
                                            ) : (
                                                <span className="text-gray-600 text-xs font-black uppercase tracking-widest italic opacity-50">Manual Grant</span>
                                            )}
                                        </td>

                                        <td className="p-4 align-top">
                                            <div className="flex flex-col text-sm text-gray-400">
                                                <span className="truncate max-w-[200px] text-gray-300 font-medium" title={log.details.admin_email || 'System'}>
                                                    {log.details.admin_email || 'System Action'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View Cards */}
                <div className="lg:hidden divide-y divide-white/5">
                    {loading && logs.length === 0 ? (
                        <div className="p-12 text-center">
                            <Loader2 className="animate-spin text-primary mx-auto mb-3" size={32} />
                            <p className="text-xs font-black uppercase text-gray-500 tracking-widest">Syncing Feed...</p>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="p-12 text-center text-gray-500 font-black uppercase tracking-widest text-xs">
                            Empty Ledger.
                        </div>
                    ) : (
                        filteredLogs.map((log) => (
                            <div key={log.id} className="p-4 flex flex-col gap-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Grant Event</span>
                                        <div className="flex items-center gap-2 text-white">
                                            <User size={14} className="text-primary" />
                                            <span className="text-sm font-bold truncate max-w-[200px]">{log.user_profiles?.email || 'Unknown'}</span>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <span className="text-xl font-black text-primary">+{log.details.amount}</span>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Lootboxes</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                                        <span className="block text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">Time Trace</span>
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={10} className="text-gray-400" />
                                            <span className="text-[10px] text-white font-bold">
                                                {new Date(log.created_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                                        <span className="block text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">Authorized By</span>
                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                            <span className="text-[10px] text-gray-300 font-bold truncate">
                                                {log.details.admin_email?.split('@')[0] || 'System'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <FileText size={12} className="text-gray-500 shrink-0" />
                                        <span className="text-[10px] font-mono text-gray-400 truncate">
                                            {log.details.invoice_number || 'MANUAL_INJECTION'}
                                        </span>
                                    </div>
                                    <span className="text-[9px] font-black text-white px-2 py-0.5 bg-white/5 rounded-md uppercase tracking-tighter">
                                        {new Date(log.created_at).toLocaleDateString('id-ID')}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {hasMore && !searchQuery && (
                <div className="flex justify-center mt-6">
                    <button
                        onClick={() => {
                            const nextPage = page + 1
                            setPage(nextPage)
                            fetchLogs(nextPage)
                        }}
                        className="px-6 py-2.5 bg-surface/50 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-sm font-bold"
                    >
                        Load Older Grants
                    </button>
                </div>
            )}
        </div>
    )
}
