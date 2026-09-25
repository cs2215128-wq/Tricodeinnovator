import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, File, Link, BookOpen, X, CheckCircle, AlertCircle, Loader2, Plus } from 'lucide-react';
import { ingestAPI } from '../services/api';
import toast from 'react-hot-toast';

const sourceTypeConfig = {
  pdf: { label: 'PDF Paper', color: '#ef4444', ext: '.pdf' },
  ppt: { label: 'Slideshow', color: '#f59e0b', ext: '.ppt,.pptx' },
  audio: { label: 'Audio Lecture', color: '#8b5cf6', ext: '.mp3,.mp4,.wav,.ogg,.webm' },
  text: { label: 'Text File', color: '#06b6d4', ext: '.txt,.md' },
};

export default function FileUploader({ onUploadComplete }) {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState([]);
  const [urlInput, setUrlInput] = useState('');
  const [urlType, setUrlType] = useState('web');
  const [activeTab, setActiveTab] = useState('file');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Anki state
  const [ankiDeckName, setAnkiDeckName] = useState('');
  const [ankiCards, setAnkiCards] = useState([{ front: '', back: '' }]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer?.files || e.target.files || []);
    setFiles(prev => [...prev, ...dropped.map(f => ({ file: f, status: 'pending', id: Math.random() }))]);
  }, []);

  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id));

  const handleFileUpload = async () => {
    if (files.length === 0) return toast.error('Please select files first');
    setUploading(true);
    setProgress(0);
    const formData = new FormData();
    files.forEach(f => formData.append('files', f.file));
    try {
      const res = await ingestAPI.uploadFiles(formData, setProgress);
      const { results, errors } = res.data.data;
      if (results.length > 0) {
        toast.success(`✅ ${results.length} file(s) processed successfully!`);
        onUploadComplete?.();
        setFiles([]);
      }
      if (errors.length > 0) {
        toast.error(`${errors.length} file(s) failed: ${errors[0].error}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleURLIngest = async () => {
    if (!urlInput.trim()) return toast.error('Please enter a URL');
    setUploading(true);
    try {
      const res = await ingestAPI.ingestURL({ url: urlInput.trim(), source_type: urlType });
      toast.success(`✅ "${res.data.data.title}" ingested! (${res.data.data.chunks_created} chunks)`);
      setUrlInput('');
      onUploadComplete?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'URL ingestion failed');
    } finally {
      setUploading(false);
    }
  };

  const handleAnkiIngest = async () => {
    if (!ankiDeckName.trim()) return toast.error('Please enter a deck name');
    const validCards = ankiCards.filter(c => c.front.trim() && c.back.trim());
    if (validCards.length === 0) return toast.error('Please add at least one card with front and back');
    setUploading(true);
    try {
      const res = await ingestAPI.ingestAnki({ deck_name: ankiDeckName, cards: validCards });
      toast.success(`✅ Anki deck "${ankiDeckName}" (${validCards.length} cards) ingested!`);
      setAnkiDeckName('');
      setAnkiCards([{ front: '', back: '' }]);
      onUploadComplete?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Anki ingestion failed');
    } finally {
      setUploading(false);
    }
  };

  const tabs = [
    { id: 'file', label: 'Files', icon: Upload },
    { id: 'url', label: 'URL / YouTube', icon: Link },
    { id: 'anki', label: 'Anki Deck', icon: BookOpen },
  ];

  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-bold mb-4 gradient-text" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
        Multi-Modal Ingestion Hub
      </h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-5" style={{ borderBottom: '1px solid rgba(99,102,241,0.15)', paddingBottom: '12px' }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === id ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: activeTab === id ? '#818cf8' : '#64748b',
              border: activeTab === id ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'file' && (
          <motion.div key="file" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {/* Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => document.getElementById('file-input').click()}
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-4"
              style={{
                borderColor: dragOver ? '#6366f1' : 'rgba(99,102,241,0.25)',
                background: dragOver ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.03)',
              }}
            >
              <input id="file-input" type="file" multiple hidden onChange={onDrop}
                accept=".pdf,.ppt,.pptx,.txt,.md,.mp3,.mp4,.wav,.ogg,.webm" />
              <Upload size={32} className="mx-auto mb-3" style={{ color: '#6366f1' }} />
              <p className="font-medium mb-1" style={{ color: '#f1f5f9' }}>
                Drop files here or <span style={{ color: '#6366f1' }}>browse</span>
              </p>
              <p className="text-xs" style={{ color: '#64748b' }}>PDF, PPT, Audio, TXT · Max 50MB per file</p>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-2 mb-4">
                {files.map(({ file, status, id }) => (
                  <motion.div key={id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(99,102,241,0.15)' }}
                  >
                    <File size={16} style={{ color: '#6366f1' }} />
                    <span className="flex-1 text-sm truncate" style={{ color: '#f1f5f9' }}>{file.name}</span>
                    <span className="text-xs" style={{ color: '#64748b' }}>
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <button onClick={() => removeFile(id)}>
                      <X size={14} style={{ color: '#64748b' }} />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Progress Bar */}
            {uploading && (
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1" style={{ color: '#64748b' }}>
                  <span>Uploading & vectorizing...</span>
                  <span>{progress}%</span>
                </div>
                <div className="xp-bar">
                  <div className="xp-bar-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <button onClick={handleFileUpload} disabled={uploading || files.length === 0} className="btn-primary w-full justify-center">
              {uploading ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : <><Upload size={16} /> Upload & Vectorize</>}
            </button>
          </motion.div>
        )}

        {activeTab === 'url' && (
          <motion.div key="url" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="mb-4">
              <label className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>Source Type</label>
              <div className="flex gap-2">
                {['web', 'youtube'].map(t => (
                  <button key={t} onClick={() => setUrlType(t)}
                    className="flex-1 py-2 px-3 rounded-lg text-sm font-medium capitalize transition-all"
                    style={{
                      background: urlType === t ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                      color: urlType === t ? '#818cf8' : '#64748b',
                      border: `1px solid ${urlType === t ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.1)'}`,
                    }}>
                    {t === 'youtube' ? '▶ YouTube' : '🌐 Web Page'}
                  </button>
                ))}
              </div>
            </div>
            <input
              className="input-field mb-4"
              placeholder={urlType === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://example.com/paper'}
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleURLIngest()}
            />
            <button onClick={handleURLIngest} disabled={uploading || !urlInput.trim()} className="btn-primary w-full justify-center">
              {uploading ? <><Loader2 size={16} className="animate-spin" /> Ingesting...</> : <><Link size={16} /> Ingest URL</>}
            </button>
          </motion.div>
        )}

        {activeTab === 'anki' && (
          <motion.div key="anki" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <input className="input-field mb-4" placeholder="Deck name (e.g., Machine Learning 101)"
              value={ankiDeckName} onChange={e => setAnkiDeckName(e.target.value)} />
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-1">
              {ankiCards.map((card, i) => (
                <div key={i} className="p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium" style={{ color: '#6366f1' }}>Card {i + 1}</span>
                    {ankiCards.length > 1 && (
                      <button onClick={() => setAnkiCards(p => p.filter((_, j) => j !== i))}>
                        <X size={12} style={{ color: '#64748b' }} />
                      </button>
                    )}
                  </div>
                  <input className="input-field mb-2 text-xs" placeholder="Front (Question)"
                    value={card.front} onChange={e => setAnkiCards(p => p.map((c, j) => j === i ? { ...c, front: e.target.value } : c))} />
                  <input className="input-field text-xs" placeholder="Back (Answer)"
                    value={card.back} onChange={e => setAnkiCards(p => p.map((c, j) => j === i ? { ...c, back: e.target.value } : c))} />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAnkiCards(p => [...p, { front: '', back: '' }])}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm"
                style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px dashed rgba(99,102,241,0.3)' }}>
                <Plus size={14} /> Add Card
              </button>
              <button onClick={handleAnkiIngest} disabled={uploading} className="flex-1 btn-primary justify-center">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <BookOpen size={14} />}
                Ingest Deck
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
