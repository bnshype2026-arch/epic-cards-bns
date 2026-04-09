import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Search, CheckCircle, XCircle, FileText, Camera } from 'lucide-react'
import { FallbackImage } from '../../components/FallbackImage'
import { Scanner } from '../../components/Scanner'

export const AdminActivate = () => {
    const { user } = useAuth()
    const [serial, setSerial] = useState('')
    const [invoiceNumber, setInvoiceNumber] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)
    const [availableCards, setAvailableCards] = useState(0) // NEW
    const [showScanner, setShowScanner] = useState(false)

    useEffect(() => {
        const fetchAvailable = async () => {
            try {
                const { count } = await supabase
                    .from('card_instances')
                    .select('*', { count: 'exact', head: true })
                    .eq('pool_status', 'Available')
                setAvailableCards(count || 0)
            } catch (err) {
                console.error('Error fetching available cards', err)
            }
        }
        fetchAvailable()
    }, [])

    const handleVerify = async (e) => {
        if (e) e.preventDefault()
        verifySerial(serial)
    }

    const verifySerial = async (serialToVerify) => {
        if (!serialToVerify || !serialToVerify.trim()) return

        setLoading(true)
        setError(null)
        setResult(null)

        const input = serialToVerify.trim()
        const isTokenFormat = input.startsWith('ACT-')

        console.log(`[AdminActivate] Verifying input: ${input} (IsToken: ${isTokenFormat})`)

        try {
            let query = supabase
                .from('card_instances')
                .select(`
                    *,
                    user_profiles!card_instances_owner_id_fkey(email, id),
                    card_templates(name, rarity, image_url, description)
                `)

            if (isTokenFormat) {
                // Try exact match first
                let { data, error: fetchError } = await query.eq('activation_token', input).single()
                
                if (fetchError && fetchError.code === 'PGRST116') {
                    // Try case-insensitive match if exact fails (some scanners might lowercase)
                    console.warn(`[AdminActivate] Exact token match failed, trying case-insensitive for: ${input}`)
                    const { data: ciData, error: ciError } = await supabase
                        .from('card_instances')
                        .select(`
                            *,
                            user_profiles!card_instances_owner_id_fkey(email, id),
                            card_templates(name, rarity, image_url, description)
                        `)
                        .ilike('activation_token', input)
                        .single()
                    
                    data = ciData
                    fetchError = ciError
                }

                if (fetchError) {
                    if (fetchError.code === 'PGRST116') throw new Error('Invalid or Expired Activation Token. Please check if a new one was generated.')
                    throw fetchError
                }
                
                const expiry = new Date(data.activation_token_expires_at)
                if (expiry < new Date()) {
                    throw new Error('This activation token has expired. Please ask the user to generate a new one.')
                }
                setResult(data)
            } else {
                // Fallback for direct serial activation (Legacy or Manual Override)
                const { data, error: fetchError } = await query.eq('serial_number', input).single()
                
                if (fetchError) {
                    if (fetchError.code === 'PGRST116') throw new Error('Card Record Not Found.')
                    throw fetchError
                }
                setResult(data)
            }
        } catch (err) {
            console.error(`[AdminActivate] Verification Error:`, err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleScan = (decodedText) => {
        setSerial(decodedText)
        setShowScanner(false)
        verifySerial(decodedText)
    }

    const handleActivate = async () => {
        if (!result || result.activation_status !== 'Inactive') return
        if (!invoiceNumber.trim()) {
            alert("Please provide the Invoice Number associated with this activation.")
            return
        }

        // Quick manual Expiry Check before activating
        if (new Date(result.expiry_date) < new Date()) {
            alert("This card has expired and cannot be activated.")
            return
        }

        // Active Period Check
        const now = new Date()
        if (result.active_from && now < new Date(result.active_from)) {
            alert(`This card is not active yet. It becomes valid on ${new Date(result.active_from).toLocaleDateString()}.`)
            return
        }
        if (result.active_to && now > new Date(result.active_to)) {
            alert(`This card's promotional period has ended. It was valid until ${new Date(result.active_to).toLocaleDateString()}.`)
            return
        }

        if (!window.confirm("Are you sure you want to ACTIVATE this card? This action is irreversible.")) return

        setLoading(true)
        const activatedTime = new Date().toISOString()
        try {
            const { error: updateError } = await supabase
                .from('card_instances')
                .update({
                    activation_status: 'Activated',
                    activated_at: activatedTime,
                    activated_invoice_number: invoiceNumber.trim(),
                    activated_by: user.id,
                    activation_token: null,
                    activation_token_expires_at: null
                })
                .eq('id', result.id)

            if (updateError) throw updateError

            await supabase.from('audit_logs').insert([{
                user_id: result.user_profiles?.id || null, // The owner
                action: 'CARD_ACTIVATED',
                details: { instance_id: result.id, serial_number: result.serial_number }
            }])

            alert('Card successfully activated!')
            // Refresh result
            setResult({
                ...result,
                activation_status: 'Activated',
                activated_at: activatedTime,
                activated_invoice_number: invoiceNumber.trim()
            })
            setInvoiceNumber('') // Reset invoice input
        } catch (err) {
            alert('Activation failed: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">Activation Panel</h1>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium">Verify and activate card instances</p>
                </div>
                <div className="bg-primary/20 border border-primary/30 text-primary px-4 sm:px-5 py-2 rounded-2xl sm:rounded-xl text-center shadow-inner w-full sm:w-auto">
                    <p className="text-[10px] uppercase tracking-tighter font-black opacity-80 mb-0.5">Remaining Card Pool</p>
                    <p className="text-xl sm:text-2xl font-black leading-none tracking-tight">{availableCards.toLocaleString()}</p>
                </div>
            </div>

            {/* Search Form */}
            <div className="bg-surface/80 backdrop-blur border border-white/5 p-4 sm:p-6 rounded-2xl mb-6 sm:mb-8 shadow-xl">
                <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Enter Serial Number"
                            required
                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-11 py-3.5 sm:py-4 text-white focus:outline-none focus:border-primary text-base sm:text-lg transition-colors placeholder-gray-600"
                            value={serial}
                            onChange={e => setSerial(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowScanner(true)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-primary transition-colors bg-white/5 rounded-lg border border-white/5"
                            title="Scan QR Code"
                        >
                            <Camera size={20} className="sm:hidden" />
                            <Camera size={24} className="hidden sm:block" />
                        </button>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-primary hover:bg-blue-600 text-white font-black uppercase tracking-tighter px-8 py-3.5 sm:py-0 rounded-xl transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] disabled:opacity-50 active:scale-[0.98]"
                    >
                        Verify
                    </button>
                </form>

                {error && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg flex items-center gap-2">
                        <XCircle size={20} />
                        {error}
                    </div>
                )}
            </div>

            {/* Result Display */}
            {result && (
                <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                    <div className={`p-4 border-b ${result.activation_status === 'Activated' ? 'bg-primary/20 border-primary/30' :
                        result.activation_status === 'Expired' || new Date(result.expiry_date) < new Date() ? 'bg-red-500/20 border-red-500/30' :
                            result.activation_status === 'Disabled' ? 'bg-red-900/40 border-red-700/50' :
                                'bg-white/5 border-white/10'
                        }`}>
                        <div className="flex justify-between items-center">
                            <h2 className="font-bold text-lg">Verification Result</h2>
                            <StatusBadge status={new Date(result.expiry_date) < new Date() && result.activation_status === 'Inactive' ? 'Expired' : result.activation_status} />
                        </div>
                    </div>

                    <div className="p-4 sm:p-6 md:p-8 flex flex-col items-center gap-6 sm:gap-8">
                        <div className="w-48 h-72 sm:w-40 sm:h-60 shrink-0">
                            <FallbackImage
                                src={result.card_templates?.image_url}
                                alt={result.card_templates?.name}
                                className="w-full h-full object-cover rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.6)] border border-white/10"
                            />
                        </div>

                        <div className="flex-1 space-y-5 sm:space-y-4 w-full">
                            <div className="text-center sm:text-left">
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Card Details</p>
                                <p className="text-2xl sm:text-3xl font-black text-white leading-tight">{result.card_templates?.name}</p>
                                <p className={`mt-1 text-sm font-black uppercase tracking-widest text-rarity-${result.card_templates?.rarity.toLowerCase()}`}>
                                    {result.card_templates?.rarity} • {result.locked_discount_percentage}% OFF
                                </p>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 shadow-inner">
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1 opacity-70">Ability Description</p>
                                <p className="text-gray-300 text-sm leading-relaxed italic font-serif">
                                    {result.card_templates?.description || "A mysterious artifact of unknown power."}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <InfoBox label="Serial Number" value={result.serial_number} />
                                <InfoBox label="Owner Email" value={result.user_profiles?.email || 'Unclaimed'} />
                                <InfoBox label="Opened At" value={result.opened_at ? new Date(result.opened_at).toLocaleDateString() : 'N/A'} />
                                <InfoBox
                                    label="Expiry Date"
                                    value={result.expiry_date ? new Date(result.expiry_date).toLocaleDateString() : 'N/A'}
                                    failed={new Date(result.expiry_date) < new Date()}
                                />
                                {(result.active_from || result.active_to) && (
                                    <div className="sm:col-span-2">
                                        <InfoBox
                                            label="Promotion Period"
                                            value={`${result.active_from ? new Date(result.active_from).toLocaleDateString() : 'Now'} - ${result.active_to ? new Date(result.active_to).toLocaleDateString() : 'Forever'}`}
                                            failed={
                                                (result.active_from && new Date() < new Date(result.active_from)) ||
                                                (result.active_to && new Date() > new Date(result.active_to))
                                            }
                                        />
                                    </div>
                                )}
                                {result.activation_status === 'Activated' && (
                                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        <InfoBox label="Activation Date" value={result.activated_at ? new Date(result.activated_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : 'N/A'} />
                                        <InfoBox label="Invoice Reference" value={result.activated_invoice_number || 'Legacy'} />
                                    </div>
                                )}
                            </div>

                            {result.activation_status === 'Inactive' && new Date(result.expiry_date) > new Date() && (
                                <div className="mt-6 space-y-4 bg-white/5 border border-white/10 p-4 rounded-xl">
                                    <div>
                                        <label className="block text-sm font-medium tracking-wide text-gray-400 mb-1">Invoice Number <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. INV-2023-001"
                                                className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
                                                value={invoiceNumber}
                                                onChange={e => setInvoiceNumber(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleActivate}
                                        disabled={loading || !invoiceNumber.trim()}
                                        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] disabled:opacity-50"
                                    >
                                        <CheckCircle /> Activate Card
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showScanner && (
                <Scanner 
                    onScan={handleScan} 
                    onClose={() => setShowScanner(false)} 
                />
            )}
        </div>
    )
}

const InfoBox = ({ label, value, failed }) => (
    <div className={`p-3 rounded-xl border ${failed ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-black/40 border-white/5 shadow-inner'}`}>
        <p className="text-[10px] text-gray-500 mb-1 font-black uppercase tracking-widest opacity-70">{label}</p>
        <p className="font-bold text-sm truncate uppercase tracking-tight" title={value}>{value}</p>
    </div>
)

const StatusBadge = ({ status }) => {
    const styles = {
        Inactive: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
        Activated: 'bg-green-500/20 text-green-400 border-green-500/50',
        Expired: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
        Disabled: 'bg-red-500/20 text-red-500 border-red-500/50 line-through decoration-red-500',
    }
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || styles.Inactive}`}>
            {status}
        </span>
    )
}
