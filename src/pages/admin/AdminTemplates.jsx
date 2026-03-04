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
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Card Templates</h1>
                    <p className="text-gray-400 mt-1">Manage designs and generate new drop pools</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleClearAllAvailable}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors font-bold"
                        title="Delete all unassigned instances from the active lootbox pool"
                    >
                        <Trash2 size={18} />
                        Clear Supply
                    </button>
                    <button
                        onClick={() => showForm ? cancelForm() : setShowForm(true)}
                        className="bg-primary hover:bg-blue-600 px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors font-bold"
                    >
                        {showForm ? <X size={20} /> : <Plus size={20} />}
                        {showForm ? 'Cancel' : 'New Template'}
                    </button>
                </div>
            </div>

            {/* Probability Configuration Panel */}
            <div className="bg-surface/50 border border-white/5 p-6 rounded-2xl mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-xl font-bold">Lootbox Drop Rates</h2>
                    <span className="text-xs bg-white/10 px-2 py-1 rounded text-gray-400">Global weights for unboxing</span>
                </div>
                {loadingProbs ? (
                    <div className="text-gray-400 text-sm">Loading drop rates...</div>
                ) : probabilities.length === 0 ? (
                    <div className="text-orange-400 text-sm flex items-start gap-2 bg-orange-500/10 p-3 rounded-lg border border-orange-500/20">
                        <Info size={16} className="mt-0.5 shrink-0" />
                        <span>The `rarity_probabilities` table is missing or empty. Please run the provided SQL migration in your Supabase SQL Editor.</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {probabilities.map(prob => {
                            const totalWeight = probabilities.reduce((sum, p) => sum + p.weight, 0);
                            const percentage = totalWeight > 0 ? Math.round((prob.weight / totalWeight) * 100) : 0;
                            return (
                                <div key={prob.rarity} className="bg-black/40 border border-white/10 rounded-lg p-3 flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <span className={`text-sm font-bold text-rarity-${prob.rarity.toLowerCase()}`}>{prob.rarity}</span>
                                        <span className="text-xs text-gray-400 font-mono">{percentage}%</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">Weight:</span>
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full bg-[#1e1e24] border border-white/20 rounded px-2 py-1 text-white focus:outline-none focus:border-primary text-sm"
                                            defaultValue={prob.weight}
                                            onBlur={(e) => {
                                                if (Number(e.target.value) !== prob.weight) {
                                                    handleUpdateProbability(prob.rarity, e.target.value)
                                                }
                                            }}
                                            title="Higher weights drop more frequently"
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-surface border border-white/5 p-6 rounded-2xl mb-8 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Name</label>
                            <input required type="text" className="w-full bg-[#1e1e24] border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1 flex items-center justify-between">
                                Image URL
                                <span className="text-xs text-primary flex items-center gap-1" title="Google Drive links must have 'Anyone with link' viewer permissions. Regular raw image URLs work best.">
                                    <Info size={12} /> Tips
                                </span>
                            </label>
                            <input required type="url" placeholder="https://..." className="w-full bg-[#1e1e24] border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50" value={formData.image_url} onChange={e => setFormData({ ...formData, image_url: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Rarity</label>
                            <select className="w-full bg-[#1e1e24] border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50" value={formData.rarity} onChange={e => setFormData({ ...formData, rarity: e.target.value })}>
                                <option value="Common" className="bg-[#1e1e24] text-white">Common</option>
                                <option value="Rare" className="bg-[#1e1e24] text-white">Rare</option>
                                <option value="Epic" className="bg-[#1e1e24] text-white">Epic</option>
                                <option value="Legendary" className="bg-[#1e1e24] text-white">Legendary</option>
                                <option value="Mystic" className="bg-[#1e1e24] text-white">Mystic</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Discount %</label>
                            <input required type="number" min="1" max="100" className="w-full bg-[#1e1e24] border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50" value={formData.discount_percentage} onChange={e => setFormData({ ...formData, discount_percentage: Number(e.target.value) })} />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Expiry (Days)</label>
                            <input required type="number" min="1" className="w-full bg-[#1e1e24] border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50" value={formData.expiry_days} onChange={e => setFormData({ ...formData, expiry_days: Number(e.target.value) })} />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Active From (Optional)</label>
                            <input type="date" className="w-full bg-[#1e1e24] border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50" value={formData.active_from} onChange={e => setFormData({ ...formData, active_from: e.target.value || null })} />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Active To (Optional)</label>
                            <input type="date" className="w-full bg-[#1e1e24] border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50" value={formData.active_to} onChange={e => setFormData({ ...formData, active_to: e.target.value || null })} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm text-gray-400 mb-1">Description (Card Ability/Lore)</label>
                            <textarea
                                required
                                rows="3"
                                className="w-full bg-[#1e1e24] border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50 resize-y"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="E.g., When revealed to the store clerk, this card grants you X..."
                            />
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={formData.has_gift} onChange={e => setFormData({ ...formData, has_gift: e.target.checked })} />
                                Has Free Gift
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={formData.has_task_gift} onChange={e => setFormData({ ...formData, has_task_gift: e.target.checked })} />
                                Has Task Gift
                            </label>
                        </div>
                    </div>
                    <button type="submit" className="bg-primary px-6 py-2 rounded-lg font-medium">
                        {editingTemplateId ? 'Update Template' : 'Create Template'}
                    </button>
                </form>
            )}

            {loading ? (
                <div>Loading templates...</div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {templates.map(template => (
                        <div key={template.id} className="bg-surface border border-white/5 rounded-xl p-4 flex flex-col md:flex-row gap-6 items-center">
                            <FallbackImage src={template.image_url} alt={template.name} className="w-24 h-36 rounded shadow-lg" />
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-xl font-bold">{template.name}</h3>
                                    <span className={`text-xs px-2 py-1 rounded font-bold text-rarity-${template.rarity.toLowerCase()} bg-white/5`}>
                                        {template.rarity}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-400 grid grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-4">
                                    <p>Discount: <span className="text-white">{template.discount_percentage}%</span></p>
                                    <p>Expiry: <span className="text-white">{template.expiry_days} Days</span></p>
                                    <p>Active: <span className="text-white">
                                        {template.active_from || template.active_to ? (
                                            `${template.active_from ? new Date(template.active_from).toLocaleDateString() : 'Now'} - ${template.active_to ? new Date(template.active_to).toLocaleDateString() : 'Forever'}`
                                        ) : 'Anytime'}
                                    </span></p>
                                    <p>Gift: <span className="text-white">{template.has_gift ? 'Yes' : 'No'}</span></p>
                                    <p>Task: <span className="text-white">{template.has_task_gift ? 'Yes' : 'No'}</span></p>
                                </div>
                            </div>

                            {generatingForId === template.id ? (
                                <div className="flex flex-col gap-2 min-w-[140px]">
                                    <input
                                        type="number"
                                        className="w-32 bg-[#1e1e24] border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50"
                                        value={generateCount}
                                        onChange={(e) => setGenerateCount(Number(e.target.value))}
                                        min="1" max="1000"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={() => handleGenerateInstances(template.id)} className="bg-green-600 px-3 py-1 rounded text-sm">Confirm</button>
                                        <button onClick={() => setGeneratingForId(null)} className="bg-gray-700 px-3 py-1 rounded text-sm">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2 min-w-[140px]">
                                    <button
                                        onClick={() => setGeneratingForId(template.id)}
                                        className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm transition-colors text-left"
                                    >
                                        Generate pool
                                    </button>
                                    <div className="flex gap-2">
                                        <button onClick={() => startEdit(template)} className="flex-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-1">
                                            <Edit2 size={14} /> Edit
                                        </button>
                                        <button onClick={() => handleDelete(template.id)} className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-1">
                                            <Trash2 size={14} /> Del
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
