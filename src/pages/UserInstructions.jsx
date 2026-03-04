import { BookOpen, MapPin, QrCode, Sparkles } from 'lucide-react'

export const UserInstructions = () => {
    return (
        <div className="flex flex-col min-h-[80vh] py-8 px-4 relative max-w-4xl mx-auto">
            {/* Ambient Background Elements */}
            <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-primary/10 blur-[100px] rounded-full pointer-events-none -z-10"></div>
            <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[300px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>

            <div className="mb-12 border-b border-white/5 pb-6 text-center animate-fade-in-up">
                <BookOpen className="w-16 h-16 mx-auto text-primary mb-6" />
                <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight drop-shadow-lg">
                    How to <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">Play</span>
                </h1>
                <p className="text-gray-400 text-lg max-w-xl mx-auto">
                    Master your digital collection and unleash their powers in the real world.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">

                {/* Step 1 */}
                <div className="bg-surface/50 backdrop-blur-md border border-white/10 rounded-3xl p-8 hover:bg-surface transition-colors animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center text-primary font-black text-2xl mb-6 border border-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                        1
                    </div>
                    <h3 className="text-2xl font-bold mb-3">Collect Cards</h3>
                    <p className="text-gray-400 leading-relaxed mb-6">
                        Open secure boxes in your Vault to discover digital cards. Every card features unique <strong>Power</strong> (Discounts) and an <strong>Ability</strong> based on its rarity level.
                    </p>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-400/10 px-3 py-2 rounded-lg inline-flex">
                        <Sparkles size={14} /> Mythic cards hold legendary power
                    </div>
                </div>

                {/* Step 2 */}
                <div className="bg-surface/50 backdrop-blur-md border border-white/10 rounded-3xl p-8 hover:bg-surface transition-colors animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center text-primary font-black text-2xl mb-6 border border-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                        2
                    </div>
                    <h3 className="text-2xl font-bold mb-3">Visit a Store</h3>
                    <p className="text-gray-400 leading-relaxed mb-6">
                        Cards are meant to be played IRL. Bring your digital collection to any of our official physical locations before the card's <strong>Weakness</strong> (Expiry Date) runs out.
                    </p>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-400/10 px-3 py-2 rounded-lg inline-flex">
                        <MapPin size={14} /> Find nearest location
                    </div>
                </div>

                {/* Step 3 */}
                <div className="bg-surface/50 backdrop-blur-md border border-white/10 rounded-3xl p-8 hover:bg-surface transition-colors animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                    <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center text-primary font-black text-2xl mb-6 border border-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                        3
                    </div>
                    <h3 className="text-2xl font-bold mb-3">Unleash Power</h3>
                    <p className="text-gray-400 leading-relaxed mb-6">
                        Open your Collection and show the store staff the specific card you wish to play. The staff will verify your <strong>S/N (Serial Number)</strong> to activate the card's abilities.
                    </p>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-green-400 bg-green-400/10 px-3 py-2 rounded-lg inline-flex">
                        <QrCode size={14} /> Staff verification required
                    </div>
                </div>

            </div>

            {/* Note Section */}
            <div className="mt-16 bg-gradient-to-r from-primary/10 to-purple-500/10 border border-white/10 rounded-2xl p-6 md:p-8 text-center animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <h4 className="font-bold text-xl mb-2">Important Rulebook</h4>
                <p className="text-gray-400 max-w-2xl mx-auto">
                    Once a card's ability is activated by a staff member, it becomes permanently bound (ACTIVATED) and cannot be used again. Expired cards lose all power and become grayed out in your collection. Strategy is key!
                </p>
            </div>
        </div>
    )
}
