import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, X, Trash2, Clock, BookOpen, GraduationCap, Users, ClipboardList } from 'lucide-react';
import { scheduleAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format, startOfWeek, addDays, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';

const EVENT_TYPES = {
  class: { color: '#6366f1', bg: 'rgba(99,102,241,0.15)', icon: BookOpen, label: 'Class' },
  exam: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', icon: ClipboardList, label: 'Exam' },
  assignment: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: ClipboardList, label: 'Assignment' },
  study: { color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: BookOpen, label: 'Study' },
  meeting: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', icon: Users, label: 'Meeting' },
  other: { color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', icon: Calendar, label: 'Other' },
};

export default function Planner() {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('week'); // week | month
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '', event_type: 'class', start_time: '', end_time: '', color_code: '#3B82F6'
  });

  useEffect(() => { fetchEvents(); }, [currentDate, view]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const start = view === 'week'
        ? startOfWeek(currentDate, { weekStartsOn: 1 })
        : startOfMonth(currentDate);
      const end = view === 'week'
        ? addDays(start, 6)
        : endOfMonth(currentDate);
      const res = await scheduleAPI.getEvents({
        start: start.toISOString(),
        end: end.toISOString(),
      });
      setEvents(res.data.data || []);
    } catch { } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newEvent.title.trim()) return toast.error('Event title required');
    if (!newEvent.start_time) return toast.error('Start time required');
    try {
      await scheduleAPI.createEvent(newEvent);
      toast.success('Event created!');
      setShowAddModal(false);
      setNewEvent({ title: '', event_type: 'class', start_time: '', end_time: '', color_code: '#3B82F6' });
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create event');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await scheduleAPI.deleteEvent(id);
      setEvents(prev => prev.filter(ev => ev.id !== id));
      toast.success('Event deleted');
    } catch {
      toast.error('Failed to delete event');
    }
  };

  // Week view days
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getEventsForDay = (day) =>
    events.filter(e => isSameDay(parseISO(e.start_time), day));

  // Month view
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1; // Mon-based

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold gradient-text" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Academic Planner
          </h1>
          <p style={{ color: '#64748b' }}>Color-coded timetable and assignment calendar</p>
        </div>
        <button onClick={() => { setShowAddModal(true); setSelectedDay(null); }} className="btn-primary">
          <Plus size={16} /> Add Event
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-5 glass-card p-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(d => view === 'week' ? addDays(d, -7) : new Date(d.getFullYear(), d.getMonth() - 1))}
            className="px-3 py-1.5 rounded-lg text-sm transition-all"
            style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
            ←
          </button>
          <h2 className="text-lg font-bold px-3" style={{ color: '#f1f5f9', fontFamily: 'Space Grotesk, sans-serif' }}>
            {view === 'week'
              ? `${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`
              : format(currentDate, 'MMMM yyyy')
            }
          </h2>
          <button onClick={() => setCurrentDate(d => view === 'week' ? addDays(d, 7) : new Date(d.getFullYear(), d.getMonth() + 1))}
            className="px-3 py-1.5 rounded-lg text-sm transition-all"
            style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
            →
          </button>
          <button onClick={() => setCurrentDate(new Date())}
            className="ml-2 px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(99,102,241,0.1)' }}>
            Today
          </button>
        </div>
        <div className="flex gap-2">
          {['week', 'month'].map(v => (
            <button key={v} onClick={() => setView(v)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
              style={{
                background: view === v ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: view === v ? '#818cf8' : '#64748b',
                border: `1px solid ${view === v ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.08)'}`,
              }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Event Type Legend */}
      <div className="flex flex-wrap gap-3 mb-5">
        {Object.entries(EVENT_TYPES).map(([type, cfg]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs" style={{ color: '#64748b' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
            {cfg.label}
          </div>
        ))}
      </div>

      {/* Week View */}
      {view === 'week' && (
        <div className="glass-card overflow-hidden">
          <div className="grid grid-cols-7" style={{ borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
              <div key={d} className="text-center py-3 text-xs font-semibold" style={{ color: '#64748b' }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7" style={{ minHeight: 480 }}>
            {weekDays.map((day, i) => {
              const dayEvents = getEventsForDay(day);
              const isToday = isSameDay(day, new Date());
              return (
                <div key={i}
                  className="p-2 cursor-pointer transition-all"
                  style={{
                    borderRight: i < 6 ? '1px solid rgba(99,102,241,0.08)' : 'none',
                    background: isToday ? 'rgba(99,102,241,0.05)' : 'transparent',
                  }}
                  onClick={() => { setSelectedDay(day); setShowAddModal(true); setNewEvent(prev => ({ ...prev, start_time: format(day, "yyyy-MM-dd'T'09:00") })); }}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-2 ${isToday ? 'bg-indigo-500 text-white' : ''}`}
                    style={{ color: isToday ? 'white' : '#94a3b8' }}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.map(ev => {
                      const cfg = EVENT_TYPES[ev.event_type] || EVENT_TYPES.other;
                      return (
                        <div key={ev.id}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs cursor-pointer group"
                          style={{ background: cfg.bg, border: `1px solid ${cfg.color}40`, color: cfg.color }}
                          onClick={e => e.stopPropagation()}>
                          <span className="flex-1 truncate font-medium">{ev.title}</span>
                          <button onClick={e => handleDelete(ev.id, e)}
                            className="opacity-0 group-hover:opacity-100 shrink-0">
                            <X size={10} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Month View */}
      {view === 'month' && (
        <div className="glass-card overflow-hidden">
          <div className="grid grid-cols-7" style={{ borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="text-center py-3 text-xs font-semibold" style={{ color: '#64748b' }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2 min-h-20" style={{ background: 'rgba(0,0,0,0.1)' }} />
            ))}
            {monthDays.map(day => {
              const dayEvents = getEventsForDay(day);
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()} className="p-2 min-h-20 cursor-pointer transition-all"
                  style={{
                    border: '1px solid rgba(99,102,241,0.06)',
                    background: isToday ? 'rgba(99,102,241,0.05)' : 'transparent',
                  }}
                  onClick={() => { setShowAddModal(true); setNewEvent(prev => ({ ...prev, start_time: format(day, "yyyy-MM-dd'T'09:00") })); }}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${isToday ? '' : ''}`}
                    style={{
                      background: isToday ? '#6366f1' : 'transparent',
                      color: isToday ? 'white' : '#94a3b8',
                    }}>
                    {format(day, 'd')}
                  </div>
                  {dayEvents.slice(0, 2).map(ev => {
                    const cfg = EVENT_TYPES[ev.event_type] || EVENT_TYPES.other;
                    return (
                      <div key={ev.id} className="w-full px-1 py-0.5 rounded text-xs truncate mb-0.5"
                        style={{ background: cfg.bg, color: cfg.color, fontSize: 10 }}>
                        {ev.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <div className="text-xs" style={{ color: '#64748b' }}>+{dayEvents.length - 2} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Events List */}
      <div className="mt-6 glass-card p-5">
        <h3 className="font-bold mb-4" style={{ color: '#f1f5f9', fontFamily: 'Space Grotesk, sans-serif' }}>
          Upcoming Events
        </h3>
        {events.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: '#475569' }}>No events in this period</p>
        ) : (
          <div className="space-y-2">
            {events.slice(0, 10).map(ev => {
              const cfg = EVENT_TYPES[ev.event_type] || EVENT_TYPES.other;
              const Icon = cfg.icon;
              return (
                <div key={ev.id} className="flex items-center gap-3 p-3 rounded-xl group"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(99,102,241,0.08)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: cfg.bg }}>
                    <Icon size={14} style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm" style={{ color: '#f1f5f9' }}>{ev.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: '#64748b' }}>
                        {format(parseISO(ev.start_time), 'MMM d, h:mm a')}
                      </span>
                      <span className="badge text-xs" style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                  <button onClick={e => handleDelete(ev.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all"
                    style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="glass-card p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-lg" style={{ color: '#f1f5f9', fontFamily: 'Space Grotesk, sans-serif' }}>Add Event</h3>
                <button onClick={() => setShowAddModal(false)}>
                  <X size={18} style={{ color: '#64748b' }} />
                </button>
              </div>
              <div className="space-y-4">
                <input className="input-field" placeholder="Event title" value={newEvent.title}
                  onChange={e => setNewEvent(prev => ({ ...prev, title: e.target.value }))} />
                <select className="input-field" value={newEvent.event_type}
                  onChange={e => setNewEvent(prev => ({ ...prev, event_type: e.target.value }))}>
                  {Object.entries(EVENT_TYPES).map(([type, cfg]) => (
                    <option key={type} value={type}>{cfg.label}</option>
                  ))}
                </select>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: '#94a3b8' }}>Start Time</label>
                  <input type="datetime-local" className="input-field" value={newEvent.start_time}
                    onChange={e => setNewEvent(prev => ({ ...prev, start_time: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: '#94a3b8' }}>End Time (optional)</label>
                  <input type="datetime-local" className="input-field" value={newEvent.end_time}
                    onChange={e => setNewEvent(prev => ({ ...prev, end_time: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-xl text-sm transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.1)' }}>
                    Cancel
                  </button>
                  <button onClick={handleCreate} className="flex-1 btn-primary justify-center py-2.5">
                    <Plus size={16} /> Create
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
