import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { RevealAnimation } from '../components/RevealAnimation'
import { PackageOpen, Sparkles, ChevronRight } from 'lucide-react'

export const UserDashboard = () => {
    const { userProfile } = useAuth()
    const [opening, setOpening] = useState(false)
    const [error, setError] = useState(null)

    const handleStartOpen = () => {
        if (userProfile?.lootbox_balance <= 0) return
        setOpening(true)
        setError(null)
    }

    const handleBreakSeal = async () => {
        // 1. Call RPC to safely open lootbox server-side
        const { data: instanceId, error: rpcError } = await supabase.rpc('open_lootbox', {
            p_user_id: userProfile.id
        })
        if (rpcError) throw rpcError

        // 2. Fetch the opened instance and its template data for the animation
        const { data: instanceData, error: fetchError } = await supabase
            .from('card_instances')
            .select('*, card_templates(*)')
            .eq('id', instanceId)
            .single()

        if (fetchError) throw fetchError

        return {
            instance: instanceData,
            template: instanceData.card_templates
        }
    }

    const handleRevealComplete = () => {
        setOpening(false)
        // Force a profile refresh to sync balance
        supabase.auth.refreshSession()
    }

    const handleCancelOpen = () => {
        setOpening(false)
    }

    return (
        <div className="flex flex-col items-center min-h-[80vh] py-12 px-4 relative w-full overflow-x-hidden">

            {/* Ambient Background Elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 blur-[100px] rounded-full pointer-events-none -z-10"></div>
            <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>

            {opening && (
                <RevealAnimation
                    onBreakSeal={handleBreakSeal}
                    onComplete={handleRevealComplete}
                    onCancel={handleCancelOpen}
                />
            )}

            <div className="text-center mb-12 animate-fade-in-up">
                <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight drop-shadow-lg">
                    Level Up Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">Loyalty Rewards</span>
                </h1>
                <p className="text-gray-300 text-lg max-w-xl mx-auto font-medium">
                    Turn your purchases into Epic Cards! Earn locked boxes, reveal legendary loot, and claim exclusive VIP rewards.
                </p>
            </div>

            <div className="text-center bg-surface/80 backdrop-blur-xl border border-white/10 p-8 md:p-14 rounded-[3rem] max-w-lg w-full relative overflow-hidden group shadow-2xl transition-all duration-500 hover:shadow-primary/20 hover:border-white/20">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

                <div className="relative z-10">
                    <div className="relative inline-block mb-8">
                        {/* Glow behind icon */}
                        <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full"></div>
                        <PackageOpen className="w-28 h-28 mx-auto text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-float relative z-10 transition-transform group-hover:scale-110 duration-500" />
                        <Sparkles className="absolute -top-4 -right-4 w-10 h-10 text-yellow-400 animate-pulse" />
                    </div>

                    <h2 className="text-2xl font-bold mb-2 text-gray-200 tracking-wide uppercase">Available Boxes</h2>

                    <div className="flex justify-center items-center gap-4 mb-10">
                        <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1"></div>
                        <p className="text-7xl font-black bg-gradient-to-b from-white via-gray-200 to-gray-500 bg-clip-text text-transparent drop-shadow-xl">
                            {userProfile?.lootbox_balance || 0}
                        </p>
                        <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent flex-1"></div>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl text-sm font-medium backdrop-blur-sm animate-shake">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleStartOpen}
                        disabled={opening || (userProfile?.lootbox_balance || 0) <= 0}
                        className="relative w-full group/btn overflow-hidden disabled:bg-surface disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl p-[2px] transition-transform active:scale-95"
                    >
                        {/* Animated gradient border */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-primary background-animate opacity-100"></div>

                        {/* Inner button surface */}
                        <div className="relative bg-black/80 backdrop-blur-sm rounded-[14px] px-8 py-5 flex items-center justify-center gap-3 transition-colors group-hover/btn:bg-black/40">
                            <span className="text-white font-black text-xl uppercase tracking-[0.2em]">
                                Open Now
                            </span>
                            <ChevronRight className="w-6 h-6 text-primary group-hover/btn:translate-x-1 transition-transform" />
                        </div>
                    </button>

                    {userProfile?.lootbox_balance <= 0 && (
                        <div className="mt-8 p-6 bg-primary/10 border border-primary/20 rounded-2xl">
                            <h3 className="text-primary font-bold mb-2">Want more Epic Cards?</h3>
                            <p className="text-sm text-gray-300 mb-4">
                                Earn a sealed box with every qualifying purchase to expand your collection.
                            </p>
                            <button onClick={() => window.open('https://your-store-link.com', '_blank')} className="text-xs font-bold uppercase tracking-widest text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors">
                                Shop Now
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .background-animate {
                    background-size: 200% 200%;
                    animation: gradient-x 3s ease infinite;
                }
                @keyframes gradient-x {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-shake {
                    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
            `}</style>
        </div>
    )
}
