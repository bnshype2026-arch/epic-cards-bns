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
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Gift className="text-primary" />
                        Lootbox Grant Ledger
                    </h1>
                    <p className="text-gray-400 mt-2">Comprehensive audit log of all manual lootbox grants.</p>
                </div>

                <div className="flex bg-surface/50 border border-white/5 rounded-xl overflow-hidden w-full sm:w-auto">
                    <div className="px-4 py-2 flex items-center gap-3 bg-black/20">
                        <span className="text-sm text-gray-400 font-bold uppercase tracking-wider">Total Grants</span>
                        <span className="text-2xl font-mono text-white">{filteredLogs.length}</span>
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
                        className="px-4 py-2 flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 font-bold transition-colors border-l border-white/5"
                        title="Export to Excel"
                    >
                        <Download size={18} />
                        Export
                    </button>
                </div>
            </div>

            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search by User Email, Admin Email, or Invoice Ref..."
                    className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/40 border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
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
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <Loader2 className="animate-spin text-primary" size={32} />
                                            <p>Loading audit ledger...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center text-gray-500">
                                        No logs found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 align-top whitespace-nowrap">
                                            <div className="flex flex-col text-sm text-gray-300">
                                                <span className="font-medium text-white">
                                                    {new Date(log.created_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}
                                                </span>
                                                <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                    <Clock size={12} /> {new Date(log.created_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="p-4 align-top">
                                            <div className="flex items-center gap-2 text-sm text-white truncate max-w-[200px]" title={log.user_profiles?.email || 'Unknown'}>
                                                <User size={14} className="text-gray-400 shrink-0" />
                                                <span className="truncate flex-1">{log.user_profiles?.email || 'Unknown'}</span>
                                            </div>
                                            <span className="text-xs font-mono text-gray-500 block mt-1">ID: {log.user_id.substring(0, 8)}...</span>
                                        </td>

                                        <td className="p-4 align-top text-center">
                                            <span className="inline-flex items-center justify-center bg-primary/20 text-primary font-black px-3 py-1 rounded-lg border border-primary/30 text-lg">
                                                +{log.details.amount}
                                            </span>
                                        </td>

                                        <td className="p-4 align-top">
                                            {log.details.invoice_number ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 font-mono text-sm shadow-inner w-full">
                                                    <FileText size={14} className="shrink-0" />
                                                    <span className="truncate">{log.details.invoice_number}</span>
                                                </span>
                                            ) : (
                                                <span className="text-gray-600 text-sm italic">N/A (Legacy)</span>
                                            )}
                                        </td>

                                        <td className="p-4 align-top">
                                            <div className="flex flex-col text-sm text-gray-400">
                                                <span className="truncate max-w-[200px] text-gray-300" title={log.details.admin_email || 'System'}>
                                                    {log.details.admin_email || 'System'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
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
