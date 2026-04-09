import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, X, Info, Edit2, Trash2 } from 'lucide-react'
import { FallbackImage } from '../../components/FallbackImage'

export const AdminTemplates = () => {
    const [templates, setTemplates] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)

    // Instance Generation State
    const [generatingForId, setGeneratingForId] = useState(null)
    const [generateCount, setGenerateCount] = useState(10)
    const [editingTemplateId, setEditingTemplateId] = useState(null)

    // Probability Configuration State
    const [probabilities, setProbabilities] = useState([])
    const [loadingProbs, setLoadingProbs] = useState(true)

    const [formData, setFormData] = useState({
        name: '',
        image_url: '',
        rarity: 'Common',
        discount_percentage: 20,
        expiry_days: 7,
        description: '',
        has_gift: false,
        has_task_gift: false,
        active_from: '',
        active_to: ''
    })

    useEffect(() => {
        fetchTemplates()
        fetchProbabilities()
    }, [])

    const fetchProbabilities = async () => {
        try {
            const { data, error } = await supabase.from('rarity_probabilities').select('*').order('weight', { ascending: false })
            if (error) throw error
            setProbabilities(data || [])
        } catch (err) {
            console.error('Error fetching probabilities (table might not exist yet):', err)
        } finally {
            setLoadingProbs(false)
        }
    }

    const handleUpdateProbability = async (rarity, weight) => {
        try {
            const { error } = await supabase.from('rarity_probabilities').update({ weight: Number(weight) }).eq('rarity', rarity)
            if (error) throw error
            fetchProbabilities()
        } catch (err) {
            alert('Error updating drop rate: ' + err.message)
        }
    }

    const fetchTemplates = async () => {
        try {
            const { data, error } = await supabase
                .from('card_templates')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setTemplates(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            if (editingTemplateId) {
                // UPDATE existing
                const { error } = await supabase
                    .from('card_templates')
                    .update(formData)
                    .eq('id', editingTemplateId)
                if (error) throw error
                setEditingTemplateId(null)
            } else {
                // CREATE new
                const { error } = await supabase.from('card_templates').insert([formData])
                if (error) throw error
            }

            setShowForm(false)
            // Reset form
            setFormData({
                name: '', image_url: '', rarity: 'Common', discount_percentage: 20,
                expiry_days: 7, description: '', has_gift: false, has_task_gift: false,
                active_from: '', active_to: ''
            })
            fetchTemplates()
        } catch (err) {
            alert('Error saving template: ' + err.message)
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this template? Future lootboxes won't be able to generate it. Existing cards are unaffected if instances were already created, but it's generally safer to just set 'Generate Instances' to 0.")) return
        try {
            const { error } = await supabase.from('card_templates').delete().eq('id', id)
            if (error) throw error
            fetchTemplates()
        } catch (err) {
            alert('Error deleting template. Ensure no instances are linked to it first, or ask a dev to perform a soft-delete: ' + err.message)
        }
    }

    const startEdit = (template) => {
        setFormData({
            name: template.name,
            image_url: template.image_url,
            rarity: template.rarity,
            discount_percentage: template.discount_percentage,
            expiry_days: template.expiry_days,
            description: template.description || '',
            has_gift: template.has_gift,
            has_task_gift: template.has_task_gift,
            active_from: template.active_from ? template.active_from.split('T')[0] : '',
            active_to: template.active_to ? template.active_to.split('T')[0] : ''
        })
        setEditingTemplateId(template.id)
        setShowForm(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const cancelForm = () => {
        setShowForm(false)
        setEditingTemplateId(null)
        setFormData({
            name: '', image_url: '', rarity: 'Common', discount_percentage: 20,
            expiry_days: 7, description: '', has_gift: false, has_task_gift: false,
            active_from: '', active_to: ''
        })
    }

    const handleGenerateInstances = async (templateId) => {
        try {
            const instances = Array.from({ length: generateCount }).map(() => ({
                template_id: templateId,
                serial_number: `BNS-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
                pool_status: 'Available',
                activation_status: 'Inactive'
            }))

            const { error } = await supabase.from('card_instances').insert(instances)
            if (error) throw error

            alert(`Successfully generated ${generateCount} instances for this template!`)
            setGeneratingForId(null)
        } catch (err) {
            alert('Error generating instances: ' + err.message)
        }
    }

    const handleClearAllAvailable = async () => {
        if (!window.confirm("WARNING: Are you absolutely sure you want to permanently delete ALL undistributed (Available) cards across ALL templates? This will not affect cards already owned by users, but the active lootbox pool will be emptied.")) return

        try {
            const { error } = await supabase
                .from('card_instances')
                .delete()
                .eq('pool_status', 'Available')
                .is('owner_id', null)

            if (error) throw error
            alert(`Successfully cleared the available supply! The lootbox pool is now empty.`)
        } catch (err) {
            alert('Error clearing global instances: ' + err.message)
        }
    }

    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 sm:gap-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">Card Templates</h1>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium tracking-tight">Manage designs and generate new drop pools</p>
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                    <button
                        onClick={handleClearAllAvailable}
                        className="flex-1 sm:flex-none bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all font-black uppercase tracking-tighter text-xs"
                        title="Delete all unassigned instances"
                    >
                        <Trash2 size={16} />
                        Clear Supply
                    </button>
                    <button
                        onClick={() => showForm ? cancelForm() : setShowForm(true)}
                        className="flex-1 sm:flex-none bg-primary hover:bg-blue-600 px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all font-black uppercase tracking-tighter text-xs shadow-[0_0_20px_rgba(37,99,235,0.3)] text-white"
                    >
                        {showForm ? <X size={18} /> : <Plus size={18} />}
                        {showForm ? 'Cancel' : 'New Design'}
                    </button>
                </div>
            </div>

            {/* Probability Configuration Panel */}
            <div className="bg-surface/80 backdrop-blur border border-white/10 p-5 sm:p-6 rounded-3xl mb-8 shadow-2xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-primary/10 transition-colors" />
                
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Info size={18} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-tighter">Lootbox Drop Rates</h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Global pool probability control</p>
                    </div>
                </div>

                {loadingProbs ? (
                    <div className="text-gray-500 text-sm animate-pulse font-medium">Calibrating drop rates...</div>
                ) : probabilities.length === 0 ? (
                    <div className="text-orange-400 text-xs sm:text-sm flex items-start gap-3 bg-orange-500/10 p-4 rounded-2xl border border-orange-500/20">
                        <Info size={18} className="shrink-0" />
                        <span>The probability mapping table is uninitialized. Run migrations to enable pool control.</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-5 gap-3">
                        {probabilities.map(prob => {
                            const totalWeight = probabilities.reduce((sum, p) => sum + p.weight, 0);
                            const percentage = totalWeight > 0 ? Math.round((prob.weight / totalWeight) * 100) : 0;
                            return (
                                <div key={prob.rarity} className="bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col gap-3 relative transition-all hover:border-white/10 group/item">
                                    <div className="flex justify-between items-center">
                                        <span className={`text-xs font-black uppercase tracking-widest text-rarity-${prob.rarity.toLowerCase()}`}>
                                            {prob.rarity}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-black bg-white/5 px-1.5 py-0.5 rounded-md">
                                            {percentage}%
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest">WGT</span>
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full bg-black/40 border-none rounded-xl px-0 py-1 text-white focus:ring-0 text-xl font-black transition-all group-hover/item:text-primary"
                                            defaultValue={prob.weight}
                                            onBlur={(e) => {
                                                if (Number(e.target.value) !== prob.weight) {
                                                    handleUpdateProbability(prob.rarity, e.target.value)
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full bg-rarity-${prob.rarity.toLowerCase()}`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-surface/90 backdrop-blur border border-white/10 p-6 rounded-3xl mb-8 space-y-6 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                    <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                        <Edit2 size={18} className="text-primary" />
                        {editingTemplateId ? 'Revise Template' : 'Foundation Design'}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Card Identity</label>
                            <input required type="text" placeholder="Design Name" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all text-sm font-medium" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex justify-between">
                                Visual Resource
                                <span className="text-primary flex items-center gap-1 opacity-70">
                                    <Info size={10} /> Tips
                                </span>
                            </label>
                            <input required type="url" placeholder="https://image-url.jpg" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all text-sm font-mono tracking-tight" value={formData.image_url} onChange={e => setFormData({ ...formData, image_url: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Tier Classification</label>
                            <select className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all text-sm font-bold" value={formData.rarity} onChange={e => setFormData({ ...formData, rarity: e.target.value })}>
                                <option value="Common">Common</option>
                                <option value="Rare">Rare</option>
                                <option value="Epic">Epic</option>
                                <option value="Legendary">Legendary</option>
                                <option value="Mystic">Mystic</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Discount Factor (%)</label>
                            <input required type="number" min="1" max="100" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all text-sm font-black" value={formData.discount_percentage} onChange={e => setFormData({ ...formData, discount_percentage: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Validity Period (Days)</label>
                            <input required type="number" min="1" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all text-sm font-black" value={formData.expiry_days} onChange={e => setFormData({ ...formData, expiry_days: Number(e.target.value) })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 text-center block">Active From</label>
                                <input type="date" className="w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-3 text-white focus:outline-none focus:border-primary transition-all text-xs font-bold appearance-none text-center" value={formData.active_from} onChange={e => setFormData({ ...formData, active_from: e.target.value || null })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 text-center block">Active To</label>
                                <input type="date" className="w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-3 text-white focus:outline-none focus:border-primary transition-all text-xs font-bold appearance-none text-center" value={formData.active_to} onChange={e => setFormData({ ...formData, active_to: e.target.value || null })} />
                            </div>
                        </div>
                        <div className="md:col-span-2 space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 text-center block md:text-left">Ability & Lore Narrative</label>
                            <textarea
                                required
                                rows="3"
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all text-xs font-medium resize-none leading-relaxed"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="E.g., Upon activation, this card grants a legendary discount..."
                            />
                        </div>
                        <div className="md:col-span-2 flex flex-wrap gap-4 sm:gap-8 bg-black/20 p-4 rounded-2xl border border-white/5">
                            <label className="flex items-center gap-3 text-xs font-black uppercase tracking-widest cursor-pointer group">
                                <div className={`w-5 h-5 rounded-md border border-white/20 flex items-center justify-center transition-all ${formData.has_gift ? 'bg-primary border-primary' : 'bg-black/40'}`}>
                                    {formData.has_gift && <Plus size={14} className="text-white" />}
                                </div>
                                <input type="checkbox" className="hidden" checked={formData.has_gift} onChange={e => setFormData({ ...formData, has_gift: e.target.checked })} />
                                Free Gift Attachment
                            </label>
                            <label className="flex items-center gap-3 text-xs font-black uppercase tracking-widest cursor-pointer group">
                                <div className={`w-5 h-5 rounded-md border border-white/20 flex items-center justify-center transition-all ${formData.has_task_gift ? 'bg-primary border-primary' : 'bg-black/40'}`}>
                                    {formData.has_task_gift && <Plus size={14} className="text-white" />}
                                </div>
                                <input type="checkbox" className="hidden" checked={formData.has_task_gift} onChange={e => setFormData({ ...formData, has_task_gift: e.target.checked })} />
                                Task Completion Bonus
                            </label>
                        </div>
                    </div>
                    
                    <div className="flex gap-4 pt-2">
                        <button type="submit" className="flex-1 bg-primary hover:brightness-110 px-6 py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-primary/20 text-white">
                            {editingTemplateId ? 'Commit Update' : 'Initialize Design'}
                        </button>
                        <button type="button" onClick={cancelForm} className="bg-white/5 hover:bg-white/10 px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all text-gray-400">
                            Abort
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <Plus className="animate-spin text-primary" size={40} />
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Synchronizing Archive...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {templates.map(template => (
                        <div key={template.id} className="bg-surface/60 backdrop-blur-sm border border-white/5 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-stretch group hover:bg-surface/80 transition-all hover:border-white/10 shadow-lg">
                            <div className="relative shrink-0 group/img">
                                <FallbackImage src={template.image_url} alt={template.name} className="w-32 h-48 sm:w-28 sm:h-40 rounded-2xl shadow-2xl object-cover border border-white/10 group-hover/img:scale-105 transition-transform duration-500" />
                                <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-rarity-${template.rarity.toLowerCase()}/20 text-rarity-${template.rarity.toLowerCase()} backdrop-blur-md border border-white/20 pointer-events-none`}>
                                    {template.rarity}
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col justify-center text-center sm:text-left">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
                                    <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">{template.name}</h3>
                                    <div className="flex items-center justify-center sm:justify-start gap-3">
                                        <span className="text-xs font-black text-green-400 bg-green-400/10 px-2 py-1 rounded-lg border border-green-400/10">
                                            -{template.discount_percentage}% OFF
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Validity Span</span>
                                        <span className="text-xs text-white font-bold">{template.expiry_days} Days</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Active Window</span>
                                        <span className="text-xs text-white font-bold truncate max-w-[150px]">
                                            {template.active_from || template.active_to ? (
                                                `${template.active_from ? new Date(template.active_from).toLocaleDateString() : 'Now'} - ${template.active_to ? new Date(template.active_to).toLocaleDateString() : '∞'}`
                                            ) : 'Global Access'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-0.5 col-span-2 md:col-span-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Privileges</span>
                                        <div className="flex gap-2 justify-center sm:justify-start">
                                            {template.has_gift && <span className="text-[9px] font-black bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/10 uppercase">Gift</span>}
                                            {template.has_task_gift && <span className="text-[9px] font-black bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/10 uppercase">Task</span>}
                                            {!template.has_gift && !template.has_task_gift && <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Standard</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full sm:w-auto flex flex-col justify-center gap-3 pt-2 sm:pt-0">
                                {generatingForId === template.id ? (
                                    <div className="bg-black/40 p-4 rounded-2xl border border-white/10 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 px-1">Quantity to Mint</span>
                                            <input
                                                type="number"
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm font-black text-center focus:border-primary transition-all"
                                                value={generateCount}
                                                onChange={(e) => setGenerateCount(Number(e.target.value))}
                                                min="1" max="1000"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleGenerateInstances(template.id)} className="flex-1 bg-green-500 text-white font-black uppercase tracking-widest text-[10px] py-2 rounded-xl active:scale-95 transition-all">Go</button>
                                            <button onClick={() => setGeneratingForId(null)} className="flex-1 bg-white/5 text-gray-400 font-black uppercase tracking-widest text-[10px] py-2 rounded-xl">No</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3 min-w-[160px]">
                                        <button
                                            onClick={() => setGeneratingForId(template.id)}
                                            className="w-full bg-white text-black font-black uppercase tracking-widest text-[10px] py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all shadow-lg active:scale-95"
                                        >
                                            <Database size={14} /> Mint Pool
                                        </button>
                                        <div className="flex gap-2">
                                            <button onClick={() => startEdit(template)} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 p-2.5 rounded-xl transition-all flex items-center justify-center group/btn">
                                                <Edit2 size={16} className="group-hover/btn:text-primary transition-colors" />
                                            </button>
                                            <button onClick={() => handleDelete(template.id)} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 p-2.5 rounded-xl transition-all flex items-center justify-center group/btn">
                                                <Trash2 size={16} className="group-hover/btn:text-red-500 transition-colors" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
