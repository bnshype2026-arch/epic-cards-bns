import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
    Calendar as CalendarIcon,
    Search,
    RefreshCw,
    Activity, Users, Package, Crosshair,
    Gift, Percent, AlertTriangle, Clock,
    ShieldAlert, ChevronDown, ChevronUp, Info
} from 'lucide-react'

// Helper component for collapsible sections
const DashboardSection = ({ title, icon, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <div className="bg-surface/50 border border-white/5 rounded-2xl mb-6 overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
                title={isOpen ? "Collapse section" : "Expand section"}
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

export const HistoricalAnalytics = () => {
    // Top level timeframe state
    const [startDate, setStartDate] = useState(() => {
        const date = new Date()
        date.setDate(date.getDate() - 30)
        return date.toISOString().split('T')[0]
    })
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0]
    })

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // We explicitly track the "applied" range for the UI display "Viewing Data From: X to Y"
    const [activeRange, setActiveRange] = useState({
        start: startDate,
        end: endDate
    })

    const [stats, setStats] = useState({
        // Executive
        newUsersInRange: 0,
        grantedBoxesInRange: 0,
        openedBoxesInRange: 0,
        activationsInRange: 0,
        activationRate: 0,

        // Engagement
        avgOpensPerUserInRange: 0,
        totalUsersWhoOpenedInRange: 0,

        // Rarity Distribution
        rarityCounts: { Common: 0, Rare: 0, Epic: 0, Legendary: 0, Mystic: 0 },

        // Expiry
        expiriesInRange: 0,

        // System Integrity
        failedActivations: 0,
        recentErrors: []
    })

    const formatDisplayDateMs = (dateString, isEnd = false) => {
        const d = new Date(dateString)
        if (isEnd) {
            d.setHours(23, 59, 59, 999)
        } else {
            d.setHours(0, 0, 0, 0)
        }
        return d.toISOString()
    }

    const fetchHistoricalData = async () => {
        if (!startDate || !endDate) {
            setError('Please select both a start and end date.')
            return
        }
        if (new Date(startDate) > new Date(endDate)) {
            setError('Start date cannot be after the end date.')
            return
        }

        setError('')
        setLoading(true)
        setActiveRange({ start: startDate, end: endDate })

        const startIso = formatDisplayDateMs(startDate, false)
        const endIso = formatDisplayDateMs(endDate, true)

        try {
            // 1. Fetch Users joined within range
            const { count: newUsersInRange } = await supabase
                .from('user_profiles')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', startIso)
                .lte('created_at', endIso)

            // 2. Fetch Expiries within range (Cards where expiry_date falls into this window)
            // Note: If activation_status is actually "Expired", we count it. Or we just look at physical expiry dates falling in range.
            // We'll look at cards with expiry_date in the range.
            const { count: expiriesInRange } = await supabase
                .from('card_instances')
                .select('*', { count: 'exact', head: true })
                .gte('expiry_date', startIso)
                .lte('expiry_date', endIso)

            // 3. To maintain huge performance & avoid crazy joins, we query the `audit_logs` specifically for the range.
            // The audit_logs table cleanly tracks GRANTED_BOX, LOOTBOX_OPENED, CARD_ACTIVATED, and failures sequentially.
            // We fetch ONLY the records in the date range.

            // To support large databases safely, instead of fetching 100k rows at once, we use aggregations or pagination.
            // Supabase RPC is best for giant aggregations, but we can do a targeted SELECT for now with a high limit,
            // or perform standard counts. Let's do selective targeted pulls.

            const { data: logsInRange, error: logsError } = await supabase
                .from('audit_logs')
                .select('action, user_id, details, created_at')
                .gte('created_at', startIso)
                .lte('created_at', endIso)
                .order('created_at', { ascending: false })
                // Limit to 50000 to prevent browser crashes on massive instances while pulling enough for general MVPs.
                // In a true massive enterprise, this needs to be an RPC group-by.
                .limit(50000)

            if (logsError) throw logsError

            let grantedBoxesInRange = 0
            let openedBoxesInRange = 0
            let activationsInRange = 0
            let failedActivations = 0
            const uniqueUsersWhoOpened = new Set()
            const openedTemplateIds = []
            const errorsList = []

            logsInRange?.forEach(log => {
                if (log.action === 'GRANTED_BOX') {
                    grantedBoxesInRange += (log.details?.amount || 1)
                }
                else if (log.action === 'LOOTBOX_OPENED') {
                    openedBoxesInRange++
                    uniqueUsersWhoOpened.add(log.user_id)
                    if (log.details?.template_id) {
                        openedTemplateIds.push(log.details.template_id)
                    }
                }
                else if (log.action === 'CARD_ACTIVATED') {
                    activationsInRange++
                }
                else if (log.action === 'ACTIVATION_FAILED' || log.action === 'SYSTEM_ERROR') {
                    failedActivations++
                    if (errorsList.length < 5) errorsList.push(log)
                }
            })

            // 4. Resolve Rarities of Opened Cards efficiently
            const rarityCounts = { Common: 0, Rare: 0, Epic: 0, Legendary: 0, Mystic: 0 }

            // If we have templates to look up
            if (openedTemplateIds.length > 0) {
                // De-duplicate template IDs to minimize query payload
                const uniqueTemplateIds = [...new Set(openedTemplateIds)]

                // Fetch the rarities for these templates
                const { data: templatesData } = await supabase
                    .from('card_templates')
                    .select('id, rarity')
                    .in('id', uniqueTemplateIds)

                // Map ID to Rarity
                const templateRarityMap = {}
                templatesData?.forEach(t => {
                    templateRarityMap[t.id] = t.rarity
                })

                // Tally them up based on the full list of opens
                openedTemplateIds.forEach(id => {
                    const rarity = templateRarityMap[id]
                    if (rarity && rarityCounts[rarity] !== undefined) {
                        rarityCounts[rarity]++
                    }
                })
            }

            setStats({
                newUsersInRange: newUsersInRange || 0,
                grantedBoxesInRange,
                openedBoxesInRange,
                activationsInRange,
                activationRate: openedBoxesInRange > 0 ? ((activationsInRange / openedBoxesInRange) * 100).toFixed(1) : 0,

                avgOpensPerUserInRange: uniqueUsersWhoOpened.size > 0 ? (openedBoxesInRange / uniqueUsersWhoOpened.size).toFixed(1) : 0,
                totalUsersWhoOpenedInRange: uniqueUsersWhoOpened.size,

                rarityCounts,
                expiriesInRange: expiriesInRange || 0,

                failedActivations,
                recentErrors: errorsList
            })

        } catch (err) {
            console.error('Error fetching historical data:', err)
            setError('Failed to load historical analytics. Check console for details.')
        } finally {
            setLoading(false)
        }
    }

    // Load initial 30 days on mount
    useEffect(() => {
        fetchHistoricalData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const formatDateReadable = (isoString) => {
        return new Date(isoString).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
        })
    }

    return (
        <div className="pb-24 lg:pb-8 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
                    Historical Analytics
                </h1>
                <p className="text-gray-400 mt-2">Filter and analyze past system performance by date range.</p>
            </div>

            {/* Date Range Selector Panel */}
            <div className="bg-surface/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 mb-8 shadow-xl">
                <div className="flex flex-col md:flex-row gap-6 items-end">

                    <div className="flex-1 w-full flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <CalendarIcon size={14} /> Start Date
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <CalendarIcon size={14} /> End Date
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                            />
                        </div>
                    </div>

                    <button
                        onClick={fetchHistoricalData}
                        disabled={loading}
                        className="w-full md:w-auto px-8 py-3 bg-primary text-black font-bold uppercase tracking-wider rounded-xl transition-all hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <RefreshCw size={18} className="animate-spin" /> : <Search size={18} />}
                        {loading ? 'Applying...' : 'Apply Filter'}
                    </button>
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm flex items-center gap-2">
                        <AlertTriangle size={16} /> {error}
                    </div>
                )}
            </div>

            {/* Active Range Indicator */}
            {!loading && !error && (
                <div className="mb-8 flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-sm font-mono text-gray-300">
                        Viewing Data From: <span className="text-white font-bold">{formatDateReadable(activeRange.start)}</span> → <span className="text-white font-bold">{formatDateReadable(activeRange.end)}</span>
                    </span>
                </div>
            )}

            {/* Data Dashboard */}
            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4 bg-surface/30 rounded-3xl border border-white/5">
                    <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                    <p className="text-gray-400 font-mono text-sm">Crunching historical data...</p>
                </div>
            ) : (
                <div className="animate-fade-in-up">

                    {/* 1. EXECUTIVE SNAPSHOT */}
                    <DashboardSection title="Executive Snapshot (Range-Based)" icon={<Activity />}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <KPICard title="New Users" value={stats.newUsersInRange.toLocaleString()} highlight tooltip="Users who registered their account during this specific date range." />
                            <KPICard title="Activations" value={stats.activationsInRange.toLocaleString()} highlight tooltip="Cards scanned and activated in-store during this specific date range." />
                            <KPICard title="Activation Rate" value={`${stats.activationRate}%`} tooltip="Percentage of boxes opened during this range that resulted in an activation during this range." />
                            <KPICard title="Expiries" value={stats.expiriesInRange.toLocaleString()} alert={stats.expiriesInRange > 0} tooltip="Cards whose 'expiry_date' specifically fell within this date range." />
                        </div>
                    </DashboardSection>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 2. LOOTBOX ECONOMY */}
                        <DashboardSection title="Economy (Range-Based)" icon={<Gift />}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <KPICard title="Lootboxes Granted" value={stats.grantedBoxesInRange.toLocaleString()} tooltip="Boxes distributed to wallets during this date range." />
                                <KPICard title="Lootboxes Opened" value={stats.openedBoxesInRange.toLocaleString()} highlight tooltip="Cards unboxed from lootboxes during this date range." />
                            </div>
                        </DashboardSection>

                        {/* 3. ENGAGEMENT METRICS */}
                        <DashboardSection title="Engagement (Range-Based)" icon={<Users />}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <KPICard title="Engaged Users" value={stats.totalUsersWhoOpenedInRange.toLocaleString()} subtext="Users who opened ≥1 box" tooltip="Number of unique users who interacted with the unboxing feature in this window." />
                                <KPICard title="Avg Opens / Engaged User" value={stats.avgOpensPerUserInRange} tooltip="Average number of boxes opened per deeply engaged user in this window." />
                            </div>
                        </DashboardSection>
                    </div>

                    {/* 4. RARITY DISTRIBUTION */}
                    <DashboardSection title="Card Unboxed Distribution" icon={<Crosshair />}>
                        <p className="text-sm text-gray-400 mb-4">Distribution of card rarities drawn by users specifically during this date window.</p>

                        {stats.openedBoxesInRange === 0 ? (
                            <div className="text-center py-8 text-gray-500 text-sm">No cards were opened during this date range.</div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {Object.entries(stats.rarityCounts).map(([rarity, count]) => (
                                    <div key={rarity} className="p-4 bg-black/40 border border-white/5 rounded-xl flex flex-col items-center justify-center text-center">
                                        <span className={`text-lg font-bold text-rarity-${rarity.toLowerCase()} mb-1`}>{rarity}</span>
                                        <span className="text-2xl font-mono">{count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </DashboardSection>

                    {/* 5. SYSTEM INTEGRITY */}
                    <DashboardSection title="System Integrity (Range-Based)" icon={<ShieldAlert />}>
                        <div className="mt-4">
                            <div className="grid grid-cols-1 gap-4 mb-4">
                                <KPICard
                                    title="Failed Activations"
                                    value={stats.failedActivations}
                                    alert={stats.failedActivations > 0}
                                    subtext="Blocks or errors during this range"
                                    tooltip="The number of times an invalid activation attempt occurred within this time window."
                                />
                            </div>

                            {stats.recentErrors.length > 0 && (
                                <div className="bg-black/40 rounded-xl border border-white/5 overflow-hidden">
                                    <div className="px-4 py-2 bg-red-500/10 border-b border-white/5 text-xs text-red-400 font-bold uppercase tracking-wider">
                                        Warnings Logged During Period
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
            )}
        </div>
    )
}
