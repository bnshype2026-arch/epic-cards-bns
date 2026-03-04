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
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>

            <div className="w-full max-w-md bg-surface/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10 transition-transform hover:scale-[1.01] duration-500">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-white/10 mb-6 shadow-inner">
                        <KeyRound className="w-8 h-8 text-white drop-shadow-md" />
                    </div>
                    <h1 className="text-4xl font-black bg-gradient-to-r from-primary via-purple-400 to-white bg-clip-text text-transparent drop-shadow-sm">
                        Epic Cards
                    </h1>
                    <p className="text-gray-400 mt-3 font-medium tracking-wide">
                        {isForgotPassword ? (otpSent ? 'Reset Password' : 'Find Your Account') : 'Enter the Vault'}
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
                                    className="text-xs text-primary hover:text-purple-400 transition-colors font-semibold"
                                >
                                    Forgot Password?
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
                                <div className="group">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 group-focus-within:text-primary transition-colors">Account Email</label>
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
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 group-focus-within:text-primary transition-colors">OTP Verification Code</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300 font-mono tracking-widest text-center text-xl"
                                        placeholder="00000000"
                                        maxLength={8}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                    />
                                </div>

                                <div className="group">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 group-focus-within:text-primary transition-colors">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            minLength={6}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-10 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300"
                                            placeholder="••••••••"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
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
                            Back to Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
