import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Plus, Loader2, BookOpen, ChevronRight, ChevronLeft,
  CheckCircle, XCircle, Zap, Star, RotateCcw, Play
} from 'lucide-react';
import { courseAPI, ingestAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// ─── Flashcard Component ─────────────────────────────────────────────────────
const Flashcard = ({ card }) => {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="perspective-1000 cursor-pointer h-40" onClick={() => setFlipped(!flipped)}
      style={{ perspective: 1000 }}>
      <motion.div className="relative w-full h-full"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
        style={{ transformStyle: 'preserve-3d' }}>
        {/* Front */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 rounded-xl backface-hidden"
          style={{ backfaceVisibility: 'hidden', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)' }}>
          <p className="text-sm font-semibold text-center" style={{ color: '#f1f5f9' }}>{card.front}</p>
          <p className="text-xs mt-2" style={{ color: '#6366f1' }}>Click to flip</p>
        </div>
        {/* Back */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 rounded-xl"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <p className="text-sm text-center" style={{ color: '#94a3b8' }}>{card.back}</p>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Quiz Component ───────────────────────────────────────────────────────────
const Quiz = ({ quiz, courseId, onComplete }) => {
  const [sessionId, setSessionId] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [totalXp, setTotalXp] = useState(0);
  const { updateGamification } = useAuth();

  useEffect(() => {
    // Start quiz session
    courseAPI.startQuiz(courseId, quiz.name)
      .then(r => setSessionId(r.data.data.id))
      .catch(() => {});
  }, []);

  const question = quiz.questions[currentIdx];
  const isCorrect = selected === question?.correct_answer;
  const progress = ((currentIdx + 1) / quiz.questions.length) * 100;

  const handleSelect = async (optIdx) => {
    if (selected !== null) return;
    setSelected(optIdx);
    setShowResult(true);
    const correct = optIdx === question.correct_answer;
    const xp = correct ? (question.xp_reward || 10) : 0;
    const newAnswers = [...answers, { question_index: currentIdx, selected: optIdx, correct, xp }];
    setAnswers(newAnswers);
    setTotalXp(prev => prev + xp);

    // Save to backend
    if (sessionId) {
      const isLast = currentIdx >= quiz.questions.length - 1;
      const allXp = newAnswers.reduce((s, a) => s + a.xp, 0);
      await courseAPI.updateQuizState(sessionId, {
        current_question_index: currentIdx,
        user_answers: newAnswers,
        is_completed: isLast,
        xp_earned: allXp,
      }).catch(() => {});
    }
  };

  const handleNext = () => {
    if (currentIdx >= quiz.questions.length - 1) {
      setCompleted(true);
      onComplete?.(totalXp);
    } else {
      setCurrentIdx(i => i + 1);
      setSelected(null);
      setShowResult(false);
    }
  };

  if (completed) {
    const correct = answers.filter(a => a.correct).length;
    const pct = Math.round((correct / quiz.questions.length) * 100);
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="text-center py-10">
        <div className="text-6xl mb-4">{pct >= 80 ? '🏆' : pct >= 60 ? '🎉' : '📚'}</div>
        <h3 className="text-2xl font-bold mb-2 gradient-text" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Quiz Complete!
        </h3>
        <p className="mb-6" style={{ color: '#94a3b8' }}>{correct}/{quiz.questions.length} correct · {pct}% accuracy</p>
        <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl mb-6"
          style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}>
          <Zap size={18} /> +{totalXp} XP Earned!
        </div>
      </motion.div>
    );
  }

  if (!question) return null;

  return (
    <div>
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-xs mb-1" style={{ color: '#64748b' }}>
          <span>Question {currentIdx + 1} of {quiz.questions.length}</span>
          <span style={{ color: '#fbbf24' }}>+{totalXp} XP so far</span>
        </div>
        <div className="xp-bar"><div className="xp-bar-fill" style={{ width: `${progress}%` }} /></div>
      </div>

      {/* Question */}
      <div className="p-5 rounded-xl mb-5"
        style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <p className="font-semibold leading-relaxed" style={{ color: '#f1f5f9' }}>{question.question}</p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-3 mb-5">
        {question.options.map((opt, i) => {
          let bg = 'rgba(255,255,255,0.03)', border = 'rgba(99,102,241,0.12)', color = '#94a3b8';
          if (selected !== null) {
            if (i === question.correct_answer) { bg = 'rgba(16,185,129,0.15)'; border = 'rgba(16,185,129,0.4)'; color = '#34d399'; }
            else if (i === selected && !isCorrect) { bg = 'rgba(239,68,68,0.1)'; border = 'rgba(239,68,68,0.3)'; color = '#f87171'; }
          } else if (selected === null) {
            bg = 'rgba(255,255,255,0.03)';
          }
          return (
            <button key={i} onClick={() => handleSelect(i)} disabled={selected !== null}
              className="flex items-center gap-3 p-4 rounded-xl text-left transition-all"
              style={{ background: bg, border: `1px solid ${border}`, color }}>
              <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-sm">{opt}</span>
              {selected !== null && i === question.correct_answer && <CheckCircle size={16} className="ml-auto" style={{ color: '#10b981' }} />}
              {selected !== null && i === selected && i !== question.correct_answer && <XCircle size={16} className="ml-auto" style={{ color: '#ef4444' }} />}
            </button>
          );
        })}
      </div>

      {/* Explanation & Next */}
      <AnimatePresence>
        {showResult && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {question.explanation && (
              <div className="p-4 rounded-xl mb-4"
                style={{ background: isCorrect ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                <p className="text-sm" style={{ color: '#94a3b8' }}>💡 {question.explanation}</p>
              </div>
            )}
            <button onClick={handleNext} className="btn-primary w-full justify-center">
              {currentIdx >= quiz.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
              <ChevronRight size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Main Courses Page ────────────────────────────────────────────────────────
export default function Courses() {
  const { updateGamification } = useAuth();
  const [courses, setCourses] = useState([]);
  const [sources, setSources] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeModule, setActiveModule] = useState(0);
  const [view, setView] = useState('lessons'); // lessons | flashcards | quiz
  const [generating, setGenerating] = useState(false);
  const [showGenForm, setShowGenForm] = useState(false);
  const [genTopic, setGenTopic] = useState('');
  const [genSources, setGenSources] = useState([]);

  useEffect(() => {
    courseAPI.listCourses().then(r => setCourses(r.data.data || [])).catch(() => {});
    ingestAPI.getSources().then(r => setSources(r.data.data || [])).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!genTopic.trim()) return toast.error('Enter a topic');
    if (genSources.length === 0) return toast.error('Select at least one source');
    setGenerating(true);
    try {
      const res = await courseAPI.generateCourse(genTopic, genSources);
      const course = res.data.data;
      toast.success(`Course "${course.title}" generated! +30 XP`);
      setCourses(prev => [{ id: course.course_id, topic_title: course.title, course_structure: course.structure, created_at: new Date().toISOString() }, ...prev]);
      updateGamification({ total_xp: (res.data.data.new_profile?.total_xp || 30) });
      setShowGenForm(false);
      setGenTopic('');
      setGenSources([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleQuizComplete = (xp) => {
    updateGamification(prev => ({ ...prev, total_xp: (prev?.total_xp || 0) + xp }));
    toast.success(`🎉 +${xp} XP awarded!`);
  };

  const struct = selectedCourse?.course_structure;
  const module = struct?.modules?.[activeModule];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold gradient-text" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Courses
          </h1>
          <p style={{ color: '#64748b' }}>AI-generated adaptive learning experiences</p>
        </div>
        <button onClick={() => setShowGenForm(!showGenForm)} className="btn-primary">
          <Plus size={16} /> Generate Course
        </button>
      </div>

      {/* Generate Form */}
      <AnimatePresence>
        {showGenForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <div className="glass-card p-6">
              <h3 className="font-bold mb-4" style={{ color: '#f1f5f9' }}>Generate New Course</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input className="input-field" placeholder="Topic (e.g., Deep Learning for NLP)"
                  value={genTopic} onChange={e => setGenTopic(e.target.value)} />
                <div>
                  <p className="text-xs mb-2" style={{ color: '#64748b' }}>Select source materials:</p>
                  <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                    {sources.map(s => (
                      <button key={s.id} onClick={() => setGenSources(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])}
                        className="text-xs px-3 py-1.5 rounded-lg transition-all"
                        style={{
                          background: genSources.includes(s.id) ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                          color: genSources.includes(s.id) ? '#818cf8' : '#64748b',
                          border: `1px solid ${genSources.includes(s.id) ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.1)'}`,
                        }}>
                        {s.title.substring(0, 20)}...
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={handleGenerate} disabled={generating} className="btn-primary mt-4">
                {generating ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : <><GraduationCap size={14} /> Create Course</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Course List */}
        <div className="space-y-3">
          {courses.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <GraduationCap size={32} style={{ color: '#334155' }} className="mx-auto mb-3" />
              <p style={{ color: '#64748b' }}>No courses yet</p>
            </div>
          ) : courses.map(c => (
            <button key={c.id} onClick={() => { setSelectedCourse(c); setActiveModule(0); setView('lessons'); }}
              className="w-full text-left p-4 rounded-xl transition-all"
              style={{
                background: selectedCourse?.id === c.id ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${selectedCourse?.id === c.id ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.1)'}`,
              }}>
              <p className="font-medium text-sm" style={{ color: '#f1f5f9' }}>{c.topic_title}</p>
              <p className="text-xs mt-1" style={{ color: '#64748b' }}>
                {c.course_structure?.modules?.length || 0} modules · {new Date(c.created_at).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>

        {/* Course Viewer */}
        <div className="lg:col-span-3">
          {!selectedCourse ? (
            <div className="glass-card flex items-center justify-center" style={{ minHeight: 500 }}>
              <div className="text-center">
                <BookOpen size={48} style={{ color: '#334155' }} className="mx-auto mb-4" />
                <p style={{ color: '#64748b' }}>Select a course to start learning</p>
              </div>
            </div>
          ) : (
            <div className="glass-card p-6" style={{ minHeight: 500 }}>
              {/* Course Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: '#f1f5f9', fontFamily: 'Space Grotesk, sans-serif' }}>
                    {struct?.title}
                  </h2>
                  <p className="text-sm" style={{ color: '#64748b' }}>{struct?.description}</p>
                </div>
                <div className="flex gap-2">
                  {['lessons', 'flashcards', 'quiz'].map(v => (
                    <button key={v} onClick={() => setView(v)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                      style={{
                        background: view === v ? 'rgba(99,102,241,0.2)' : 'transparent',
                        color: view === v ? '#818cf8' : '#64748b',
                        border: `1px solid ${view === v ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.1)'}`,
                      }}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Module Tabs */}
              <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                {struct?.modules?.map((m, i) => (
                  <button key={m.id} onClick={() => { setActiveModule(i); setView('lessons'); }}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: activeModule === i ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                      color: activeModule === i ? '#818cf8' : '#64748b',
                      border: `1px solid ${activeModule === i ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.08)'}`,
                    }}>
                    {m.title.substring(0, 24)}
                  </button>
                ))}
              </div>

              {/* Content Views */}
              <AnimatePresence mode="wait">
                {view === 'lessons' && module && (
                  <motion.div key="lessons" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {module.lessons?.map((lesson, i) => (
                      <div key={lesson.id} className="mb-5 p-5 rounded-xl"
                        style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)' }}>
                        <h4 className="font-bold mb-3" style={{ color: '#f1f5f9' }}>
                          <span style={{ color: '#6366f1' }}>{i + 1}.</span> {lesson.title}
                        </h4>
                        <p className="text-sm leading-relaxed mb-3" style={{ color: '#94a3b8' }}>{lesson.content}</p>
                        {lesson.key_concepts?.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {lesson.key_concepts.map(kc => (
                              <span key={kc} className="badge badge-primary text-xs">{kc}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}

                {view === 'flashcards' && module && (
                  <motion.div key="flashcards" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="grid grid-cols-2 gap-4">
                      {module.flashcards?.map(card => (
                        <Flashcard key={card.id} card={card} />
                      ))}
                    </div>
                  </motion.div>
                )}

                {view === 'quiz' && module?.quiz && (
                  <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Quiz quiz={module.quiz} courseId={selectedCourse.id} onComplete={handleQuizComplete} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
