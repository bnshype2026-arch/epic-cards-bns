import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { History, FileText, Gift, Loader2 } from 'lucide-react'

export const UserLogs = () => {
    const { user } = useAuth()
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const PAGE_SIZE = 20

    useEffect(() => {
        if (user) {
            setLogs([])
            setPage(0)
            setHasMore(true)
            fetchLogs(0)
        }
    }, [user])

    const fetchLogs = async (pageNumber) => {
        try {
            const from = pageNumber * PAGE_SIZE
            const to = from + PAGE_SIZE - 1

            // Fetch GRANTED_BOX actions where the current user is the recipient
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('user_id', user.id)
                .eq('action', 'GRANTED_BOX')
                .order('created_at', { ascending: false })
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
            console.error('Error fetching user logs:', err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="text-center py-12">Loading history...</div>

    return (
        <div className="flex flex-col min-h-[80vh] py-8 px-4 relative max-w-4xl mx-auto w-full">
            <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-6">
                <History className="text-primary w-8 h-8" />
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Reward History</h1>
                    <p className="text-gray-400">Track whenever you received new lootboxes.</p>
                </div>
            </div>

            {logs.length === 0 ? (
                <div className="text-center text-gray-400 py-16 bg-surface/30 backdrop-blur-sm rounded-3xl border border-white/5">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50 text-gray-500" />
                    <h3 className="text-xl font-bold text-white mb-2">No history found</h3>
                    <p>When you earn lootboxes through purchases, they will appear here.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {logs.map((log) => (
                        <div key={log.id} className="bg-surface border border-white/5 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center hover:bg-white/5 transition-colors">
                            <div className="flex items-start gap-4">
                                <div className="bg-primary/20 p-3 rounded-xl border border-primary/30 shrink-0">
                                    <Gift className="text-primary w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-lg mb-1">
                                        Received {log.details.amount} Lootbox{log.details.amount > 1 ? 'es' : ''}
                                    </h3>
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-gray-400">
                                        <span className="flex items-center gap-1.5">
                                            <History size={14} />
                                            {new Date(log.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
                                        </span>
                                        {log.details.invoice_number && (
                                            <span className="flex items-center gap-1.5 text-green-400">
                                                <FileText size={14} />
                                                Invoice: {log.details.invoice_number}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="text-right w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t border-white/5 sm:border-0">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Authorized By</p>
                                <p className="text-sm font-mono text-gray-300 truncate max-w-[200px]" title={log.details.admin_email || 'System'}>
                                    {log.details.admin_email || 'System'}
                                </p>
                            </div>
                        </div>
                    ))}

                    {hasMore && (
                        <div className="flex justify-center mt-8 pt-4">
                            <button
                                onClick={() => {
                                    const nextPage = page + 1
                                    setPage(nextPage)
                                    fetchLogs(nextPage)
                                }}
                                className="px-6 py-2.5 bg-surface/50 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-sm font-bold flex items-center gap-2"
                            >
                                <History size={16} /> Load Older History
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
