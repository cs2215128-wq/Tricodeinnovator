import { motion } from 'framer-motion';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Database, MessageSquare, Search, GraduationCap,
  Timer, Trophy, Calendar, LogOut, ChevronLeft, ChevronRight,
  Zap, TreePine, Flame, Star
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: '#6366f1' },
  { to: '/matrix', icon: Database, label: 'Research Matrix', color: '#8b5cf6' },
  { to: '/chat', icon: MessageSquare, label: 'Evidence Chat', color: '#06b6d4' },
  { to: '/gaps', icon: Search, label: 'Gap Discovery', color: '#10b981' },
  { to: '/courses', icon: GraduationCap, label: 'Courses', color: '#f59e0b' },
  { to: '/focus', icon: Timer, label: 'Focus Timer', color: '#ef4444' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard', color: '#ffd700' },
  { to: '/planner', icon: Calendar, label: 'Planner', color: '#ec4899' },
];

const tierColors = {
  Bronze: '#cd7f32',
  Silver: '#c0c0c0',
  Gold: '#ffd700',
  Diamond: '#b9f2ff',
};

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, gamification, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const xpProgress = gamification
    ? ((gamification.total_xp % (200 * gamification.current_level)) / (200 * gamification.current_level)) * 100
    : 0;

  return (
    <motion.aside
      animate={{ width: collapsed ? 70 : 240 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="relative flex flex-col h-screen shrink-0 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #12121a 0%, #0d0d18 100%)',
        borderRight: '1px solid rgba(99,102,241,0.15)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 mb-2" style={{ minHeight: 70 }}>
        <div
          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          <Zap size={18} color="white" />
        </div>
        <motion.div
          animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : 'auto' }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="font-bold text-sm leading-tight whitespace-nowrap" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            ResearchPilot
          </div>
          <div className="text-xs" style={{ color: '#6366f1' }}>AI Research OS</div>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, color }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Icon size={18} style={{ color, shrink: 0 }} className="shrink-0" />
            <motion.span
              animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : 'auto' }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden whitespace-nowrap text-sm"
            >
              {label}
            </motion.span>
          </NavLink>
        ))}
      </nav>

      {/* User Profile */}
      {!collapsed && gamification && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mx-2 mb-2 p-3 rounded-xl"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold" style={{ color: tierColors[gamification.league_tier] || '#6366f1' }}>
              ★ Level {gamification.current_level} · {gamification.league_tier}
            </div>
            <div className="flex items-center gap-1 text-xs" style={{ color: '#fbbf24' }}>
              <Flame size={12} />
              {gamification.current_streak}
            </div>
          </div>
          <div className="xp-bar mb-1">
            <div className="xp-bar-fill" style={{ width: `${Math.min(xpProgress, 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs" style={{ color: '#64748b' }}>
            <span>{gamification.total_xp} XP</span>
            <div className="flex items-center gap-1">
              <TreePine size={11} style={{ color: '#10b981' }} />
              {gamification.trees_grown}
            </div>
          </div>
        </motion.div>
      )}

      {/* User Info & Logout */}
      <div className="p-2 border-t" style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
        {!collapsed && user && (
          <div className="px-2 py-1 mb-1">
            <div className="text-xs font-medium truncate" style={{ color: '#f1f5f9' }}>{user.full_name}</div>
            <div className="text-xs truncate" style={{ color: '#64748b' }}>{user.email}</div>
          </div>
        )}
        <button onClick={handleLogout} className="nav-item w-full" style={{ color: '#ef4444' }}>
          <LogOut size={16} className="shrink-0" />
          <motion.span
            animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : 'auto' }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden whitespace-nowrap text-sm"
          >
            Sign Out
          </motion.span>
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center z-50"
        style={{
          background: '#1e1e30',
          border: '1px solid rgba(99,102,241,0.3)',
          color: '#6366f1',
        }}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </motion.aside>
  );
}
