import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Search, RefreshCw } from 'lucide-react'

export const AdminGrant = () => {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedUser, setSelectedUser] = useState('')
    const [amount, setAmount] = useState(1)
    const [invoice, setInvoice] = useState('')
    const [granting, setGranting] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [availableCards, setAvailableCards] = useState(0) // NEW

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            const [usersResponse, poolResponse] = await Promise.all([
                supabase
                    .from('user_profiles')
                    .select('id, email, lootbox_balance, role')
                    .order('email'),
                supabase
                    .from('card_instances')
                    .select('*', { count: 'exact', head: true })
                    .eq('pool_status', 'Available')
            ])

            if (usersResponse.error) throw usersResponse.error
            setUsers(usersResponse.data)
            setAvailableCards(poolResponse.count || 0)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleGrant = async (e) => {
        e.preventDefault()
        if (!selectedUser) return alert('Select a user')
        if (!invoice.trim()) return alert('Invoice reference is required')

        setGranting(true)
        try {
            // Get current balance
            const user = users.find(u => u.id === selectedUser)
            const newBalance = (user?.lootbox_balance || 0) + Number(amount)

            const { error } = await supabase
                .from('user_profiles')
                .update({ lootbox_balance: newBalance })
                .eq('id', selectedUser)

            if (error) throw error

            const { data: adminData } = await supabase.auth.getUser()

            await supabase.from('audit_logs').insert([{
                user_id: selectedUser,
                action: 'GRANTED_BOX',
                details: {
                    amount: Number(amount),
                    admin_id: adminData.user?.id,
                    admin_email: adminData.user?.email,
                    invoice_number: invoice.trim()
                }
            }])

            alert(`Successfully granted ${amount} lootbox(es) on invoice ${invoice}!`)
            setAmount(1)
            setInvoice('')
            setSelectedUser('')
            fetchUsers() // Refresh list
        } catch (err) {
            alert('Error granting lootbox: ' + err.message)
        } finally {
            setGranting(false)
        }
    }

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-400 to-purple-400">
                        Grant Lootboxes
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 font-black uppercase tracking-widest mt-1 opacity-70">Inventory Allocation Feed</p>
                </div>
                <div className="w-full sm:w-auto bg-primary/20 backdrop-blur-md border border-primary/30 text-primary px-6 py-4 rounded-3xl text-center shadow-[0_0_30px_rgba(var(--primary-rgb),0.1)] relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/5 animate-pulse opacity-50"></div>
                    <p className="text-[10px] uppercase font-black tracking-[0.2em] opacity-80 mb-1 relative z-10">Global Pool Reserve</p>
                    <p className="text-3xl font-black leading-none tracking-tighter relative z-10">{availableCards.toLocaleString()}</p>
                </div>
            </div>

            <div className="bg-surface/50 backdrop-blur-xl border border-white/5 p-6 sm:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0"></div>
                
                <form onSubmit={handleGrant} className="space-y-8 relative z-10">
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Target Neural Account</label>
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search by email..."
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all text-sm font-bold shadow-inner"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <select
                                required
                                className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all text-sm font-bold appearance-none cursor-pointer shadow-inner"
                                value={selectedUser}
                                onChange={e => setSelectedUser(e.target.value)}
                            >
                                <option value="" className="bg-surface">Select Valid Recipient</option>
                                {filteredUsers.map(u => (
                                    <option key={u.id} value={u.id} className="bg-surface py-2">
                                        {u.email} ({u.lootbox_balance} Boxes) {u.role === 'admin' ? '✪' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Allocation Count</label>
                            <input
                                type="number"
                                required
                                min="1"
                                max="1000"
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all text-lg font-black shadow-inner tabular-nums"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Invoice Hash</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. INV-202X-999"
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all text-sm font-mono font-bold shadow-inner placeholder:opacity-30"
                                value={invoice}
                                onChange={e => setInvoice(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <button
                            type="submit"
                            disabled={granting || loading}
                            className="w-full bg-gradient-to-br from-primary to-primary/80 hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:opacity-50 text-black font-black uppercase tracking-[0.2em] py-5 rounded-2xl transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
                        >
                            {granting ? <RefreshCw className="animate-spin" size={20} /> : null}
                            <span>{granting ? 'Executing Grant...' : 'Authorize Distribution'}</span>
                        </button>
                        <p className="text-[9px] text-gray-600 font-black uppercase text-center tracking-widest px-4 leading-relaxed">
                            Warning: This action writes identifying neural data to the immutable audit ledger for invoice linkage.
                        </p>
                    </div>
                </form>
            </div>

            <div className="mt-12 bg-surface/30 backdrop-blur-md border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="px-8 py-5 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Recent Engagement</h2>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-green-500/80">Live Ledger</span>
                    </div>
                </div>
                <div className="divide-y divide-white/5 max-h-[30rem] overflow-y-auto custom-scrollbar">
                    {filteredUsers.map(u => (
                        <div key={u.id} className="p-6 flex justify-between items-center hover:bg-white/[0.03] transition-colors group">
                            <div className="flex-1 overflow-hidden pr-4">
                                <p className="font-bold text-white text-sm truncate group-hover:text-primary transition-colors">{u.email}</p>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-0.5">{u.role}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="flex items-center gap-2 justify-end">
                                    <p className="text-2xl font-black text-white group-hover:text-primary transition-colors tabular-nums">{u.lootbox_balance}</p>
                                    <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-none text-left">
                                        Units<br/>Held
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredUsers.length === 0 && (
                        <div className="p-16 text-center">
                            <div className="text-gray-600 font-black uppercase tracking-[0.3em] text-[10px]">No Signal Detected</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
