import { useState, useEffect, useRef } from 'react'
import Confetti from 'react-confetti'
import { useWindowSize } from 'react-use'
import { FallbackImage } from './FallbackImage'
import { X } from 'lucide-react'

const RARITY_COLORS = {
    Common: ['#a1a1aa', '#ffffff', '#e4e4e7'],
    Rare: ['#60a5fa', '#93c5fd', '#ffffff'],
    Epic: ['#c084fc', '#e879f9', '#ffffff'],
    Legendary: ['#fbbf24', '#fcd34d', '#ffffff'],
    Mystic: ['#f43f5e', '#fb7185', '#ffffff'],
}

export const RevealAnimation = ({ onComplete, onBreakSeal, onCancel }) => {
    const [stage, setStage] = useState('suspense') // 'suspense', 'fetching', 'reveal'
    const [revealData, setRevealData] = useState(null)
    const { width, height } = useWindowSize()
    const [showConfetti, setShowConfetti] = useState(false)
    const audioCtxRef = useRef(null)
    const activeNodesRef = useRef([])

    const stopAllSounds = () => {
        activeNodesRef.current.forEach(node => {
            try { node.stop() } catch (e) { }
        })
        activeNodesRef.current = []
    }

    const initAudio = () => {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
            audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
        }
        return audioCtxRef.current
    }

    // Sound Generator Helper
    const playSound = (type, rarity = null) => {
        try {
            const audioCtx = initAudio()
            const osc = audioCtx.createOscillator()
            const gainNode = audioCtx.createGain()

            osc.connect(gainNode)
            gainNode.connect(audioCtx.destination)

            const now = audioCtx.currentTime

            if (type === 'suspense') {
                // Angelic / Choir-like breathing pad (Cmaj9 chord)
                const baseFreq = 261.63 // C4
                const chord = [0, 4, 7, 11, 14, -12] // C4, E4, G4, B4, D5, C3

                gainNode.gain.setValueAtTime(0, now)
                gainNode.gain.linearRampToValueAtTime(0.8, now + 2) // Much louder and intense fade in

                chord.forEach((semitone) => {
                    // Create two oscillators per note for a thick "chorus" pad effect
                    for (let j = 0; j < 2; j++) {
                        const noteOsc = audioCtx.createOscillator()
                        const filter = audioCtx.createBiquadFilter()

                        // Mix sine for purity, triangle for some harmonics (like vowels)
                        noteOsc.type = j === 0 ? 'sine' : 'triangle'

                        const freq = baseFreq * Math.pow(2, semitone / 12)
                        noteOsc.frequency.value = freq
                        // Slightly detune the second oscillator
                        noteOsc.detune.value = j === 0 ? 0 : (Math.random() > 0.5 ? 7 : -7)

                        // Lowpass filter to muffle it and make it sound more distant/angelic
                        filter.type = 'lowpass'
                        filter.frequency.setValueAtTime(800 + (Math.random() * 400), now)

                        // Individual gain to roughly balance the chord (boosted for high volume)
                        const oscGain = audioCtx.createGain()
                        oscGain.gain.value = j === 0 ? 0.15 : 0.08

                        noteOsc.connect(filter)
                        filter.connect(oscGain)
                        oscGain.connect(gainNode)

                        noteOsc.start(now)
                        activeNodesRef.current.push(noteOsc)
                    }
                })
                return // Do not stop() automatically for loop
            } else if (type === 'reveal') {
                // Play angelic burst chords based on rarity
                let baseFreq = 261.63 // C4
                let chord = [0]
                let duration = 1.0

                switch (rarity) {
                    case 'Common':
                        baseFreq = 329.63; // E4
                        chord = [0, 4, 7]; // E Major Triad
                        duration = 1.5;
                        break;
                    case 'Rare':
                        baseFreq = 392.00; // G4
                        chord = [0, 4, 7, 14]; // G Major add9
                        duration = 2.0;
                        break;
                    case 'Epic':
                        baseFreq = 440.00; // A4
                        chord = [0, 3, 7, 10, 14]; // A minor 9 
                        duration = 3.0;
                        break;
                    case 'Legendary':
                        baseFreq = 523.25; // C5
                        chord = [0, 4, 7, 11, 14, 24]; // Cmaj9 + octave
                        duration = 4.0;
                        break;
                    case 'Mystic':
                        baseFreq = 587.33; // D5
                        chord = [0, 4, 7, 11, 14, 18, 24]; // Dmaj11 #11 ethereal
                        duration = 5.0;
                        break;
                    default:
                        chord = [0, 4, 7];
                        duration = 1.0;
                }

                gainNode.gain.setValueAtTime(0, now)
                gainNode.gain.linearRampToValueAtTime(0.8, now + 0.1) // Fast fade in for the burst (much louder)
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration) // Long fading tail

                chord.forEach((semitone) => {
                    for (let j = 0; j < 2; j++) {
                        const noteOsc = audioCtx.createOscillator()
                        const filter = audioCtx.createBiquadFilter()

                        // Mix sine and triangle for celestial tone
                        noteOsc.type = j === 0 ? 'sine' : 'triangle'

                        const freq = baseFreq * Math.pow(2, semitone / 12)
                        noteOsc.frequency.value = freq
                        noteOsc.detune.value = j === 0 ? 0 : (Math.random() > 0.5 ? 5 : -5)

                        // Brighter filter for the reveal explosion
                        filter.type = 'lowpass'
                        filter.frequency.setValueAtTime(1200 + (Math.random() * 800), now)

                        // Much thicker volume for the burst
                        const oscGain = audioCtx.createGain()
                        oscGain.gain.value = j === 0 ? 0.15 : 0.08

                        noteOsc.connect(filter)
                        filter.connect(oscGain)
                        oscGain.connect(gainNode)

                        noteOsc.start(now)
                        noteOsc.stop(now + duration)
                    }
                })
            } else if (type === 'claim') {
                // Sharp click (louder)
                osc.type = 'square'
                osc.frequency.setValueAtTime(800, now)
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.1)
                gainNode.gain.setValueAtTime(0.3, now)
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1)
                osc.start(now)
                osc.stop(now + 0.1)
            }
        } catch (e) {
            console.warn('Audio play failed:', e)
        }
    }

    const handleBreakSealClick = async () => {
        try {
            if (audioCtxRef.current?.state === 'suspended') {
                await audioCtxRef.current.resume()
            }
            setStage('fetching')
            const data = await onBreakSeal()

            stopAllSounds() // Kill the suspense loop

            setRevealData(data)
            setStage('reveal')
            playSound('reveal', data.template.rarity)

            if (['Epic', 'Legendary', 'Mystic'].includes(data.template.rarity)) {
                setShowConfetti(true)
            }
        } catch (err) {
            handleCancel()
        }
    }

    const handleCancel = () => {
        stopAllSounds()
        onCancel()
    }

    // Effect to handle cleanup
    useEffect(() => {
        if (stage === 'suspense') {
            playSound('suspense')
        }
        return () => stopAllSounds()
    }, [stage])

    // Calculate effective lifespan of the card (accounting for active_to clamping from the DB)
    const getEffectiveExpiryDays = () => {
        if (!revealData?.instance?.opened_at || !revealData?.instance?.expiry_date) {
            return revealData?.template?.expiry_days || 0
        }
        const diffMs = new Date(revealData.instance.expiry_date) - new Date(revealData.instance.opened_at)
        return Math.round(diffMs / (1000 * 60 * 60 * 24))
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm reveal-overlay overflow-y-auto">

            {showConfetti && revealData && (
                <Confetti
                    width={width}
                    height={height}
                    colors={RARITY_COLORS[revealData.template.rarity]}
                    recycle={true}
                    numberOfPieces={revealData.template.rarity === 'Mystic' ? 500 : 250}
                    gravity={revealData.template.rarity === 'Mystic' ? 0.05 : 0.1}
                    style={{ zIndex: 101 }}
                />
            )}

            {stage === 'suspense' || stage === 'fetching' ? (
                <div className="flex flex-col items-center gap-8 relative z-[102] animate-fade-in-up py-10 my-auto">
                    <button
                        onClick={handleCancel}
                        disabled={stage === 'fetching'}
                        className="absolute -top-16 right-0 p-2 text-white/50 hover:text-white transition-colors disabled:opacity-0"
                        title="Cancel Opening"
                    >
                        <X size={32} />
                    </button>

                    <div className={`w-64 h-96 rounded-3xl p-1 relative overflow-hidden flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.5)] backdrop-blur-md ${stage === 'fetching' ? 'animate-pulse' : 'shake-build-up'}`}>
                        {/* Animated Gradient Border effect - Sized larger and centered to spin correctly */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_0deg,#ffffff_90deg,transparent_180deg,#ffffff_270deg,transparent_360deg)] animate-spin-slow opacity-80 z-0"></div>

                        {/* Inner bright card */}
                        <div className="absolute inset-[4px] bg-gradient-to-br from-white via-gray-100 to-gray-300 rounded-[22px] overflow-hidden flex items-center justify-center z-10 box-inner-glow shadow-inner border border-white/50">
                            {/* Inner ambient flare */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-white/60 blur-[40px] rounded-full animate-pulse"></div>

                            {/* Grid pattern background (darker for contrast on white) */}
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0000000a_1px,transparent_1px),linear-gradient(to_bottom,#0000000a_1px,transparent_1px)] bg-[size:1rem_1rem]"></div>

                            <span className="text-9xl animate-bounce font-black text-transparent bg-clip-text bg-gradient-to-b from-gray-400 to-gray-800 drop-shadow-[0_5px_15px_rgba(0,0,0,0.2)] z-20">?</span>
                            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-gray-400/20 to-transparent mix-blend-multiply"></div>
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-white animate-pulse tracking-[0.3em] uppercase font-black mb-6">
                            {stage === 'fetching' ? 'Decrypting...' : 'Secure Box'}
                        </p>
                        <button
                            onClick={handleBreakSealClick}
                            disabled={stage === 'fetching'}
                            className="px-10 py-5 bg-white text-black rounded-2xl font-black uppercase tracking-[0.2em] transition-all transform hover:scale-105 hover:-translate-y-1 shadow-[0_10px_40px_rgba(255,255,255,0.3)] hover:shadow-[0_15px_50px_rgba(255,255,255,0.5)] flex items-center gap-3 disabled:opacity-50 disabled:cursor-wait"
                        >
                            <span>Break Seal</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className={`flex flex-col items-center gap-8 relative z-[102] py-10 my-auto w-full
                        ${['Common', 'Rare'].includes(revealData.template.rarity) ? 'animate-bounce-in' : 'animate-float'} 
                        glow-${revealData.template.rarity.toLowerCase()}`}
                >

                    {/* Background rays for Mystic/Legendary */}
                    {['Legendary', 'Mystic'].includes(revealData.template.rarity) && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] pointer-events-none -z-10 animate-spin-slow opacity-30"
                            style={{
                                background: `conic-gradient(from 0deg, transparent 0deg, ${RARITY_COLORS[revealData.template.rarity][0]} 20deg, transparent 40deg)`,
                                maskImage: 'radial-gradient(circle, black 20%, transparent 60%)'
                            }}
                        />
                    )}

                    {/* Fun burst particle ring for Common/Rare */}
                    {['Common', 'Rare'].includes(revealData.template.rarity) && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] aspect-square border-dashed rounded-full animate-ping-once pointer-events-none -z-10"
                            style={{ borderColor: RARITY_COLORS[revealData.template.rarity][0] }}
                        />
                    )}

                    <div className={`w-[90vw] max-w-[22rem] h-auto min-h-[36rem] max-h-[85vh] rounded-2xl border-4 overflow-hidden relative flex flex-col shadow-2xl card-shine-${revealData.template.rarity.toLowerCase()}
                ${revealData.template.rarity === 'Common' ? 'border-rarity-common bg-surface' :
                            revealData.template.rarity === 'Rare' ? 'border-rarity-rare bg-surface' :
                                revealData.template.rarity === 'Epic' ? 'border-rarity-epic bg-surface' :
                                    revealData.template.rarity === 'Legendary' ? 'border-rarity-legendary bg-yellow-900/20' :
                                        'border-rarity-mystic bg-rose-900/20 shadow-[0_0_50px_rgba(244,63,94,0.3)]'}
            `}>
                        <div className="aspect-square relative w-full flex-none bg-black border-b-4 border-black/40">
                            <FallbackImage
                                src={revealData.template.image_url}
                                alt={revealData.template.name}
                                className="absolute inset-0 w-full h-full opacity-90"
                                imgClassName="object-contain object-center p-2"
                            />
                            {/* Rarity & Name Header inside image */}
                            <div className="absolute top-0 w-full p-3 bg-gradient-to-b from-black/90 to-transparent flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight">{revealData.template.name}</h2>
                                    <span className={`text-[10px] sm:text-xs font-black tracking-widest uppercase mb-1 drop-shadow-md text-rarity-${revealData.template.rarity.toLowerCase()}`}>
                                        {revealData.template.rarity}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* TCG Style Body */}
                        <div className="p-3 sm:p-4 flex-1 flex flex-col justify-start bg-gradient-to-b from-surface to-[#15151a] overflow-hidden">

                            {/* Stats Strip */}
                            <div className="flex bg-black/40 rounded-lg border border-white/5 mb-1.5 overflow-hidden shrink-0">
                                <div className="flex-1 p-1 border-r border-white/5 flex flex-col items-center justify-center">
                                    <span className="text-[8px] sm:text-[9px] text-primary uppercase font-bold tracking-widest flex items-center gap-1">
                                        ⚔️ Power
                                    </span>
                                    <span className="text-sm sm:text-base font-black text-white drop-shadow-md">
                                        {revealData.template.discount_percentage}%
                                    </span>
                                </div>
                                <div className="flex-1 p-1 flex flex-col items-center justify-center">
                                    <span className="text-[8px] sm:text-[9px] text-red-400 uppercase font-bold tracking-widest flex items-center gap-1">
                                        ⌛ Weakness
                                    </span>
                                    <span className="font-bold text-gray-200 text-[10px] sm:text-xs">
                                        {getEffectiveExpiryDays()} Days
                                    </span>
                                </div>
                            </div>

                            {/* Active Period Constraints */}
                            {(revealData.template.active_from || revealData.template.active_to) && (
                                <div className="bg-white/5 border border-white/10 rounded-lg p-1 px-2 mb-1.5 shadow-inner text-center flex justify-center items-center shrink-0">
                                    <span className="text-[8px] sm:text-[9px] text-purple-400 uppercase font-bold tracking-wider mr-1.5">Valid:</span>
                                    <span className="text-[9px] sm:text-[10px] font-mono text-gray-300">
                                        {revealData.template.active_from ? new Date(revealData.template.active_from).toLocaleDateString() : 'Now'} - {revealData.template.active_to ? new Date(revealData.template.active_to).toLocaleDateString() : 'Forever'}
                                    </span>
                                </div>
                            )}

                            {/* Description Block */}
                            <div className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 shadow-inner relative overflow-y-auto mb-1 min-h-[3rem]">
                                <div className="absolute top-0 left-0 bg-surface px-1.5 py-0.5 rounded-br text-[8px] text-gray-400 font-bold uppercase tracking-wider">Ability</div>
                                <p className="text-gray-300 text-[10px] sm:text-[11px] leading-snug italic font-serif mt-4 text-center">
                                    {revealData.template.description || "A mysterious artifact of unknown power. Present this to the nearest vendor to uncover its secrets."}
                                </p>
                            </div>

                            {/* S/N Footer */}
                            <div className="mt-1 flex justify-end shrink-0">
                                <div className="text-white font-mono text-[10px] sm:text-[11px] tracking-widest bg-black/60 px-2 py-1 rounded-sm border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                                    S/N: {revealData.instance.serial_number}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="text-center animate-fade-in-up">
                        <h1 className={`text-5xl font-black mb-2 uppercase tracking-wider drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] text-rarity-${revealData.template.rarity.toLowerCase()}`}>
                            {revealData.template.rarity} Drop!
                        </h1>
                        <button
                            onClick={() => {
                                playSound('claim')
                                onComplete()
                            }}
                            className="mt-6 px-10 py-5 bg-white text-black border border-white/40 rounded-2xl font-black tracking-[0.2em] uppercase transition-all duration-300 hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.6)] hover:shadow-[0_0_40px_rgba(255,255,255,1)] flex items-center justify-center animate-pulse mx-auto"
                        >
                            Claim Card
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
