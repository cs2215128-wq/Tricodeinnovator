import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Lightbulb, Loader2, ArrowRight, AlertTriangle, Clock, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { researchAPI, ingestAPI } from '../services/api';
import toast from 'react-hot-toast';

const impactColors = {
  critical: { bg: 'rgba(239,68,68,0.1)', text: '#f87171', border: 'rgba(239,68,68,0.3)' },
  high: { bg: 'rgba(245,158,11,0.1)', text: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  medium: { bg: 'rgba(99,102,241,0.1)', text: '#818cf8', border: 'rgba(99,102,241,0.3)' },
};

const timelineColors = {
  '6 months': '#10b981',
  '1 year': '#f59e0b',
  '2+ years': '#ef4444',
};

export default function Gaps() {
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [expandedGap, setExpandedGap] = useState(null);
  const [sources, setSources] = useState([]);

  useEffect(() => {
    ingestAPI.getSources().then(r => setSources(r.data.data || [])).catch(() => {});
  }, []);

  const handleAnalyze = async () => {
    if (sources.length === 0) return toast.error('Upload research papers first');
    setLoading(true);
    try {
      const res = await researchAPI.analyzeGaps();
      const gapData = res.data.data.gaps;
      if (!gapData || gapData.length === 0) {
        toast.error('Not enough limitations data. Upload more research papers.');
        return;
      }
      setGaps(gapData);
      setAnalyzed(true);
      toast.success(`Identified ${gapData.length} research gaps!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gap analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Research Gap Discovery
        </h1>
        <p style={{ color: '#64748b' }}>AI-powered analysis of systemic gaps across your research corpus</p>
      </motion.div>

      {/* Trigger */}
      <div className="glass-card p-8 mb-8 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.15))' }}>
          <Search size={28} style={{ color: '#6366f1' }} />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#f1f5f9', fontFamily: 'Space Grotesk, sans-serif' }}>
          Analyze {sources.length} Research Source{sources.length !== 1 ? 's' : ''}
        </h2>
        <p className="text-sm mb-6 max-w-lg mx-auto" style={{ color: '#64748b' }}>
          Our AI will examine limitations across all your uploaded papers, detect recurring systemic gaps,
          and generate 3 actionable research proposal outlines.
        </p>
        <button onClick={handleAnalyze} disabled={loading || sources.length === 0}
          className="btn-primary px-8 py-3 text-base">
          {loading ? (
            <><Loader2 size={18} className="animate-spin" /> Analyzing Gaps...</>
          ) : (
            <><Lightbulb size={18} /> Discover Research Gaps</>
          )}
        </button>
      </div>

      {/* Gap Cards */}
      {analyzed && gaps.length > 0 && (
        <div className="space-y-5">
          <h2 className="text-xl font-bold" style={{ color: '#f1f5f9', fontFamily: 'Space Grotesk, sans-serif' }}>
            Identified Research Gaps
          </h2>
          {gaps.map((gap, i) => {
            const impact = impactColors[gap.impact_level] || impactColors.medium;
            const timelineColor = Object.entries(timelineColors).find(([k]) => gap.estimated_timeline?.includes(k))?.[1] || '#64748b';

            return (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }} className="glass-card overflow-hidden">
                {/* Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: impact.bg, border: `1px solid ${impact.border}` }}>
                        <AlertTriangle size={18} style={{ color: impact.text }} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg" style={{ color: '#f1f5f9', fontFamily: 'Space Grotesk, sans-serif' }}>
                          {gap.gap_title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="badge text-xs px-2 py-0.5 rounded-md"
                            style={{ background: impact.bg, color: impact.text, border: `1px solid ${impact.border}` }}>
                            {gap.impact_level?.toUpperCase()} IMPACT
                          </span>
                          <span className="flex items-center gap-1 text-xs"
                            style={{ color: timelineColor }}>
                            <Clock size={11} /> {gap.estimated_timeline}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-3xl font-black" style={{ color: 'rgba(99,102,241,0.2)' }}>0{i + 1}</span>
                  </div>

                  <p className="text-sm leading-relaxed mb-4" style={{ color: '#94a3b8' }}>
                    {gap.gap_description}
                  </p>

                  {gap.affected_papers?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="text-xs font-medium" style={{ color: '#64748b' }}>Affects:</span>
                      {gap.affected_papers.map(p => (
                        <span key={p} className="badge badge-warning text-xs">{p}</span>
                      ))}
                    </div>
                  )}

                  {/* Explore Direction Button */}
                  <button onClick={() => setExpandedGap(expandedGap === i ? null : i)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.15))',
                      color: '#818cf8',
                      border: '1px solid rgba(99,102,241,0.3)',
                    }}>
                    <Zap size={14} />
                    Explore Research Direction
                    {expandedGap === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {/* Proposal Outline */}
                {expandedGap === i && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="overflow-hidden">
                    <div className="mx-6 mb-6 p-5 rounded-xl"
                      style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb size={16} style={{ color: '#f59e0b' }} />
                        <h4 className="font-bold" style={{ color: '#f1f5f9' }}>{gap.proposal_title}</h4>
                      </div>
                      <p className="text-sm leading-relaxed mb-4" style={{ color: '#94a3b8' }}>
                        {gap.proposal_outline}
                      </p>
                      <div className="flex items-center gap-2 text-xs" style={{ color: '#6366f1' }}>
                        <ArrowRight size={12} />
                        Estimated timeline: <strong>{gap.estimated_timeline}</strong>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
