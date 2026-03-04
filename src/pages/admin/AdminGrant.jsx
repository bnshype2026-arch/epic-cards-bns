import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Search } from 'lucide-react'

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
        <div className="max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h1 className="text-3xl font-bold">Grant Lootboxes</h1>
                <div className="bg-primary/20 border border-primary/30 text-primary px-5 py-2 rounded-xl text-center shadow-inner">
                    <p className="text-[10px] uppercase tracking-wider font-bold opacity-80 mb-0.5">Remaining Card Pool</p>
                    <p className="text-2xl font-black leading-none">{availableCards.toLocaleString()}</p>
                </div>
            </div>

            <div className="bg-surface border border-white/5 p-6 md:p-8 rounded-2xl">
                <form onSubmit={handleGrant} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Search User by Email</label>
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                placeholder="Filter users..."
                                className="w-full bg-[#1e1e24] border border-white/20 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <label className="block text-sm font-medium text-gray-300 mb-2">Select User</label>
                        <select
                            required
                            className="w-full bg-[#1e1e24] border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                            value={selectedUser}
                            onChange={e => setSelectedUser(e.target.value)}
                        >
                            <option value="" className="bg-[#1e1e24]">-- Choose a user --</option>
                            {filteredUsers.map(u => (
                                <option key={u.id} value={u.id} className="bg-[#1e1e24]">
                                    {u.email} (Balance: {u.lootbox_balance}) {u.role === 'admin' ? '[ADMIN]' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Amount to Grant</label>
                        <input
                            type="number"
                            required
                            min="1"
                            max="100"
                            className="w-full bg-[#1e1e24] border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors mb-6"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                        />

                        <label className="block text-sm font-medium text-gray-300 mb-2">Invoice Reference</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. INV-2023-001 or Receipt Number"
                            className="w-full bg-[#1e1e24] border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-mono"
                            value={invoice}
                            onChange={e => setInvoice(e.target.value)}
                        />
                        <p className="text-xs text-gray-400 mt-2">Required. Creates an undeniable audit trail linking this grant to a verified purchase.</p>
                    </div>

                    <button
                        type="submit"
                        disabled={granting || loading}
                        className="w-full bg-primary hover:bg-blue-600 disabled:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors mt-4"
                    >
                        {granting ? 'Processing...' : 'Grant Lootboxes'}
                    </button>
                </form>
            </div>

            <div className="mt-8 bg-surface border border-white/5 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/5 bg-white/5">
                    <h2 className="font-bold">Recent Users</h2>
                </div>
                <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
                    {filteredUsers.map(u => (
                        <div key={u.id} className="p-4 flex justify-between items-center hover:bg-white/5">
                            <div>
                                <p className="font-medium">{u.email}</p>
                                <p className="text-xs text-gray-400">{u.role}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold text-primary">{u.lootbox_balance}</p>
                                <p className="text-xs text-gray-400">Boxes</p>
                            </div>
                        </div>
                    ))}
                    {filteredUsers.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            No users found matching "{searchQuery}"
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
