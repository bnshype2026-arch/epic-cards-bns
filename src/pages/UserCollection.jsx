import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Filter, Search } from 'lucide-react'
import { FallbackImage } from '../components/FallbackImage'
import { CardInspectModal } from '../components/CardInspectModal'

// Helper component for countdown
const Countdown = ({ expiryDate }) => {
    const [timeLeft, setTimeLeft] = useState('')
    const [isExpired, setIsExpired] = useState(false)

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = new Date(expiryDate) - new Date()

            if (difference <= 0) {
                setIsExpired(true)
                setTimeLeft('EXPIRED')
                return
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24))
            const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
            const minutes = Math.floor((difference / 1000 / 60) % 60)
            const seconds = Math.floor((difference / 1000) % 60)

            setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`)
        }

        calculateTimeLeft()
        const timer = setInterval(calculateTimeLeft, 1000)
        return () => clearInterval(timer)
    }, [expiryDate])

    return (
        <span className={`font-mono text-sm ${isExpired ? 'text-red-500 font-bold' : 'text-gray-300'}`}>
            {timeLeft}
        </span>
    )
}

export const UserCollection = () => {
    const { user } = useAuth()
    const [cards, setCards] = useState([])
    const [loading, setLoading] = useState(true)

    // Modal State
    const [inspectedCard, setInspectedCard] = useState(null)

    // Filter States
    const [filterRarity, setFilterRarity] = useState('All')
    const [filterStatus, setFilterStatus] = useState('All')
    const [sortBy, setSortBy] = useState('Newest')

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1)
    const cardsPerPage = 12

    useEffect(() => {
        if (user) {
            fetchCollection()
        }
    }, [user])

    const fetchCollection = async () => {
        try {
            const { data, error } = await supabase
                .from('card_instances')
                .select(`
          *,
          card_templates (
            name,
            image_url,
            rarity,
            description
          )
        `)
                .eq('owner_id', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            setCards(data)
        } catch (err) {
            console.error('Error fetching collection:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteCard = async (instanceId) => {
        if (!window.confirm('Are you sure you want to permanently delete this card from your collection? This action cannot be undone.')) {
            return
        }

        try {
            const { error } = await supabase
                .from('card_instances')
                .delete()
                .eq('id', instanceId)

            if (error) throw error

            setCards(prev => prev.filter(c => c.id !== instanceId))
            setInspectedCard(null)
        } catch (err) {
            alert('Error deleting card: ' + err.message)
            console.error('Delete error:', err)
        }
    }

    const filteredCards = useMemo(() => {
        let result = cards.filter(instance => {
            const isActualExpired = new Date(instance.expiry_date) <= new Date() || instance.activation_status === 'Expired'
            const isActivated = instance.activation_status === 'Activated'
            const isDisabled = instance.activation_status === 'Disabled'
            let statusMatches = true
            let rarityMatches = true

            // Status Check
            if (filterStatus === 'Active') {
                statusMatches = !isActualExpired && !isActivated && !isDisabled
            } else if (filterStatus === 'Activated') {
                statusMatches = isActivated
            } else if (filterStatus === 'Expired') {
                statusMatches = isActualExpired
            } else if (filterStatus === 'Disabled') {
                statusMatches = isDisabled
            }

            // Rarity Check
            if (filterRarity !== 'All') {
                rarityMatches = instance.card_templates.rarity === filterRarity
            }

            return statusMatches && rarityMatches
        })

        // Sorting
        result.sort((a, b) => {
            if (sortBy === 'Newest') {
                return new Date(b.created_at) - new Date(a.created_at)
            } else if (sortBy === 'Oldest') {
                return new Date(a.created_at) - new Date(b.created_at)
            } else {
                const rarityOrder = { 'Common': 1, 'Rare': 2, 'Epic': 3, 'Legendary': 4, 'Mystic': 5 }
                const aRank = rarityOrder[a.card_templates.rarity] || 0
                const bRank = rarityOrder[b.card_templates.rarity] || 0
                if (sortBy === 'RarityDesc') return bRank - aRank
                if (sortBy === 'RarityAsc') return aRank - bRank
            }
            return 0
        })

        return result
    }, [cards, filterRarity, filterStatus, sortBy])

    // Pagination Mathematics
    const totalPages = Math.ceil(filteredCards.length / cardsPerPage)
    const currentCards = filteredCards.slice(
        (currentPage - 1) * cardsPerPage,
        currentPage * cardsPerPage
    )

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [filterRarity, filterStatus, sortBy])

    const playClickSound = () => {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = audioCtx.createOscillator()
        const gainNode = audioCtx.createGain()
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1)
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1)
        oscillator.connect(gainNode)
        gainNode.connect(audioCtx.destination)
        oscillator.start()
        oscillator.stop(audioCtx.currentTime + 0.1)
    }

    const handleInspect = (instance) => {
        playClickSound()
        setInspectedCard(instance)
    }

    if (loading) return <div className="text-center py-12">Loading collection...</div>

    return (
        <div className="flex flex-col min-h-[80vh] py-8 px-4 relative">
            {/* Ambient Background Elements */}
            <div className="absolute top-0 right-1/4 w-[600px] h-[400px] bg-primary/10 blur-[100px] rounded-full pointer-events-none -z-10"></div>
            <div className="absolute bottom-1/4 left-0 w-[500px] h-[300px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 border-b border-white/5 pb-6">
                <div className="animate-fade-in-up">
                    <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tight drop-shadow-lg">
                        My <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">Collection</span>
                    </h1>
                    <p className="text-gray-400">View and inspect your acquired digital assets.</p>
                </div>

                {/* Filters Panel */}
                <div className="flex flex-wrap items-center gap-3 bg-black/40 backdrop-blur-xl p-2 rounded-2xl border border-white/10 w-full md:w-auto shadow-2xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="flex items-center gap-2 px-3 text-gray-400 border-r border-white/10 h-full">
                        <Filter size={18} className="text-primary" /> <span className="text-sm font-bold uppercase tracking-wider hidden sm:inline">Sort & Filter</span>
                    </div>

                    <select
                        className="bg-surface/50 border border-white/5 rounded-xl px-2 sm:px-4 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all cursor-pointer hover:bg-surface"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="Newest">Newest First</option>
                        <option value="Oldest">Oldest First</option>
                        <option value="RarityDesc">Rarity (High to Low)</option>
                        <option value="RarityAsc">Rarity (Low to High)</option>
                    </select>

                    <select
                        className="bg-surface/50 border border-white/5 rounded-xl px-2 sm:px-4 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all cursor-pointer hover:bg-surface"
                        value={filterRarity}
                        onChange={(e) => setFilterRarity(e.target.value)}
                    >
                        <option value="All">All Rarities</option>
                        <option value="Common">Common</option>
                        <option value="Rare">Rare</option>
                        <option value="Epic">Epic</option>
                        <option value="Legendary">Legendary</option>
                        <option value="Mystic">Mystic</option>
                    </select>

                    <select
                        className="bg-surface/50 border border-white/5 rounded-xl px-2 sm:px-4 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all cursor-pointer hover:bg-surface"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="All">All Statuses</option>
                        <option value="Active">Active (Unused)</option>
                        <option value="Activated">Activated</option>
                        <option value="Expired">Expired</option>
                        <option value="Disabled">Disabled</option>
                    </select>
                </div>
            </div>

            {cards.length === 0 ? (
                <div className="text-center text-gray-400 py-16 bg-surface/30 backdrop-blur-sm rounded-3xl border border-white/5 flex flex-col items-center justify-center animate-fade-in-up" stroke="rgba(255,255,255,0.1)">
                    <span className="text-6xl mb-4 opacity-50">📭</span>
                    <h3 className="text-xl font-bold text-white mb-2">Your vault is empty</h3>
                    <p>You don't have any cards yet. Head over to the dashboard to open a lootbox!</p>
                </div>
            ) : filteredCards.length === 0 ? (
                <div className="text-center text-gray-400 py-12 bg-surface rounded-2xl border border-white/5">
                    No cards match your current filters.
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {currentCards.map((instance) => {
                            const template = instance.card_templates
                            const isActualExpired = new Date(instance.expiry_date) <= new Date() || instance.activation_status === 'Expired'
                            const isActivated = instance.activation_status === 'Activated'
                            const isDisabled = instance.activation_status === 'Disabled'

                            // Calculate effective lifespan (accounts for clamping by active_to)
                            const effectiveExpiryDays = (instance.opened_at && instance.expiry_date)
                                ? Math.round((new Date(instance.expiry_date) - new Date(instance.opened_at)) / (1000 * 60 * 60 * 24))
                                : instance.locked_expiry_days;

                            // Expiry Warning check (3 days)
                            const daysUntilExpiry = !isActualExpired && !isActivated && !isDisabled
                                ? (new Date(instance.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
                                : null;
                            const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 3;

                            return (
                                <div
                                    key={instance.id}
                                    onClick={() => handleInspect(instance)}
                                    className={`rounded-xl overflow-hidden border transition-all duration-300 flex flex-col cursor-pointer
                      ${isDisabled ? 'opacity-50 grayscale border-red-900 bg-red-950/20 hover:border-red-500/50 hover:scale-[1.02]' :
                                            isActualExpired ? 'opacity-60 grayscale-[1] border-white/10 hover:border-white/30 hover:scale-[1.02]' :
                                                isActivated ? 'border-primary/50 bg-primary/5 hover:border-primary hover:scale-[1.02]' :
                                                    isExpiringSoon ? 'border-orange-500/80 hover:border-orange-400 bg-orange-950/20 shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:scale-[1.02] animate-pulse' :
                                                        'border-white/10 hover:border-white/30 bg-surface hover:scale-[1.02]'
                                        }
                      ${!isActualExpired && !isActivated && !isDisabled && !isExpiringSoon && `hover:glow-${template.rarity.toLowerCase()}`}
                      ${(!isActualExpired && !isActivated && !isDisabled && !isExpiringSoon) ? 'card-shine' : ''}
                    `}
                                >
                                    {/* Card Image area */}
                                    <div className="aspect-[2/3] relative overflow-hidden bg-black/50 w-full shrink-0">
                                        <FallbackImage
                                            src={template.image_url}
                                            alt={template.name}
                                            className="absolute inset-0 w-full h-full"
                                        />

                                        {/* Status Badges */}
                                        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
                                            {isDisabled ? (
                                                <span className="bg-red-900 border border-red-500 text-red-100 text-xs font-bold px-2 py-1 rounded shadow-lg">DISABLED</span>
                                            ) : isActualExpired ? (
                                                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">EXPIRED</span>
                                            ) : isActivated ? (
                                                <span className="bg-primary text-white text-xs font-bold px-2 py-1 rounded shadow-lg">ACTIVATED</span>
                                            ) : (
                                                <span className={`backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded border border-white/20 shadow-lg bg-rarity-${template.rarity.toLowerCase()}/60`}>
                                                    {template.rarity}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Card Info Details - Mini TCG Format */}
                                    <div className="p-3 bg-gradient-to-b from-surface to-[#15151a] border-t border-white/5 flex-1 flex flex-col justify-end relative">
                                        <h3 className="font-bold text-lg leading-tight mb-2 truncate drop-shadow-md" title={template.name}>
                                            {template.name}
                                        </h3>

                                        {/* Mini Stats Strip */}
                                        <div className="flex bg-black/40 rounded border border-white/5 mb-3 overflow-hidden text-xs">
                                            <div className="flex-1 p-1.5 border-r border-white/5 flex items-center justify-center gap-1">
                                                <span className="text-primary">⚔️</span>
                                                <span className="font-bold text-white">{instance.locked_discount_percentage}%</span>
                                            </div>
                                            <div className="flex-1 p-1.5 flex items-center justify-center gap-1">
                                                <span className="text-red-400">⌛</span>
                                                <span className="font-bold text-gray-200">{effectiveExpiryDays}d</span>
                                            </div>
                                        </div>

                                        {/* Active Period Display */}
                                        {(instance.active_from || instance.active_to) && (
                                            <div className="flex justify-between items-center text-[10px] bg-white/5 rounded px-2 py-1 mb-2 border border-white/5">
                                                <span className="text-gray-500 uppercase tracking-wider font-bold">Valid</span>
                                                <span className="text-gray-300 font-mono">
                                                    {instance.active_from ? new Date(instance.active_from).toLocaleDateString() : 'Now'} - {instance.active_to ? new Date(instance.active_to).toLocaleDateString() : 'Forever'}
                                                </span>
                                            </div>
                                        )}

                                        {(!isActivated && !isActualExpired && !isDisabled) && (
                                            <div className={`pt-3 border-t border-white/10 flex justify-between items-center mt-auto ${isExpiringSoon ? 'text-orange-400 font-bold' : ''}`}>
                                                <span className={`text-[10px] uppercase font-bold tracking-wider ${isExpiringSoon ? 'text-orange-500 animate-bounce' : 'text-gray-500'}`}>
                                                    {isExpiringSoon ? '⚠️ Expiring Soon' : 'Expires'}
                                                </span>
                                                <Countdown expiryDate={instance.expiry_date} />
                                            </div>
                                        )}
                                    </div>

                                    {/* S/N Footer */}
                                    <div className="mt-2 flex justify-end shrink-0 w-full overflow-hidden">
                                        <div className="text-white font-mono text-[10px] sm:text-xs tracking-widest cursor-text truncate bg-black/60 px-2 py-1 rounded-sm border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.4)] block max-w-full" title={instance.serial_number}>
                                            S/N: {instance.serial_number}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-12 bg-surface/30 backdrop-blur-sm p-4 rounded-2xl border border-white/5 w-fit mx-auto">
                            <button
                                onClick={() => {
                                    setCurrentPage(p => Math.max(1, p - 1))
                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                                disabled={currentPage === 1}
                                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-bold"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-gray-400 font-mono">
                                Page <span className="text-white font-bold">{currentPage}</span> of <span className="text-white font-bold">{totalPages}</span>
                            </span>
                            <button
                                onClick={() => {
                                    setCurrentPage(p => Math.min(totalPages, p + 1))
                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                }}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-bold"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}

            {inspectedCard && (
                <CardInspectModal
                    instance={inspectedCard}
                    onClose={() => setInspectedCard(null)}
                    onDelete={() => handleDeleteCard(inspectedCard.id)}
                />
            )}
        </div>
    )
}
