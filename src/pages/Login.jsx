import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, KeyRound, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export const Login = () => {
    // Login States
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // Forgot Password States
    const [isForgotPassword, setIsForgotPassword] = useState(false)
    const [otpSent, setOtpSent] = useState(false)
    const [otp, setOtp] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [forgotLoading, setForgotLoading] = useState(false)
    const [forgotError, setForgotError] = useState(null)
    const [forgotSuccess, setForgotSuccess] = useState(null)

    const { signIn } = useAuth()
    const navigate = useNavigate()

    const handleLoginSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { error } = await signIn({ email, password })
            if (error) throw error
            navigate('/')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSendOTP = async (e) => {
        e.preventDefault()
        if (!email) {
            setForgotError("Please enter your email address first.")
            return
        }
        setForgotLoading(true)
        setForgotError(null)
        setForgotSuccess(null)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email)
            if (error) throw error
            setOtpSent(true)
            setForgotSuccess("OTP sent! Please check your email.")
            setForgotError(null)
        } catch (err) {
            setForgotError(err.message)
        } finally {
            setForgotLoading(false)
        }
    }

    const handleResetPassword = async (e) => {
        e.preventDefault()
        if (!otp || !newPassword) {
            setForgotError("Please fill in both the OTP and your new password.")
            return
        }
        setForgotLoading(true)
        setForgotError(null)

        try {
            // 1. Verify the OTP
            const { error: verifyError } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'recovery'
            })
            if (verifyError) throw verifyError

            // 2. If verified, the user is now authenticated. Update their password.
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            })
            if (updateError) throw updateError

            setForgotSuccess("Password reset successfully! Redirecting...")
            setTimeout(() => {
                navigate('/')
            }, 1500)

        } catch (err) {
            setForgotError(err.message)
        } finally {
            setForgotLoading(false)
        }
    }

    const resetForgotState = () => {
        setIsForgotPassword(false)
        setOtpSent(false)
        setOtp('')
        setNewPassword('')
        setForgotError(null)
        setForgotSuccess(null)
        setError(null)
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
                            <KeyRound className="w-8 h-8 text-primary drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black mb-3 tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-primary drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                            Epic Cards <span className="text-sm tracking-widest text-indigo-300 align-text-top ml-2">by BNS</span>
                        </h1>
                        <p className="text-indigo-200/60 mt-2 font-mono text-sm tracking-widest uppercase">
                            {isForgotPassword ? (otpSent ? 'Sanctuary Reset' : 'Locate Vault') : 'Enter the Sanctuary'}
                        </p>
                    </div>

                    {error && !isForgotPassword && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl text-sm mb-6 flex items-start gap-3 backdrop-blur-sm">
                            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    {forgotError && isForgotPassword && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl text-sm mb-6 flex items-start gap-3 backdrop-blur-sm">
                            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>{forgotError}</span>
                        </div>
                    )}

                    {forgotSuccess && isForgotPassword && (
                        <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-4 rounded-xl text-sm mb-6 flex items-start gap-3 backdrop-blur-sm">
                            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span>{forgotSuccess}</span>
                        </div>
                    )}

                    {!isForgotPassword ? (
                        /* ----- NORMAL LOGIN FORM ----- */
                        <form onSubmit={handleLoginSubmit} className="space-y-5">
                            <div className="group">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 group-focus-within:text-primary transition-colors">Email Address</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        required
                                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-10 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                            <div className="group">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider group-focus-within:text-primary transition-colors">Password</label>
                                    <button
                                        type="button"
                                        onClick={() => setIsForgotPassword(true)}
                                        className="text-xs font-bold text-indigo-400 hover:text-white transition-colors tracking-widest uppercase hover:underline"
                                    >
                                        Forgot Key?
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-10 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                        tabIndex="-1"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full relative group overflow-hidden bg-primary text-white font-bold py-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-8 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:-translate-y-0.5"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                                <span className="relative flex items-center justify-center gap-2">
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Authenticating...
                                        </>
                                    ) : 'Sign In'}
                                </span>
                            </button>

                            <div className="text-center mt-8 text-sm text-gray-500">
                                Don't have an account?{' '}
                                <Link to="/signup" className="text-white hover:text-primary font-semibold transition-colors underline decoration-white/30 hover:decoration-primary underline-offset-4">
                                    Create one now
                                </Link>
                            </div>
                        </form>
                    ) : (
                        /* ----- FORGOT PASSWORD FORM ----- */
                        <div className="space-y-5">
                            {!otpSent ? (
                                <form onSubmit={handleSendOTP} className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2 ml-1">Email</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-transform group-focus-within:scale-110">
                                                <Mail className="h-5 w-5 text-indigo-400 group-focus-within:text-primary transition-colors" />
                                            </div>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="block w-full pl-12 pr-4 py-4 bg-black/50 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all font-mono shadow-inner"
                                                placeholder="master@vault.com"
                                                required
                                            />
                                            {/* Glow effect on focus */}
                                            <div className="absolute inset-0 -z-10 bg-primary/20 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                                        </div>
                                        <p className="text-[11px] text-gray-500 mt-2">We will send a one-time passcode to this email.</p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={forgotLoading}
                                        className="w-full relative group overflow-hidden bg-primary text-white font-bold py-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:-translate-y-0.5"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                                        <span className="relative flex items-center justify-center gap-2">
                                            {forgotLoading ? 'Sending...' : 'Send Recovery Code'}
                                        </span>
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleResetPassword} className="space-y-5">
                                    <div className="group">
                                        <label className="block text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2 ml-1">OTP Verification Code</label>
                                        <input
                                            type="text"
                                            required
                                            className="block w-full px-4 py-4 bg-black/50 border border-white/10 rounded-2xl text-white text-center tracking-[0.5em] text-xl placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all font-mono shadow-inner uppercase"
                                            placeholder="000000"
                                            maxLength={6}
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                        />
                                    </div>

                                    <div className="animate-fade-in">
                                        <label className="block text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2 ml-1">New Password</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-transform group-focus-within:scale-110">
                                                <Lock className="h-5 w-5 text-indigo-400 group-focus-within:text-primary transition-colors" />
                                            </div>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="block w-full pl-12 pr-12 py-4 bg-black/50 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all font-mono shadow-inner"
                                                placeholder="Create new password"
                                                required minLength={6}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-indigo-400 hover:text-white transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                            <div className="absolute inset-0 -z-10 bg-primary/20 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={forgotLoading}
                                        className="w-full relative group overflow-hidden bg-green-500 text-white font-bold py-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] hover:-translate-y-0.5"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                                        <span className="relative flex items-center justify-center gap-2">
                                            {forgotLoading ? 'Verifying...' : 'Set New Password'}
                                        </span>
                                    </button>
                                </form>
                            )}

                            <button
                                type="button"
                                onClick={resetForgotState}
                                className="w-full mt-4 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-white transition-colors"
                            >
                                <ArrowLeft size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
