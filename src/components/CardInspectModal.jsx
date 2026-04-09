import { useState, useEffect } from 'react'
import { X, Trash2, CalendarClock, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react'
import { FallbackImage } from './FallbackImage'
import QRCode from 'react-qr-code'
import { supabase } from '../lib/supabase'

// Helper component for countup/countdown
const Countdown = ({ expiryDate, onExpire, isToken = false }) => {
    const [timeLeft, setTimeLeft] = useState('')
    const [isExpired, setIsExpired] = useState(false)

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = new Date(expiryDate) - new Date()

            if (difference <= 0) {
                setIsExpired(true)
                setTimeLeft('EXPIRED')
                if (onExpire) onExpire()
                return
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24))
            const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
            const minutes = Math.floor((difference / 1000 / 60) % 60)
            const seconds = Math.floor((difference / 1000) % 60)

            if (isToken) {
                // For activation tokens, just show minutes and seconds
                setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`)
            } else {
                setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`)
            }
        }

        calculateTimeLeft()
        const timer = setInterval(calculateTimeLeft, 1000)
        return () => clearInterval(timer)
    }, [expiryDate, onExpire, isToken])

    return (
        <span className={`font-mono ${isToken ? 'text-2xl tracking-tighter' : 'text-sm'} ${isExpired ? 'text-red-500 font-bold' : 'text-primary font-bold'}`}>
            {timeLeft}
        </span>
    )
}

export const CardInspectModal = ({ instance, onClose, onDelete, onUpdate }) => {
    const [showQR, setShowQR] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [token, setToken] = useState(instance.activation_token)
    const [tokenExpiry, setTokenExpiry] = useState(instance.activation_token_expires_at)
    
    const template = instance.card_templates
    const isActualExpired = new Date(instance.expiry_date) <= new Date() || instance.activation_status === 'Expired'
    const isActivated = instance.activation_status === 'Activated'
    const isDisabled = instance.activation_status === 'Disabled'

    // Refresh token state if instance changes
    useEffect(() => {
        setToken(instance.activation_token)
        setTokenExpiry(instance.activation_token_expires_at)
    }, [instance])

    const isTokenValid = token && tokenExpiry && new Date(tokenExpiry) > new Date()

    const generateActivationToken = async () => {
        setIsGenerating(true)
        try {
            // More robust token generation
            const charset = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ' // Removed confusing O, I, 1, 0
            const genPart = (len) => Array.from({ length: len }, () => charset.charAt(Math.floor(Math.random() * charset.length))).join('')
            const newToken = `ACT-${genPart(6)}-${genPart(6)}`
            const newExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes

            const { data, error } = await supabase
                .from('card_instances')
                .update({
                    activation_token: newToken,
                    activation_token_expires_at: newExpiry
                })
                .eq('id', instance.id)
                .select() // Verify the update happened

            if (error) throw error
            if (!data || data.length === 0) {
                throw new Error('Access Denied: You do not have permission to initiate activation or the card record was not found.')
            }

            setToken(newToken)
            setTokenExpiry(newExpiry)
            if (onUpdate) onUpdate(instance.id, { activation_token: newToken, activation_token_expires_at: newExpiry })
            setShowQR(true)
        } catch (err) {
            console.error('Failed to generate token:', err)
            alert(err.message || 'Security Error: Failed to generate activation token.')
        } finally {
            setIsGenerating(false)
        }
    }

    const cancelActivation = async () => {
        setIsGenerating(true)
        try {
            const { error } = await supabase
                .from('card_instances')
                .update({
                    activation_token: null,
                    activation_token_expires_at: null
                })
                .eq('id', instance.id)

            if (error) throw error

            setToken(null)
            setTokenExpiry(null)
            if (onUpdate) onUpdate(instance.id, { activation_token: null, activation_token_expires_at: null })
            setShowQR(false)
        } catch (err) {
            console.error('Failed to cancel token:', err)
        } finally {
            setIsGenerating(false)
        }
    }

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

                    {/* S/N Footer & Actions */}
                    <div className="mt-1 flex justify-between items-end gap-2 shrink-0">
                        <div className="flex gap-2">
                            {(!isActualExpired && !isActivated && !isDisabled) && (
                                <button
                                    onClick={isTokenValid ? () => setShowQR(true) : generateActivationToken}
                                    disabled={isGenerating}
                                    className="bg-primary hover:brightness-110 transition-all text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-primary/20"
                                >
                                    {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={14} />}
                                    {isTokenValid ? 'Show Activation' : 'Finalize Activation'}
                                </button>
                            )}
                            
                            {(isActualExpired || isActivated || isDisabled) && (
                                <button
                                    onClick={onDelete}
                                    className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 hover:text-red-400 transition-colors text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-lg flex items-center gap-1"
                                    title="Permanently Delete Card"
                                >
                                    <Trash2 size={14} /> Discard
                                </button>
                            )}
                        </div>

                        <div className="text-white/40 font-mono text-[9px] tracking-widest uppercase">
                            S/N: {instance.serial_number.substring(0, 8)}...
                        </div>
                    </div>

                    {/* SECURE QR CODE OVERLAY */}
                    {(showQR || isTokenValid) && showQR && (
                        <div className="absolute inset-0 bg-surface/95 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300">
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button
                                    onClick={cancelActivation}
                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-500 p-2 rounded-full border border-red-500/20 transition-all"
                                    title="Abort Activation"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="text-center mb-8">
                                <h3 className="text-white font-black tracking-[0.2em] uppercase text-lg mb-2">Secure Activation</h3>
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed max-w-[200px] mx-auto">
                                    Present this encrypted neural token to the administrator.
                                </p>
                            </div>

                            <div className="relative group">
                                <div className="absolute -inset-4 bg-primary/20 rounded-[2.5rem] blur-2xl group-hover:bg-primary/30 transition-all"></div>
                                <div className="bg-white p-5 rounded-[2rem] shadow-2xl relative">
                                    <QRCode
                                        value={token}
                                        size={180}
                                        bgColor="#ffffff"
                                        fgColor="#000000"
                                        level="H"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                                        <ShieldCheck size={80} className="text-black" />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10 flex flex-col items-center gap-2">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Code Expires In</span>
                                <div className="bg-black/40 px-6 py-2 rounded-2xl border border-white/5">
                                    <Countdown 
                                        expiryDate={tokenExpiry} 
                                        isToken={true} 
                                        onExpire={() => {
                                            setToken(null)
                                            setShowQR(false)
                                        }} 
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => setShowQR(false)}
                                className="mt-8 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors border-b border-white/10 pb-1"
                            >
                                Back to Card
                            </button>

                            <div className="mt-12 flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                                <AlertCircle size={14} className="text-primary animate-pulse" />
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Single-use encrypted session</span>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
