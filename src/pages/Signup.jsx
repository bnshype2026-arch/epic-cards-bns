import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export const Signup = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const { signUp } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data, error } = await signUp({ email, password })
            if (error) throw error

            // Supabase anti-enumeration feature returns a user with empty identities if the email is already in use
            if (data?.user?.identities && data.user.identities.length === 0) {
                throw new Error("This email is already registered. Please log in instead.")
            }

            // For MVP, we assume auto-login or redirect to login.
            alert("Signup successful! You can now log in.")
            navigate('/login')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0a0a0c]">
            {/* Ethereal Background Mesh & Grid */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
                <div className="absolute top-0 right-1/4 w-[800px] h-[600px] bg-primary/20 blur-[150px] rounded-full mix-blend-screen animate-pulse pointer-events-none"></div>
                <div className="absolute bottom-1/4 left-1/4 w-[600px] h-[400px] bg-indigo-600/20 blur-[120px] rounded-full mix-blend-screen animate-float pointer-events-none delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_60%)] pointer-events-none"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="bg-black/40 backdrop-blur-2xl p-8 sm:p-10 rounded-[2.5rem] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(255,255,255,0.02)] relative overflow-hidden group">
                    {/* Inner glowing edge effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

                    <div className="text-center mb-10 relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/30 blur-[40px] rounded-full pointer-events-none -z-10"></div>
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-b from-surface to-black border border-white/10 mb-6 shadow-[0_0_30px_rgba(168,85,247,0.3)] relative overflow-hidden">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
                            <svg className="w-8 h-8 text-primary drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black mb-3 tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-primary drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                            Epic Cards <span className="text-sm tracking-widest text-indigo-300 align-text-top ml-2">by BNS</span>
                        </h1>
                        <p className="text-indigo-200/60 mt-2 font-mono text-sm tracking-widest uppercase">
                            Forge Profile
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl text-sm mb-6 flex items-start gap-3 backdrop-blur-sm">
                            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">

                        <div className="text-center mt-8 text-sm text-gray-500">
                            Already have an account?{' '}
                            <Link to="/login" className="text-white hover:text-primary font-semibold transition-colors underline decoration-white/30 hover:decoration-primary underline-offset-4">
                                Sign In
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
