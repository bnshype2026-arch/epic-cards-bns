import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Search, CheckCircle, XCircle, FileText } from 'lucide-react'
import { FallbackImage } from '../../components/FallbackImage'

export const AdminActivate = () => {
    const { user } = useAuth()
    const [serial, setSerial] = useState('')
    const [invoiceNumber, setInvoiceNumber] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)
    const [availableCards, setAvailableCards] = useState(0) // NEW

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
        e.preventDefault()
        if (!serial.trim()) return

        setLoading(true)
        setError(null)
        setResult(null)

        try {
            const { data, error: fetchError } = await supabase
                .from('card_instances')
                .select(`
          *,
          user_profiles!card_instances_owner_id_fkey(email),
          card_templates(name, rarity, image_url, description)
        `)
                .eq('serial_number', serial.trim())
                .single()

            if (fetchError) {
                if (fetchError.code === 'PGRST116') throw new Error('Card not found')
                throw fetchError
            }

            setResult(data)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
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
                    activated_by: user.id
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
        <div className="max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h1 className="text-3xl font-bold">Activation Panel</h1>
                <div className="bg-primary/20 border border-primary/30 text-primary px-5 py-2 rounded-xl text-center shadow-inner">
                    <p className="text-[10px] uppercase tracking-wider font-bold opacity-80 mb-0.5">Remaining Card Pool</p>
                    <p className="text-2xl font-black leading-none">{availableCards.toLocaleString()}</p>
                </div>
            </div>

            {/* Search Form */}
            <div className="bg-surface border border-white/5 p-6 rounded-2xl mb-8">
                <form onSubmit={handleVerify} className="flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Enter Serial Number (e.g., BNS-XXXX-YYYY)"
                            required
                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary text-lg transition-colors placeholder-gray-600"
                            value={serial}
                            onChange={e => setSerial(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-primary hover:bg-blue-600 text-white font-bold px-8 rounded-xl transition-colors disabled:opacity-50"
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

                    <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center md:items-start">
                        <div className="w-40 h-60 shrink-0">
                            <FallbackImage
                                src={result.card_templates?.image_url}
                                alt={result.card_templates?.name}
                                className="w-full h-full object-cover rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-white/10"
                            />
                        </div>

                        <div className="flex-1 space-y-4 w-full">
                            <div>
                                <p className="text-sm text-gray-400">Card Name</p>
                                <p className="text-2xl font-bold">{result.card_templates?.name}</p>
                                <p className={`text-sm font-bold text-rarity-${result.card_templates?.rarity.toLowerCase()}`}>
                                    {result.card_templates?.rarity} • {result.locked_discount_percentage}% OFF
                                </p>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-lg p-3 shadow-inner">
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Ability</p>
                                <p className="text-gray-300 text-sm leading-relaxed italic font-serif">
                                    {result.card_templates?.description || "A mysterious artifact of unknown power."}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <InfoBox label="Serial Number" value={result.serial_number} />
                                <InfoBox label="Owner Email" value={result.user_profiles?.email || 'Unclaimed'} />
                                <InfoBox label="Opened At" value={result.opened_at ? new Date(result.opened_at).toLocaleDateString() : 'N/A'} />
                                <InfoBox
                                    label="Expiry Date"
                                    value={result.expiry_date ? new Date(result.expiry_date).toLocaleDateString() : 'N/A'}
                                    failed={new Date(result.expiry_date) < new Date()}
                                />
                                {(result.active_from || result.active_to) && (
                                    <div className="col-span-2">
                                        <InfoBox
                                            label="Active Promotional Period"
                                            value={`${result.active_from ? new Date(result.active_from).toLocaleDateString() : 'Now'} - ${result.active_to ? new Date(result.active_to).toLocaleDateString() : 'Forever'}`}
                                            failed={
                                                (result.active_from && new Date() < new Date(result.active_from)) ||
                                                (result.active_to && new Date() > new Date(result.active_to))
                                            }
                                        />
                                    </div>
                                )}
                                {result.activation_status === 'Activated' && (
                                    <div className="col-span-2 grid grid-cols-2 gap-4">
                                        <InfoBox label="Activated On" value={result.activated_at ? new Date(result.activated_at).toLocaleString() : 'N/A'} />
                                        <InfoBox label="Invoice Ref" value={result.activated_invoice_number || 'N/A'} />
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
        </div>
    )
}

const InfoBox = ({ label, value, failed }) => (
    <div className={`p-3 rounded-lg border ${failed ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-black/30 border-white/5'}`}>
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        <p className="font-mono text-sm truncate" title={value}>{value}</p>
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
