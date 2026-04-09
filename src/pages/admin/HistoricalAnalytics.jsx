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
        <div className="bg-surface/30 backdrop-blur-sm border border-white/5 rounded-[2rem] mb-6 overflow-hidden shadow-2xl transition-all duration-500">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-6 sm:p-8 hover:bg-white/[0.03] transition-all group"
            >
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-inner border border-primary/5 group-hover:scale-110 transition-transform">
                        {icon}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-white/90">{title}</h2>
                </div>
                <div className={`p-2 rounded-full bg-white/5 text-gray-400 group-hover:bg-primary/20 group-hover:text-primary transition-all ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown size={20} />
                </div>
            </button>

            {isOpen && (
                <div className="p-6 sm:p-8 pt-0 border-t border-white/5 animate-fade-in">
                    {children}
                </div>
            )}
        </div>
    )
}

// Helper component for KPI Cards
const KPICard = ({ title, value, subtext, highlight = false, alert = false, tooltip }) => (
    <div className={`p-4 sm:p-5 rounded-2xl border relative group transition-all duration-300 ${highlight ? 'bg-primary/10 border-primary/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.05)]' : alert ? 'bg-red-500/10 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.05)]' : 'bg-surface/40 backdrop-blur border-white/5 shadow-xl'}`}>
        <div className="flex justify-between items-start mb-2 sm:mb-4">
            <p className="text-[10px] sm:text-xs text-gray-400 font-black uppercase tracking-widest">{title}</p>
            {tooltip && (
                <div className="relative flex items-center">
                    <Info size={14} className="text-gray-500 cursor-help hover:text-white transition-colors" />
                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-900/95 backdrop-blur border border-white/10 text-[10px] text-gray-300 p-3 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                        {tooltip}
                    </div>
                </div>
            )}
        </div>
        <p className={`text-2xl sm:text-4xl font-black tracking-tight ${highlight ? 'text-primary' : alert ? 'text-red-400' : 'text-white'}`}>{value}</p>
        {subtext && <p className="text-[10px] sm:text-xs text-gray-500 mt-2 font-medium">{subtext}</p>}
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
        <div className="pb-24 lg:pb-8 max-w-7xl mx-auto px-4 sm:px-6">
            <div className="mb-8 p-1 sm:p-0">
                <h1 className="text-2xl sm:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-400 to-blue-400 uppercase tracking-tighter">
                    Historical Analytics
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 font-medium tracking-tight mt-1">Audit and optimize system performance across custom timelines.</p>
            </div>

            {/* Date Range Selector Panel */}
            <div className="bg-surface/80 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-8 mb-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity pointer-events-none">
                    <CalendarIcon size={80} className="rotate-12" />
                </div>
                
                <div className="flex flex-col lg:flex-row gap-6 items-stretch lg:items-end relative z-10">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <ChevronDown size={12} className="text-primary" /> Start Boundary
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all text-sm font-bold shadow-inner"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <ChevronUp size={12} className="text-primary" /> End Boundary
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all text-sm font-bold shadow-inner"
                            />
                        </div>
                    </div>

                    <button
                        onClick={fetchHistoricalData}
                        disabled={loading}
                        className="lg:w-48 px-8 py-5 bg-gradient-to-br from-primary to-primary/80 text-black font-black uppercase tracking-widest rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-primary/20"
                    >
                        {loading ? <RefreshCw size={20} className="animate-spin" /> : <Search size={20} />}
                        <span className="text-sm">Recount</span>
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
                <div className="mb-8 flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="h-3 w-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)] animate-pulse"></div>
                    <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Timeline: <span className="text-white ml-2">{formatDateReadable(activeRange.start)}</span> <span className="mx-2 opacity-30">❯</span> <span className="text-white">{formatDateReadable(activeRange.end)}</span>
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
                        <p className="text-xs sm:text-sm text-gray-500 mb-6 font-medium tracking-tight">Distribution of card rarities drawn by users specifically during this date window.</p>

                        {stats.openedBoxesInRange === 0 ? (
                            <div className="text-center py-12 bg-black/20 rounded-3xl border border-dashed border-white/5 text-gray-600 font-black uppercase tracking-widest text-[10px]">
                                No resonance detected in this timeline.
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
                                {Object.entries(stats.rarityCounts).map(([rarity, count]) => (
                                    <div key={rarity} className="p-4 sm:p-6 bg-black/40 border border-white/5 rounded-3xl flex flex-col items-center justify-center text-center shadow-inner group hover:border-primary/20 transition-all">
                                        <span className={`text-xs sm:text-sm font-black uppercase tracking-widest text-rarity-${rarity.toLowerCase()} mb-2 group-hover:scale-110 transition-transform`}>{rarity}</span>
                                        <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">{count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </DashboardSection>

                    {/* 5. SYSTEM INTEGRITY */}
                    <DashboardSection title="System Integrity" icon={<ShieldAlert />}>
                        <div className="mt-4 flex flex-col gap-6">
                            <KPICard
                                title="Anomalous Activations"
                                value={stats.failedActivations}
                                alert={stats.failedActivations > 0}
                                subtext="Unauthorized or errored scans"
                                tooltip="The number of times an invalid activation attempt occurred within this time window."
                            />

                            {stats.recentErrors.length > 0 && (
                                <div className="bg-black/60 rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
                                    <div className="px-6 py-4 bg-red-500/10 border-b border-white/5 text-[10px] text-red-400 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                        <AlertTriangle size={14} /> Critical Incident Log
                                    </div>
                                    <div className="divide-y divide-white/5">
                                        {stats.recentErrors.map((err, i) => (
                                            <div key={i} className="p-4 sm:p-6 text-sm flex flex-col sm:flex-row justify-between items-start gap-3 hover:bg-white/[0.02] transition-colors">
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-red-400 font-black uppercase text-[10px] tracking-widest bg-red-500/10 px-2 py-0.5 rounded-md">
                                                            {err.action}
                                                        </span>
                                                        <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Incident Root</span>
                                                    </div>
                                                    <p className="text-gray-400 font-mono text-[10px] break-all leading-relaxed whitespace-pre-wrap">
                                                        {JSON.stringify(err.details, null, 2)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-600 shrink-0">
                                                    <Clock size={12} />
                                                    {new Date(err.created_at).toLocaleDateString()}
                                                </div>
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
