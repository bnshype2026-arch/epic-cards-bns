import { useState, useEffect } from 'react'
import { X, Trash2, CalendarClock } from 'lucide-react'
import { FallbackImage } from './FallbackImage'
import QRCode from 'react-qr-code'

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
        <span className={`font-mono text-sm ${isExpired ? 'text-red-500 font-bold' : 'text-primary font-bold'}`}>
            {timeLeft}
        </span>
    )
}

export const CardInspectModal = ({ instance, onClose, onDelete }) => {
    const [showBarcode, setShowBarcode] = useState(false)
    const template = instance.card_templates
    const isActualExpired = new Date(instance.expiry_date) <= new Date() || instance.activation_status === 'Expired'
    const isActivated = instance.activation_status === 'Activated'
    const isDisabled = instance.activation_status === 'Disabled'

    // Calculate the effective lifespan (accounts for clamping by active_to)
    const effectiveExpiryDays = (instance.opened_at && instance.expiry_date)
        ? Math.round((new Date(instance.expiry_date) - new Date(instance.opened_at)) / (1000 * 60 * 60 * 24))
        : instance.locked_expiry_days

    const getRarityColor = (rarity) => {
        switch (rarity) {
            case 'Common': return 'border-rarity-common bg-surface'
            case 'Rare': return 'border-rarity-rare bg-surface'
            case 'Epic': return 'border-rarity-epic bg-surface'
            case 'Legendary': return 'border-rarity-legendary bg-yellow-900/20'
            case 'Mystic': return 'border-rarity-mystic bg-rose-900/20 shadow-[0_0_50px_rgba(244,63,94,0.3)]'
            default: return 'border-white/20 bg-surface'
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in overflow-y-auto" onClick={onClose}>
            {/* Click propagation stop inside the card */}
            <div
                className={`relative w-full max-w-[400px] my-auto rounded-3xl border-4 overflow-hidden flex flex-col card-shine animate-float pointer-events-auto transform scale-100 transition-transform ${getRarityColor(template.rarity)}`}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/80 p-2 rounded-full backdrop-blur transition-colors"
                >
                    <X size={20} className="text-white" />
                </button>

                <div className={`aspect-square relative w-full flex-none bg-black border-b-4 border-black/40 ${(isActualExpired || isDisabled) ? 'grayscale-[1]' : ''}`}>
                    <FallbackImage
                        src={template.image_url}
                        alt={template.name}
                        className="absolute inset-0 w-full h-full"
                        imgClassName="object-contain object-center p-2"
                    />

                    {/* Rarity & Name Header inside image */}
                    <div className="absolute top-0 w-full p-4 bg-gradient-to-b from-black/90 to-transparent flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight">{template.name}</h2>
                            <span className={`text-xs font-black tracking-widest uppercase mb-1 drop-shadow-md text-rarity-${template.rarity.toLowerCase()}`}>
                                {template.rarity}
                            </span>
                        </div>
                    </div>
                </div>

                {/* TCG Style Body */}
                <div className="p-4 flex-1 flex flex-col justify-start bg-gradient-to-b from-surface to-[#15151a] overflow-hidden">

                    {/* Stats Strip */}
                    <div className="flex bg-black/40 rounded-lg border border-white/5 mb-2 overflow-hidden shrink-0">
                        <div className="flex-1 p-1 border-r border-white/5 flex flex-col items-center justify-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <span className="text-[8px] sm:text-[9px] text-primary uppercase font-bold tracking-widest flex items-center gap-1">
                                ⚔️ Power
                            </span>
                            <span className="text-base sm:text-lg font-black text-white drop-shadow-md">
                                {instance.locked_discount_percentage}%
                            </span>
                        </div>
                        <div className="flex-1 p-1 flex flex-col items-center justify-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <span className="text-[8px] sm:text-[9px] text-red-400 uppercase font-bold tracking-widest flex items-center gap-1">
                                ⌛ Weakness
                            </span>
                            <span className="text-[10px] sm:text-xs font-bold text-gray-200">
                                {effectiveExpiryDays} Days
                            </span>
                        </div>
                    </div>

                    {/* Active Period Constraints */}
                    {(instance.active_from || instance.active_to) && (
                        <div className="bg-white/5 border border-white/10 rounded-lg p-1 px-2 mb-2 flex justify-between items-center shadow-inner shrink-0">
                            <div className="flex items-center gap-1.5">
                                <CalendarClock size={12} className="text-purple-400" />
                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Valid</span>
                            </div>
                            <div className="text-[10px] sm:text-[11px] font-mono text-gray-200">
                                {instance.active_from ? new Date(instance.active_from).toLocaleDateString() : 'Now'}
                                <span className="text-gray-500 mx-1">-</span>
                                {instance.active_to ? new Date(instance.active_to).toLocaleDateString() : 'Forever'}
                            </div>
                        </div>
                    )}

                    {/* Description Block */}
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 mb-2 shadow-inner relative overflow-y-auto min-h-[3rem]">
                        <div className="absolute top-0 left-0 bg-surface px-1.5 py-0.5 rounded-br text-[8px] text-gray-400 font-bold uppercase tracking-wider">Ability</div>
                        <p className="text-gray-300 text-[10px] sm:text-xs leading-snug mt-3 italic font-serif">
                            {template.description || "A mysterious artifact of unknown power. Present this to uncover its secrets."}
                        </p>
                    </div>

                    {/* Footer / Status Strip */}
                    <div className="grid grid-cols-2 gap-2 text-[9px] shrink-0 mt-auto">
                        <div className="bg-black/30 p-1.5 rounded border border-white/5 flex flex-col justify-center">
                            <span className="text-gray-500 uppercase tracking-wider" style={{ fontSize: '7px' }}>Status</span>
                            <span className={`font-bold text-[10px] ${isDisabled ? 'text-red-500' : isActualExpired ? 'text-gray-500' : isActivated ? 'text-primary' : 'text-green-400'}`}>
                                {isDisabled ? 'DISABLED' : isActualExpired ? 'EXPIRED' : isActivated ? 'ACTIVATED' : 'ACTIVE'}
                            </span>
                        </div>
                        <div className="bg-black/30 p-1.5 rounded border border-white/5 flex flex-col justify-center items-end">
                            {isDisabled ? (
                                <>
                                    <span className="text-gray-500 uppercase tracking-wider" style={{ fontSize: '7px' }}>Validity</span>
                                    <span className="font-mono text-red-500 font-bold text-[10px]">VOIDED</span>
                                </>
                            ) : isActualExpired ? (
                                <>
                                    <span className="text-gray-500 uppercase tracking-wider" style={{ fontSize: '7px' }}>Time Left</span>
                                    <span className="font-mono text-gray-600 font-bold text-[10px]">EXPIRED</span>
                                </>
                            ) : isActivated ? (
                                <>
                                    <span className="text-primary uppercase tracking-wider" style={{ fontSize: '7px' }}>Activated At</span>
                                    <span className="font-mono text-primary font-bold text-[10px]">
                                        {new Date(instance.activated_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="text-gray-500 uppercase tracking-wider" style={{ fontSize: '7px' }}>Time Left</span>
                                    <div className="text-[10px]">
                                        <Countdown expiryDate={instance.expiry_date} />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* S/N Footer & Delete Actions */}
                    <div className="mt-1 flex justify-between items-end gap-2 shrink-0">
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
                                    const oscillator = audioCtx.createOscillator()
                                    const gainNode = audioCtx.createGain()
                                    oscillator.type = 'triangle'
                                    oscillator.frequency.setValueAtTime(showBarcode ? 600 : 400, audioCtx.currentTime)
                                    oscillator.frequency.exponentialRampToValueAtTime(showBarcode ? 400 : 600, audioCtx.currentTime + 0.1)
                                    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
                                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1)
                                    oscillator.connect(gainNode)
                                    gainNode.connect(audioCtx.destination)
                                    oscillator.start()
                                    oscillator.stop(audioCtx.currentTime + 0.1)
                                    setShowBarcode(!showBarcode)
                                }}
                                className="bg-white/10 hover:bg-white/20 transition-colors text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded"
                            >
                                {showBarcode ? 'Hide QR' : 'Show QR'}
                            </button>

                            {(isActualExpired || isActivated || isDisabled) && (
                                <button
                                    onClick={onDelete}
                                    className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 hover:text-red-400 transition-colors text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded flex items-center gap-1"
                                    title="Permanently Delete Card"
                                >
                                    <Trash2 size={12} /> Discard
                                </button>
                            )}
                        </div>

                        <div className="text-white font-mono text-[11px] tracking-widest bg-black/60 px-2 py-1 rounded-sm border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                            S/N: {instance.serial_number}
                        </div>
                    </div>

                    {/* QR Code Overlay */}
                    {showBarcode && (
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 animate-fade-in">
                            <h3 className="text-white font-bold tracking-widest uppercase mb-8 drop-shadow-md">Activation QR</h3>
                            <div className="bg-white p-4 rounded-xl shadow-[0_0_50px_rgba(255,255,255,0.2)] mb-8">
                                <QRCode
                                    value={instance.serial_number}
                                    size={200}
                                    bgColor="#ffffff"
                                    fgColor="#000000"
                                />
                            </div>
                            <p className="text-gray-300 font-mono text-sm mb-8 bg-white/10 px-4 py-2 rounded-lg border border-white/20">
                                {instance.serial_number}
                            </p>
                            <button
                                onClick={() => setShowBarcode(false)}
                                className="bg-primary hover:bg-white text-white hover:text-black font-bold px-8 py-3 rounded-xl transition-colors tracking-wide"
                            >
                                Close QR
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
