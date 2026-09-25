import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const FloatingOrb = ({ x, y, size, color, delay }) => (
  <motion.div
    className="absolute rounded-full blur-3xl opacity-20"
    style={{ left: x, top: y, width: size, height: size, background: color }}
    animate={{ y: [0, -30, 0], scale: [1, 1.1, 1] }}
    transition={{ duration: 6 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
  />
);

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', full_name: '' });
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login(form.email, form.password);
        toast.success('Welcome back!');
      } else {
        await register(form.email, form.password, form.full_name);
        toast.success('Account created! Welcome to ResearchPilot AI 🚀');
      }
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Authentication failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center grid-bg relative overflow-hidden" style={{ background: '#0a0a0f' }}>
      {/* Background Orbs */}
      <FloatingOrb x="10%" y="10%" size={400} color="#6366f1" delay={0} />
      <FloatingOrb x="60%" y="60%" size={350} color="#8b5cf6" delay={2} />
      <FloatingOrb x="80%" y="10%" size={300} color="#06b6d4" delay={4} />
      <FloatingOrb x="20%" y="70%" size={250} color="#ec4899" delay={1} />

      <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative w-full max-w-md mx-4">

        {/* Card */}
        <div className="glass-card p-8 backdrop-blur-3xl" style={{ boxShadow: '0 0 80px rgba(99,102,241,0.15)' }}>
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div whileHover={{ rotate: 10 }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 30px rgba(99,102,241,0.5)' }}>
              <Zap size={30} color="white" />
            </motion.div>
            <h1 className="text-2xl font-black gradient-text mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              ResearchPilot AI
            </h1>
            <p className="text-sm" style={{ color: '#64748b' }}>Your AI Research Operating System</p>
          </div>

          {/* Tab Toggle */}
          <div className="flex mb-6 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(99,102,241,0.15)' }}>
            {['Login', 'Register'].map(tab => (
              <button key={tab} onClick={() => setIsLogin(tab === 'Login')}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: (tab === 'Login') === isLogin ? 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.2))' : 'transparent',
                  color: (tab === 'Login') === isLogin ? '#a5b4fc' : '#64748b',
                  border: (tab === 'Login') === isLogin ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                }}>
                {tab}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence>
              {!isLogin && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="relative">
                    <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#64748b' }} />
                    <input 
                      className="input-field input-with-icon-left" 
                      style={{ paddingLeft: '42px' }}
                      placeholder="Full Name" 
                      value={form.full_name}
                      onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} 
                      required 
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#64748b' }} />
              <input 
                className="input-field input-with-icon-left" 
                style={{ paddingLeft: '42px' }}
                type="email" 
                placeholder="Email address" 
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} 
                required 
              />
            </div>

            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#64748b' }} />
              <input 
                className="input-field input-with-icon-left input-with-icon-right" 
                style={{ paddingLeft: '42px', paddingRight: '44px' }}
                type={showPassword ? 'text' : 'password'}
                placeholder="Password" 
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))} 
                required 
                minLength={8} 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/5 transition-colors" 
                style={{ color: '#64748b' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> {isLogin ? 'Signing in...' : 'Creating account...'}</>
              ) : (
                <><Zap size={18} /> {isLogin ? 'Sign In' : 'Create Account'}</>
              )}
            </button>

            {isLogin && (
              <button
                type="button"
                onClick={() => setForm({ email: 'demo@researchpilot.ai', password: 'password123', full_name: '' })}
                className="w-full py-2 rounded-xl text-xs font-medium transition-all text-center"
                style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  color: '#818cf8',
                  border: '1px dashed rgba(99, 102, 241, 0.35)',
                }}
              >
                ⚡ Click to fill Demo Account (Dr. Alex Vance)
              </button>
            )}
          </form>

          {/* Features */}
          <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(99,102,241,0.12)' }}>
            <p className="text-xs text-center mb-3" style={{ color: '#475569' }}>What's inside</p>
            <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: '#64748b' }}>
              {['📄 RAG Research Chat', '🔬 Gap Discovery', '📊 Research Matrix', '🎓 AI Courses', '🌲 Focus Timer', '🏆 Leaderboard'].map(f => (
                <div key={f} className="flex items-center gap-1">
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
