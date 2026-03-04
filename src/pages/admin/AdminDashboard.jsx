import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
    Activity, Users, Package, Crosshair,
    Gift, Percent, AlertTriangle, Clock,
    ShieldAlert, ChevronDown, ChevronUp, Database, Info
} from 'lucide-react'

// Helper component for collapsible sections
const DashboardSection = ({ title, icon, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <div className="bg-surface/50 border border-white/5 rounded-2xl mb-6 overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-lg text-primary">
                        {icon}
                    </div>
                    <h2 className="text-xl font-bold">{title}</h2>
                </div>
                {isOpen ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
            </button>

            {isOpen && (
                <div className="p-5 pt-0 border-t border-white/5">
                    {children}
                </div>
            )}
        </div>
    )
}

// Helper component for KPI Cards
const KPICard = ({ title, value, subtext, highlight = false, alert = false, tooltip }) => (
    <div className={`p-4 rounded-xl border relative group ${highlight ? 'bg-primary/10 border-primary/20' : alert ? 'bg-red-500/10 border-red-500/20' : 'bg-black/40 border-white/10'}`}>
        <div className="flex justify-between items-start mb-2">
            <p className="text-sm text-gray-400">{title}</p>
            {tooltip && (
                <div className="relative flex items-center">
                    <Info size={14} className="text-gray-500 cursor-help hover:text-white transition-colors" />
                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-800 text-xs text-gray-200 p-2 rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none">
                        {tooltip}
                        <div className="absolute top-full right-1.5 border-4 border-transparent border-t-gray-800"></div>
                    </div>
                </div>
            )}
        </div>
        <p className={`text-3xl font-bold ${highlight ? 'text-primary' : alert ? 'text-red-400' : 'text-white'}`}>{value}</p>
        {subtext && <p className="text-xs text-gray-500 mt-2">{subtext}</p>}
    </div>
)

export const AdminDashboard = () => {
    const [stats, setStats] = useState({
        // Executive
        totalUsers: 0,
        totalInstances: 0,
        availableInstances: 0,
        grantedBoxes: 0,
        openedBoxes: 0,
        allTimeActivated: 0, // NEW
        activationRate: 0,
        utilizationRate: 0,

        // Engagement
        opensToday: 0,
        opensWeek: 0,
        opensMonth: 0,
        avgOpensPerUser: 0,
        percentUsersOpened: 0,

        // Rarity Distribution
        rarityCounts: { Common: 0, Rare: 0, Epic: 0, Legendary: 0, Mystic: 0 },

        // Discount Liability
        totalPotentialDiscount: 0,
        totalActiveDiscount: 0,

        // Economy
        outstandingBoxBalance: 0,

        // Expiry Risk
        expiring24h: 0,
        expiring7d: 0,
        totalInactiveRisk: 0,

        // System Integrity
        failedActivations: 0,
        recentErrors: []
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchComprehensiveStats()
    }, [])

    const fetchComprehensiveStats = async () => {
        setLoading(true)
        try {
            // 1. Fetch Core Counts
            const [
                { count: totalUsers },
                { count: totalInstances },
                { count: availInst },
                { count: ownedInst },
            ] = await Promise.all([
                supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
                supabase.from('card_instances').select('*', { count: 'exact', head: true }),
                supabase.from('card_instances').select('*', { count: 'exact', head: true }).eq('pool_status', 'Available'),
                supabase.from('card_instances').select('*', { count: 'exact', head: true }).eq('pool_status', 'Owned'),
            ])

            // 2. Fetch Users for Economy Balance
            const { data: users } = await supabase.from('user_profiles').select('id, lootbox_balance')
            const outstandingBoxBalance = users?.reduce((sum, u) => sum + (u.lootbox_balance || 0), 0) || 0

            // 3. Fetch Audit Logs for Engagement & Integrity
            const now = new Date()
            const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString()
            const weekStart = new Date(now.setDate(now.getDate() - 7)).toISOString()
            const monthStart = new Date(now.setDate(now.getDate() - 30)).toISOString()

            // We fetch the last 1000 logs to process locally for speed instead of multiple overlapping count queries
            const { data: recentLogs } = await supabase
                .from('audit_logs')
                .select('action, created_at, user_id, details')
                .order('created_at', { ascending: false })
                .limit(2000)

            let grantedBoxes = 0
            let openedBoxes = 0
            let allTimeActivated = 0
            let opensToday = 0
            let opensWeek = 0
            let opensMonth = 0
            const usersWhoOpened = new Set()
            let failedActivations = 0

            recentLogs?.forEach(log => {
                if (log.action === 'GRANTED_BOX') {
                    grantedBoxes += (log.details?.amount || 1)
                }

                if (log.action === 'LOOTBOX_OPENED') {
                    openedBoxes++
                    usersWhoOpened.add(log.user_id)

                    if (log.created_at >= monthStart) opensMonth++
                    if (log.created_at >= weekStart) opensWeek++
                    if (log.created_at >= todayStart) opensToday++
                }

                if (log.action === 'CARD_ACTIVATED') {
                    allTimeActivated++
                }

                if (log.action === 'ACTIVATION_FAILED' || log.action === 'SYSTEM_ERROR') {
                    failedActivations++
                }
            })

            // 4. Fetch Deep Instance Data for Rarity, Liability, and Expiry
            // We only need basic join info for cards that are NOT available
            const { data: activeCards } = await supabase
                .from('card_instances')
                .select(`
                    id, 
                    pool_status, 
                    activation_status, 
                    expiry_date,
                    locked_discount_percentage,
                    card_templates ( rarity, discount_percentage )
                `)
                .neq('pool_status', 'Available')

            const rarityCounts = { Common: 0, Rare: 0, Epic: 0, Legendary: 0, Mystic: 0 }
            let totalPotentialDiscount = 0
            let totalActiveDiscount = 0
            let expiring24h = 0
            let expiring7d = 0
            let totalInactiveRisk = 0

            const msPerDay = 24 * 60 * 60 * 1000
            const rightNow = new Date()

            activeCards?.forEach(card => {
                const rarity = card.card_templates?.rarity
                if (rarity && rarityCounts[rarity] !== undefined) {
                    rarityCounts[rarity]++
                }

                const discount = card.locked_discount_percentage || card.card_templates?.discount_percentage || 0

                if (card.activation_status === 'Inactive' && card.pool_status === 'Owned') {
                    totalPotentialDiscount += discount
                    totalInactiveRisk++

                    if (card.expiry_date) {
                        const expiry = new Date(card.expiry_date)
                        const daysLeft = (expiry - rightNow) / msPerDay
                        if (daysLeft <= 1 && daysLeft > 0) expiring24h++
                        if (daysLeft <= 7 && daysLeft > 0) expiring7d++
                    }
                } else if (card.activation_status === 'Activated') {
                    totalActiveDiscount += discount
                }
            })

            // Compile the final stats object
            setStats({
                totalUsers: totalUsers || 0,
                totalInstances: totalInstances || 0,
                availableInstances: availInst || 0,
                grantedBoxes,
                openedBoxes,
                allTimeActivated,
                activationRate: openedBoxes > 0 ? ((allTimeActivated / openedBoxes) * 100).toFixed(1) : 0,
                utilizationRate: totalInstances > 0 ? ((ownedInst / totalInstances) * 100).toFixed(1) : 0,

                opensToday,
                opensWeek,
                opensMonth,
                avgOpensPerUser: totalUsers > 0 ? (openedBoxes / totalUsers).toFixed(1) : 0,
                percentUsersOpened: totalUsers > 0 ? ((usersWhoOpened.size / totalUsers) * 100).toFixed(1) : 0,

                rarityCounts,

                totalPotentialDiscount,
                totalActiveDiscount,

                outstandingBoxBalance,

                expiring24h,
                expiring7d,
                totalInactiveRisk,

                failedActivations,
                recentErrors: recentLogs?.filter(l => l.action.includes('ERROR') || l.action.includes('FAIL')).slice(0, 5) || []
            })

        } catch (error) {
            console.error('Error fetching comprehensive stats:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                <p className="text-gray-400 font-mono text-sm">Aggregating System Metrics...</p>
            </div>
        )
    }

    return (
        <div className="pb-24 lg:pb-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                    Operational Dashboard
                </h1>
                <p className="text-gray-400 mt-2">Real-time system health and economy analysis</p>
            </div>

            {/* 1. EXECUTIVE SNAPSHOT */}
            <DashboardSection title="Executive Snapshot" icon={<Activity />}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    <KPICard title="Total Users" value={stats.totalUsers.toLocaleString()} tooltip="Total number of registered accounts on the platform." />
                    <KPICard title="All-Time Distributed" value={stats.grantedBoxes.toLocaleString()} tooltip="Lifetime total of lootboxes granted (unaffected by card deletion)." />
                    <KPICard title="All-Time Activated" value={stats.allTimeActivated.toLocaleString()} highlight tooltip="Lifetime total of cards activated in-store (unaffected by card deletion)." />
                    <KPICard title="Activation Rate" value={`${stats.activationRate}%`} tooltip="Percentage of opened boxes that eventually resulted in a store activation." />
                    <KPICard title="Inventory Utilized" value={`${stats.utilizationRate}%`} subtext="Pool depletion rate" tooltip="Percentage of the generated card pool that is currently owned by users." />
                    <KPICard title="Available Pool" value={stats.availableInstances.toLocaleString()} highlight tooltip="Cards generated but not yet distributed/opened by any user." />
                </div>
            </DashboardSection>

            {/* 2. ENGAGEMENT METRICS */}
            <DashboardSection title="Engagement Metrics" icon={<Users />}>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                    <KPICard title="Opens Today" value={stats.opensToday} highlight tooltip="Number of lootboxes opened in the last 24 hours." />
                    <KPICard title="Opens This Week" value={stats.opensWeek} tooltip="Number of lootboxes opened in the last 7 days." />
                    <KPICard title="Opens This Month" value={stats.opensMonth} tooltip="Number of lootboxes opened in the last 30 days." />
                    <KPICard title="Avg Opens/User" value={stats.avgOpensPerUser} tooltip="Average number of lootboxes opened per registered user." />
                    <KPICard title="Active User Base" value={`${stats.percentUsersOpened}%`} subtext="Opened ≥ 1 box" tooltip="Percentage of the total user base that has opened at least one lootbox." />
                </div>
            </DashboardSection>

            {/* 3. RARITY DISTRIBUTION */}
            <DashboardSection title="Rarity Distribution" icon={<Crosshair />}>
                <p className="text-sm text-gray-400 mb-4">Distribution of cards currently owned or played by users.</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {Object.entries(stats.rarityCounts).map(([rarity, count]) => (
                        <div key={rarity} className="p-4 bg-black/40 border border-white/5 rounded-xl flex flex-col items-center justify-center text-center">
                            <span className={`text-lg font-bold text-rarity-${rarity.toLowerCase()} mb-1`}>{rarity}</span>
                            <span className="text-2xl font-mono">{count}</span>
                        </div>
                    ))}
                </div>
            </DashboardSection>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* 4. DISCOUNT LIABILITY */}
                <DashboardSection title="Financial Exposure" icon={<Percent />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <KPICard
                            title="Potential Outstanding Liability"
                            value={`${stats.totalPotentialDiscount}%`}
                            subtext="Combined inactive discounts in user wallets"
                            tooltip="The sum of all discount percentages on cards currently owned by users but not yet activated."
                        />
                        <KPICard
                            title="Active Consumed Discounts"
                            value={`${stats.totalActiveDiscount}%`}
                            subtext="Total discounts successfully redeemed"
                            highlight
                            tooltip="The sum of all discount percentages on cards that have been successfully activated in-store."
                        />
                    </div>
                </DashboardSection>

                {/* 5. LOOTBOX ECONOMY */}
                <DashboardSection title="Lootbox Economy" icon={<Gift />}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                        <KPICard title="Total Granted" value={stats.grantedBoxes.toLocaleString()} tooltip="The total number of lootboxes ever distributed to users by admins." />
                        <KPICard title="Total Opened" value={stats.openedBoxes.toLocaleString()} highlight tooltip="The total number of lootboxes successfully unboxed by users." />
                        <KPICard
                            title="Outstanding Balance"
                            value={stats.outstandingBoxBalance.toLocaleString()}
                            subtext="Unopened boxes across user base"
                            tooltip="The sum total of unopened lootboxes currently sitting in user inventories."
                        />
                    </div>
                </DashboardSection>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 6. EXPIRY RISK */}
                <DashboardSection title="Expiry Risk" icon={<Clock />}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                        <KPICard title="Expiring 24hr" value={stats.expiring24h} alert={stats.expiring24h > 0} tooltip="Cards in user inventories scheduled to expire in less than 24 hours." />
                        <KPICard title="Expiring 7d" value={stats.expiring7d} tooltip="Cards in user inventories scheduled to expire within the next 7 days." />
                        <KPICard title="Total At Risk" value={stats.totalInactiveRisk} subtext="Total inactive cards" tooltip="The total number of active, unexpired cards waiting to be used or expire." />
                    </div>
                </DashboardSection>

                {/* 7. SYSTEM INTEGRITY */}
                <DashboardSection title="System Integrity" icon={<ShieldAlert />}>
                    <div className="mt-4">
                        <div className="grid grid-cols-1 gap-4 mb-4">
                            <KPICard
                                title="Abnormal/Failed Activations"
                                value={stats.failedActivations}
                                alert={stats.failedActivations > 0}
                                subtext="Tracks invalid serial queries or server rejections"
                                tooltip="The number of times the system blocked an invalid card activation attempt or encountered a server error."
                            />
                        </div>

                        {stats.recentErrors.length > 0 && (
                            <div className="bg-black/40 rounded-xl border border-white/5 overflow-hidden">
                                <div className="px-4 py-2 bg-red-500/10 border-b border-white/5 text-xs text-red-400 font-bold uppercase tracking-wider">
                                    Recent Warnings Log
                                </div>
                                <div className="divide-y divide-white/5">
                                    {stats.recentErrors.map((err, i) => (
                                        <div key={i} className="p-3 text-sm flex justify-between items-start">
                                            <div>
                                                <span className="text-red-400 font-mono mr-2">[{err.action}]</span>
                                                <span className="text-gray-400">{JSON.stringify(err.details)}</span>
                                            </div>
                                            <span className="text-xs text-gray-600 whitespace-nowrap ml-4">
                                                {new Date(err.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </DashboardSection>

            </div>
        </div>
    )
}
