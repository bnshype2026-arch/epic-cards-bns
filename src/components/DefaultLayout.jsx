import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, Home, Package, Settings, Users, Activity, History, BarChart2, Database, Sparkles, LayoutDashboard, CheckSquare } from 'lucide-react'

export const DefaultLayout = ({ children }) => {
    const { signOut, userProfile, isAdmin, isStaff } = useAuth()
    const location = useLocation()

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-background text-white pb-20 md:pb-0">

            {/* Application Header (Mobile Only for Admin, Mobile+Desktop for User Top Bar) */}
            <div className={`md:hidden p-4 border-b border-white/10 flex items-center justify-between bg-surface/90 backdrop-blur-md sticky top-0 z-40`}>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                    Epic Cards
                </h1>
                <div className="flex items-center gap-3">
                    {!isStaff && (
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                            <Package size={14} className="text-primary" />
                            <span className="text-sm font-bold">{userProfile?.lootbox_balance || 0}</span>
                        </div>
                    )}
                    <button onClick={signOut} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><LogOut size={18} /></button>
                </div>
            </div>

            {/* Sidebar (Desktop Only) */}
            <nav className="w-full md:w-64 bg-surface border-r border-white/10 hidden md:flex flex-col">
                <div className="p-4 border-b border-white/10">
                    <div className="flex items-center">
                        <span className="text-xl font-black tracking-widest uppercase text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                            Epic Cards by BNS
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{isAdmin ? 'Admin Panel' : isStaff ? 'Store Portal' : 'Player Dashboard'}</p>
                </div>

                <div className="flex-1 py-4 flex flex-col gap-2 px-3 overflow-y-auto">
                    {isStaff ? (
                        <>
                            {isAdmin && <NavLink to="/admin" currentPath={location.pathname} icon={<LayoutDashboard />}>Dashboard</NavLink>}
                            {isAdmin && <NavLink to="/admin/templates" currentPath={location.pathname} icon={<Package />}>Templates</NavLink>}

                            <NavLink to="/admin/grant" currentPath={location.pathname} icon={<Users />}>Grant Lootboxes</NavLink>
                            <NavLink to="/admin/activate" currentPath={location.pathname} icon={<Settings />}>Activation Panel</NavLink>
                            <NavLink to="/admin/activated" currentPath={location.pathname} icon={<CheckSquare />}>Activated Cards</NavLink>

                            {isAdmin && <NavLink to="/admin/library" currentPath={location.pathname} icon={<Database />}>Master Library</NavLink>}
                            {isAdmin && <NavLink to="/admin/analytics" currentPath={location.pathname} icon={<BarChart2 />}>Historical Analytics</NavLink>}
                            {isAdmin && <NavLink to="/admin/live-drops" currentPath={location.pathname} icon={<Sparkles />}>Live Drops</NavLink>}

                            <NavLink to="/admin/logs" currentPath={location.pathname} icon={<History />}>Grant Logs</NavLink>
                        </>
                    ) : (
                        <>
                            <NavLink to="/" currentPath={location.pathname} icon={<Home />}>Dashboard</NavLink>
                            <NavLink to="/collection" currentPath={location.pathname} icon={<Package />}>My Collection</NavLink>
                            <NavLink to="/instructions" currentPath={location.pathname} icon={<Activity />}>How to Play</NavLink>
                            <NavLink to="/logs" currentPath={location.pathname} icon={<History />}>Reward History</NavLink>
                        </>
                    )}
                </div>

                <div className="p-4 border-t border-white/10 flex items-center justify-between mt-auto">
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium truncate" title={userProfile?.email}>{userProfile?.email}</span>
                        {!isStaff && (
                            <span className="text-xs text-primary font-semibold">
                                Lootboxes: {userProfile?.lootbox_balance || 0}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={signOut}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Sign out"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </nav>

            {/* Mobile Bottom Navigation (User Only) */}
            {!isStaff && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-xl border-t border-white/10 z-50 px-6 py-3 flex justify-between items-center pb-safe">
                    <BottomNavLink to="/" currentPath={location.pathname} icon={<Home />} label="Play" />
                    <BottomNavLink to="/collection" currentPath={location.pathname} icon={<Package />} label="Collection" />
                    <BottomNavLink to="/instructions" currentPath={location.pathname} icon={<Activity />} label="Guide" />
                    <BottomNavLink to="/logs" currentPath={location.pathname} icon={<History />} label="Logs" />
                </div>
            )}

            {/* Mobile Admin Navigation */}
            {isStaff && (
                <div className="md:hidden flex overflow-x-auto gap-2 p-3 bg-surface/50 border-b border-white/10 hide-scrollbar shrink-0">
                    {isAdmin && <NavLink to="/admin" currentPath={location.pathname}>Dashboard</NavLink>}
                    {isAdmin && <NavLink to="/admin/templates" currentPath={location.pathname}>Templates</NavLink>}
                    <NavLink to="/admin/grant" currentPath={location.pathname}>Grant</NavLink>
                    <NavLink to="/admin/activate" currentPath={location.pathname}>Activate</NavLink>
                    <NavLink to="/admin/activated" currentPath={location.pathname}>Ledger</NavLink>
                    {isAdmin && <NavLink to="/admin/library" currentPath={location.pathname}>Library</NavLink>}
                    {isAdmin && <NavLink to="/admin/analytics" currentPath={location.pathname}>Analytics</NavLink>}
                    {isAdmin && <NavLink to="/admin/live-drops" currentPath={location.pathname}>Drops</NavLink>}
                    <NavLink to="/admin/logs" currentPath={location.pathname}>Grants</NavLink>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative h-[calc(100vh-60px)] md:h-screen">
                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}

const NavLink = ({ to, children, icon, currentPath }) => {
    // Exact match for root paths, exact match or startWith plus trailing slash for subpaths
    const isActive = to === '/' || to === '/admin'
        ? currentPath === to
        : currentPath === to || currentPath?.startsWith(`${to}/`)

    return (
        <Link
            to={to}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all whitespace-nowrap border ${isActive
                ? 'bg-primary/10 text-primary border-primary/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                : 'hover:bg-white/5 text-gray-300 hover:text-white border-transparent'
                }`}
        >
            {icon && <span className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`}>{icon}</span>}
            <span className="font-medium">{children}</span>
        </Link>
    )
}

const BottomNavLink = ({ to, icon, label, currentPath }) => {
    const isActive = to === '/'
        ? currentPath === to
        : currentPath === to || currentPath?.startsWith(`${to}/`)

    return (
        <Link
            to={to}
            className={`flex flex-col items-center justify-center gap-1 transition-all flex-1 ${isActive ? 'text-primary' : 'text-gray-400 hover:text-white'
                }`}
        >
            <span className={`w-6 h-6 ${isActive ? 'drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]' : ''}`}>{icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </Link>
    )
}
