import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, RefreshCw, ChevronDown, ChevronUp, CheckSquare, Square, Table2 } from 'lucide-react';
import { ingestAPI, researchAPI } from '../services/api';
import toast from 'react-hot-toast';

const FIELDS = ['methodology', 'datasets', 'results', 'limitations'];
const FIELD_COLORS = {
  methodology: '#6366f1',
  datasets: '#06b6d4',
  results: '#10b981',
  limitations: '#f59e0b',
};

export default function Matrix() {
  const [sources, setSources] = useState([]);
  const [selected, setSelected] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedField, setExpandedField] = useState(null);

  useEffect(() => {
    ingestAPI.getSources().then(r => setSources(r.data.data || [])).catch(() => {});
  }, []);

  const toggleSource = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleGenerate = async () => {
    if (selected.length < 1) return toast.error('Select at least 1 source');
    setLoading(true);
    try {
      const res = await researchAPI.getMatrix(selected);
      setMatrix(res.data.data.matrix);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate matrix');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-3xl font-bold gradient-text mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Research Matrix
        </h1>
        <p style={{ color: '#64748b' }}>Side-by-side comparative analysis across papers</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Source Selector */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-sm mb-4" style={{ color: '#94a3b8' }}>Select Papers</h3>
          <div className="space-y-2 mb-4 max-h-72 overflow-y-auto">
            {sources.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: '#475569' }}>No sources available</p>
            ) : sources.map(s => (
              <button key={s.id} onClick={() => toggleSource(s.id)}
                className="flex items-center gap-3 w-full p-3 rounded-lg text-left transition-all"
                style={{
                  background: selected.includes(s.id) ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${selected.includes(s.id) ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.1)'}`,
                }}>
                {selected.includes(s.id) ? <CheckSquare size={16} style={{ color: '#6366f1', shrink: 0 }} /> : <Square size={16} style={{ color: '#64748b', shrink: 0 }} />}
                <span className="text-xs truncate" style={{ color: '#f1f5f9' }}>{s.title}</span>
              </button>
            ))}
          </div>
          <button onClick={handleGenerate} disabled={loading || selected.length === 0} className="btn-primary w-full justify-center text-sm">
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Table2 size={14} />}
            {loading ? 'Generating...' : `Compare (${selected.length})`}
          </button>
        </div>

        {/* Matrix Output */}
        <div className="lg:col-span-3">
          {matrix.length === 0 ? (
            <div className="glass-card flex flex-col items-center justify-center" style={{ minHeight: 400 }}>
              <Database size={48} style={{ color: '#334155' }} className="mb-4" />
              <p className="font-semibold mb-1" style={{ color: '#64748b' }}>No comparison yet</p>
              <p className="text-sm" style={{ color: '#475569' }}>Select sources and click Compare</p>
            </div>
          ) : (
            <div className="space-y-4">
              {FIELDS.map(field => (
                <motion.div key={field} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="glass-card overflow-hidden">
                  <button
                    onClick={() => setExpandedField(expandedField === field ? null : field)}
                    className="w-full flex items-center justify-between p-5"
                    style={{ borderBottom: expandedField === field ? '1px solid rgba(99,102,241,0.15)' : 'none' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: FIELD_COLORS[field] }} />
                      <span className="font-semibold capitalize text-base" style={{ color: '#f1f5f9' }}>{field}</span>
                      <span className="badge badge-primary">{matrix.length} papers</span>
                    </div>
                    {expandedField === field ? <ChevronUp size={18} style={{ color: '#64748b' }} /> : <ChevronDown size={18} style={{ color: '#64748b' }} />}
                  </button>

                  <AnimatePresence>
                    {expandedField === field && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                        className="overflow-hidden">
                        <div className="grid gap-4 p-5" style={{ gridTemplateColumns: `repeat(${Math.min(matrix.length, 3)}, 1fr)` }}>
                          {matrix.map(paper => (
                            <div key={paper.id} className="p-4 rounded-xl"
                              style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                              <p className="font-semibold text-sm mb-3 truncate" style={{ color: FIELD_COLORS[field] }}>
                                {paper.title}
                              </p>
                              <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>
                                {paper[field] || 'Not specified'}
                              </p>
                              {paper.keywords?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-3">
                                  {paper.keywords.slice(0, 3).map(kw => (
                                    <span key={kw} className="badge badge-primary text-xs">{kw}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}

              {/* Summary Row */}
              <div className="glass-card p-5">
                <h3 className="font-semibold mb-4" style={{ color: '#f1f5f9' }}>Paper Overview</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
                        <th className="text-left py-2 pr-4 text-xs font-semibold" style={{ color: '#64748b' }}>Paper</th>
                        <th className="text-left py-2 pr-4 text-xs font-semibold" style={{ color: '#64748b' }}>Type</th>
                        <th className="text-left py-2 pr-4 text-xs font-semibold" style={{ color: '#64748b' }}>Year</th>
                        <th className="text-left py-2 text-xs font-semibold" style={{ color: '#64748b' }}>Summary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matrix.map(paper => (
                        <tr key={paper.id} style={{ borderBottom: '1px solid rgba(99,102,241,0.07)' }}>
                          <td className="py-3 pr-4 font-medium text-xs" style={{ color: '#f1f5f9', maxWidth: 150 }}>
                            <span className="block truncate">{paper.title}</span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="badge badge-primary">{paper.research_type}</span>
                          </td>
                          <td className="py-3 pr-4 text-xs" style={{ color: '#64748b' }}>{paper.year || '—'}</td>
                          <td className="py-3 text-xs leading-relaxed" style={{ color: '#94a3b8', maxWidth: 300 }}>
                            {paper.abstract_summary?.substring(0, 120)}...
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
