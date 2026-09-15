import React, { useState, useEffect, useCallback } from 'react';

// ---------- helpers ----------
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const todayKey = () => new Date().toISOString().slice(0, 10);
const weekStartKey = (d = new Date()) => {
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun ... 6 Sat
  const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
};
const fmtDate = () =>
  new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

const EMPTY_APP = {
  inbox: [],
  toSchedule: [],
  today: { professional: [], personal: [] },
  backlog: { professional: [], personal: [] },
  wishlist: [],
};
const EMPTY_HABITS = { habits: [], log: {} };

const TABS = [
  { id: 'notes', label: 'Notes', icon: '🐣' },
  { id: 'today', label: 'Today', icon: '🌱' },
  { id: 'backlog', label: 'Backlog', icon: '📦' },
  { id: 'habits', label: 'Habits', icon: '🐾' },
  { id: 'wishlist', label: 'Wishlist', icon: '🛒' },
];

const CAT_META = {
  professional: { label: 'Professional', emoji: '💼', color: '#FF8C7A', soft: '#FFE7E1' },
  personal: { label: 'Personal', emoji: '🌿', color: '#5FBE8A', soft: '#E4F6EB' },
};

export default function QuestLog() {
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [tab, setTab] = useState('today');
  const [app, setApp] = useState(EMPTY_APP);
  const [commitments, setCommitments] = useState({});
  const [habitsData, setHabitsData] = useState(EMPTY_HABITS);

  // ---------- load ----------
  useEffect(() => {
    (async () => {
      try {
        const [a, c, h] = await Promise.allSettled([
          window.storage.get('app-data'),
          window.storage.get('commitments-data'),
          window.storage.get('habits-data'),
        ]);
        if (a.status === 'fulfilled' && a.value) setApp({ ...EMPTY_APP, ...JSON.parse(a.value.value) });
        if (c.status === 'fulfilled' && c.value) setCommitments(JSON.parse(c.value.value));
        if (h.status === 'fulfilled' && h.value) setHabitsData({ ...EMPTY_HABITS, ...JSON.parse(h.value.value) });
      } catch (e) {
        console.error(e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // ---------- save helpers ----------
  const persist = useCallback(async (key, value) => {
    try {
      const res = await window.storage.set(key, JSON.stringify(value), false);
      if (!res) setSaveError("Couldn't save just now — try again in a moment.");
      else setSaveError('');
    } catch (e) {
      console.error(e);
      setSaveError("Couldn't save just now — try again in a moment.");
    }
  }, []);

  const updateApp = useCallback((updater) => {
    setApp((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      persist('app-data', next);
      return next;
    });
  }, [persist]);

  const updateCommitments = useCallback((updater) => {
    setCommitments((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      persist('commitments-data', next);
      return next;
    });
  }, [persist]);

  const updateHabits = useCallback((updater) => {
    setHabitsData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      persist('habits-data', next);
      return next;
    });
  }, [persist]);

  if (!loaded) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#3D2C4D', fontFamily: 'var(--font-body)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
          Waking things up…
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <Header saveError={saveError} />
      <div style={{ padding: '14px 14px 100px' }}>
        {tab === 'notes' && <NotesTab app={app} updateApp={updateApp} />}
        {tab === 'today' && (
          <TodayTab
            app={app}
            updateApp={updateApp}
            commitments={commitments[todayKey()] || []}
            setCommitments={(list) => updateCommitments((prev) => ({ ...prev, [todayKey()]: list }))}
          />
        )}
        {tab === 'backlog' && <BacklogTab app={app} updateApp={updateApp} />}
        {tab === 'habits' && <HabitsTab habitsData={habitsData} updateHabits={updateHabits} />}
        {tab === 'wishlist' && <WishlistTab app={app} updateApp={updateApp} />}
      </div>
      <BottomNav tab={tab} setTab={setTab} />
    </Shell>
  );
}

// ================= SHELL / HEADER / NAV =================

function Shell({ children }) {
  return (
    <div
      style={{
        '--font-title': "'Press Start 2P', monospace",
        '--font-body': "'Quicksand', 'Segoe UI', sans-serif",
        '--ink': '#3D2C4D',
        '--bg': '#F6F0FF',
        '--card': '#FFFDF7',
        minHeight: '100vh',
        background:
          'var(--bg) repeating-linear-gradient(45deg, rgba(61,44,77,0.025) 0px, rgba(61,44,77,0.025) 2px, transparent 2px, transparent 10px)',
        color: 'var(--ink)',
        fontFamily: 'var(--font-body)',
        maxWidth: 480,
        margin: '0 auto',
        position: 'relative',
        boxShadow: '0 0 0 1px #E4D9F5',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Quicksand:wght@500;600;700&display=swap');
        * { box-sizing: border-box; }
        button { font-family: var(--font-body); cursor: pointer; }
        input, textarea { font-family: var(--font-body); }
        ::placeholder { color: #B7A6CC; }
      `}</style>
      {children}
    </div>
  );
}

function Header({ saveError }) {
  return (
    <div
      style={{
        padding: '18px 16px 14px',
        borderBottom: '3px solid var(--ink)',
        background: '#FFD166',
        position: 'sticky',
        top: 0,
        zIndex: 5,
      }}
    >
      <div style={{ fontFamily: 'var(--font-title)', fontSize: 13, lineHeight: 1.6, letterSpacing: 0.5 }}>
        quest log
      </div>
      <div style={{ fontSize: 13, marginTop: 6, fontWeight: 600, opacity: 0.75 }}>{fmtDate()}</div>
      {saveError && (
        <div style={{ marginTop: 8, fontSize: 12, background: '#FFF4E0', border: '2px solid #C9662B', color: '#8A4419', padding: '4px 8px', borderRadius: 4 }}>
          ⚠️ {saveError}
        </div>
      )}
    </div>
  );
}

function BottomNav({ tab, setTab }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 480,
        display: 'flex',
        borderTop: '3px solid var(--ink)',
        background: 'var(--card)',
      }}
    >
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          style={{
            flex: 1,
            border: 'none',
            background: tab === t.id ? '#FFE7E1' : 'transparent',
            padding: '10px 4px 8px',
            borderTop: tab === t.id ? '3px solid #FF8C7A' : '3px solid transparent',
            marginTop: -3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <span style={{ fontSize: 18 }}>{t.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink)' }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// small reusable pieces
function PixelCard({ children, style }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '3px solid var(--ink)',
        boxShadow: '4px 4px 0 #D9C8EC',
        borderRadius: 6,
        padding: 14,
        marginBottom: 14,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children, emoji }) {
  return (
    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
      <span>{emoji}</span>
      <span>{children}</span>
    </div>
  );
}

function PixelButton({ children, onClick, color = '#FF8C7A', small, disabled, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: disabled ? '#E7E0F0' : color,
        color: '#3D2C4D',
        border: '2.5px solid var(--ink)',
        borderRadius: 5,
        boxShadow: disabled ? 'none' : '2px 2px 0 #3D2C4D',
        padding: small ? '4px 8px' : '8px 14px',
        fontWeight: 700,
        fontSize: small ? 12 : 13,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

function EmptyHint({ children }) {
  return <div style={{ fontSize: 13, color: '#8B7A9E', fontStyle: 'italic', padding: '6px 2px' }}>{children}</div>;
}

// ================= NOTES TAB =================

function NotesTab({ app, updateApp }) {
  const [draft, setDraft] = useState('');
  const [openSorter, setOpenSorter] = useState(null);

  const addNote = () => {
    if (!draft.trim()) return;
    updateApp((prev) => ({ ...prev, inbox: [...prev.inbox, { id: uid(), text: draft.trim() }] }));
    setDraft('');
  };

  const removeInbox = (id) => updateApp((prev) => ({ ...prev, inbox: prev.inbox.filter((n) => n.id !== id) }));

  const route = (note, dest) => {
    updateApp((prev) => {
      const withoutNote = prev.inbox.filter((n) => n.id !== note.id);
      if (dest === 'done') return { ...prev, inbox: withoutNote };
      if (dest === 'buy')
        return { ...prev, inbox: withoutNote, wishlist: [...prev.wishlist, { id: uid(), text: note.text, done: false }] };
      if (dest === 'schedule')
        return { ...prev, inbox: withoutNote, toSchedule: [...prev.toSchedule, { id: uid(), text: note.text }] };
      if (dest === 'professional' || dest === 'personal')
        return {
          ...prev,
          inbox: withoutNote,
          backlog: { ...prev.backlog, [dest]: [...prev.backlog[dest], { id: uid(), text: note.text }] },
        };
      return prev;
    });
    setOpenSorter(null);
  };

  const clearScheduled = (id) => updateApp((prev) => ({ ...prev, toSchedule: prev.toSchedule.filter((n) => n.id !== id) }));

  return (
    <div>
      <PixelCard>
        <SectionTitle emoji="🐣">Rough notes</SectionTitle>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNote()}
            placeholder="whatever's on your mind…"
            style={{ flex: 1, border: '2.5px solid var(--ink)', borderRadius: 5, padding: '8px 10px', fontSize: 14 }}
          />
          <PixelButton onClick={addNote} color="#8ECBE8">Add</PixelButton>
        </div>
        <div style={{ fontSize: 12, color: '#8B7A9E', marginTop: 8 }}>
          Dump it here now. Sort it later, tonight — tap a note to file it.
        </div>
      </PixelCard>

      <PixelCard>
        {app.inbox.length === 0 && <EmptyHint>Nothing sitting here right now 🌿</EmptyHint>}
        {app.inbox.map((note) => (
          <div key={note.id} style={{ marginBottom: 10 }}>
            <div
              onClick={() => setOpenSorter(openSorter === note.id ? null : note.id)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#F6F0FF',
                border: '2px solid var(--ink)',
                borderRadius: 5,
                padding: '8px 10px',
              }}
            >
              <span style={{ fontSize: 14 }}>{note.text}</span>
              <button onClick={(e) => { e.stopPropagation(); removeInbox(note.id); }} style={{ border: 'none', background: 'none', fontSize: 14, color: '#B7A6CC' }}>✕</button>
            </div>
            {openSorter === note.id && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                <PixelButton small color="#C7EBD1" onClick={() => route(note, 'done')}>✅ Done</PixelButton>
                <PixelButton small color="#FFE7A8" onClick={() => route(note, 'buy')}>🛒 Buy</PixelButton>
                <PixelButton small color="#B7DDF0" onClick={() => route(note, 'schedule')}>📅 Schedule</PixelButton>
                <PixelButton small color={CAT_META.professional.soft} onClick={() => route(note, 'professional')}>💼 Work list</PixelButton>
                <PixelButton small color={CAT_META.personal.soft} onClick={() => route(note, 'personal')}>🌿 Life list</PixelButton>
              </div>
            )}
          </div>
        ))}
      </PixelCard>

      {app.toSchedule.length > 0 && (
        <PixelCard style={{ background: '#EAF6FF' }}>
          <SectionTitle emoji="📅">Still needs a calendar slot</SectionTitle>
          {app.toSchedule.map((n) => (
            <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 14 }}>
              <span>{n.text}</span>
              <PixelButton small color="#C7EBD1" onClick={() => clearScheduled(n.id)}>Scheduled ✓</PixelButton>
            </div>
          ))}
        </PixelCard>
      )}
    </div>
  );
}

// ================= TODAY TAB =================

function TodayTab({ app, updateApp, commitments, setCommitments }) {
  return (
    <div>
      <CommitmentsStrip commitments={commitments} setCommitments={setCommitments} />
      {['professional', 'personal'].map((cat) => (
        <TodayColumn key={cat} cat={cat} app={app} updateApp={updateApp} />
      ))}
    </div>
  );
}

function CommitmentsStrip({ commitments, setCommitments }) {
  const [time, setTime] = useState('');
  const [title, setTitle] = useState('');

  const add = () => {
    if (!title.trim()) return;
    setCommitments([...commitments, { id: uid(), time: time.trim(), title: title.trim() }].sort((a, b) => a.time.localeCompare(b.time)));
    setTime('');
    setTitle('');
  };
  const remove = (id) => setCommitments(commitments.filter((c) => c.id !== id));

  return (
    <PixelCard style={{ background: '#E4F3FC' }}>
      <SectionTitle emoji="📌">Fixed today</SectionTitle>
      {commitments.length === 0 && <EmptyHint>No meetings or classes logged yet.</EmptyHint>}
      {commitments.map((c) => (
        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
          <span><strong>{c.time || '—'}</strong> &nbsp;{c.title}</span>
          <button onClick={() => remove(c.id)} style={{ border: 'none', background: 'none', color: '#B7A6CC' }}>✕</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="2pm" style={{ width: 60, border: '2px solid var(--ink)', borderRadius: 5, padding: '6px 8px', fontSize: 13 }} />
        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="supervisor meeting" style={{ flex: 1, border: '2px solid var(--ink)', borderRadius: 5, padding: '6px 8px', fontSize: 13 }} />
        <PixelButton small onClick={add} color="#8ECBE8">Add</PixelButton>
      </div>
    </PixelCard>
  );
}

function TodayColumn({ cat, app, updateApp }) {
  const meta = CAT_META[cat];
  const items = app.today[cat];
  const backlogItems = app.backlog[cat];
  const [draft, setDraft] = useState('');
  const [est, setEst] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const openSlots = 3 - items.length;

  const addDirect = () => {
    if (!draft.trim() || openSlots <= 0) return;
    updateApp((prev) => ({
      ...prev,
      today: { ...prev.today, [cat]: [...prev.today[cat], { id: uid(), text: draft.trim(), est: est.trim(), actual: '', done: false }] },
    }));
    setDraft('');
    setEst('');
  };

  const toggleDone = (id) =>
    updateApp((prev) => ({
      ...prev,
      today: { ...prev.today, [cat]: prev.today[cat].map((t) => (t.id === id ? { ...t, done: !t.done } : t)) },
    }));

  const setActual = (id, val) =>
    updateApp((prev) => ({
      ...prev,
      today: { ...prev.today, [cat]: prev.today[cat].map((t) => (t.id === id ? { ...t, actual: val } : t)) },
    }));

  const removeToday = (id) =>
    updateApp((prev) => ({ ...prev, today: { ...prev.today, [cat]: prev.today[cat].filter((t) => t.id !== id) } }));

  const pullFromBacklog = (item) =>
    updateApp((prev) => ({
      ...prev,
      backlog: { ...prev.backlog, [cat]: prev.backlog[cat].filter((b) => b.id !== item.id) },
      today: { ...prev.today, [cat]: [...prev.today[cat], { id: uid(), text: item.text, est: '', actual: '', done: false }] },
    }));

  return (
    <PixelCard>
      <SectionTitle emoji={meta.emoji}>{meta.label} — today ({items.length}/3)</SectionTitle>
      {items.length === 0 && <EmptyHint>Nothing picked yet. Pull something from your backlog.</EmptyHint>}
      {items.map((t) => (
        <div key={t.id} style={{ background: meta.soft, border: '2px solid var(--ink)', borderRadius: 5, padding: '8px 10px', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={t.done} onChange={() => toggleDone(t.id)} style={{ width: 16, height: 16 }} />
            <span style={{ flex: 1, fontSize: 14, textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.6 : 1 }}>{t.text}</span>
            <button onClick={() => removeToday(t.id)} style={{ border: 'none', background: 'none', color: '#8B7A9E' }}>✕</button>
          </div>
          {(t.est || t.done) && (
            <div style={{ display: 'flex', gap: 10, marginTop: 6, marginLeft: 24, fontSize: 12, color: '#5C4A70' }}>
              {t.est && <span>goal: {t.est}h</span>}
              {t.done && (
                <span>
                  actual:{' '}
                  <input
                    value={t.actual}
                    onChange={(e) => setActual(t.id, e.target.value)}
                    placeholder="?"
                    style={{ width: 32, border: '1.5px solid var(--ink)', borderRadius: 4, padding: '1px 4px', fontSize: 12 }}
                  />
                  h
                </span>
              )}
            </div>
          )}
        </div>
      ))}

      {openSlots > 0 && (
        <>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addDirect()} placeholder="add a task directly…" style={{ flex: 1, border: '2px solid var(--ink)', borderRadius: 5, padding: '6px 8px', fontSize: 13 }} />
            <input value={est} onChange={(e) => setEst(e.target.value)} placeholder="hrs" style={{ width: 44, border: '2px solid var(--ink)', borderRadius: 5, padding: '6px 6px', fontSize: 13 }} />
            <PixelButton small color={meta.color} onClick={addDirect}>Add</PixelButton>
          </div>
          {backlogItems.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <button onClick={() => setShowPicker(!showPicker)} style={{ border: 'none', background: 'none', fontSize: 12, color: '#5C4A70', fontWeight: 700, textDecoration: 'underline' }}>
                {showPicker ? 'hide backlog' : `pull from backlog (${backlogItems.length})`}
              </button>
              {showPicker && (
                <div style={{ marginTop: 6 }}>
                  {backlogItems.slice(0, openSlots + 5).map((b) => (
                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span>{b.text}</span>
                      <PixelButton small color="#EDE3FA" onClick={() => pullFromBacklog(b)}>+ Today</PixelButton>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </PixelCard>
  );
}

// ================= BACKLOG TAB =================

function BacklogTab({ app, updateApp }) {
  return (
    <div>
      {['professional', 'personal'].map((cat) => (
        <BacklogColumn key={cat} cat={cat} app={app} updateApp={updateApp} />
      ))}
    </div>
  );
}

function BacklogColumn({ cat, app, updateApp }) {
  const meta = CAT_META[cat];
  const items = app.backlog[cat];
  const [draft, setDraft] = useState('');
  const openSlots = 3 - app.today[cat].length;

  const add = () => {
    if (!draft.trim()) return;
    updateApp((prev) => ({ ...prev, backlog: { ...prev.backlog, [cat]: [...prev.backlog[cat], { id: uid(), text: draft.trim() }] } }));
    setDraft('');
  };
  const remove = (id) => updateApp((prev) => ({ ...prev, backlog: { ...prev.backlog, [cat]: prev.backlog[cat].filter((b) => b.id !== id) } }));
  const promote = (item) =>
    updateApp((prev) => ({
      ...prev,
      backlog: { ...prev.backlog, [cat]: prev.backlog[cat].filter((b) => b.id !== item.id) },
      today: { ...prev.today, [cat]: [...prev.today[cat], { id: uid(), text: item.text, est: '', actual: '', done: false }] },
    }));

  return (
    <PixelCard>
      <SectionTitle emoji={meta.emoji}>{meta.label} backlog</SectionTitle>
      {items.length === 0 && <EmptyHint>Nothing waiting here.</EmptyHint>}
      {items.map((b) => (
        <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: meta.soft, border: '2px solid var(--ink)', borderRadius: 5, padding: '7px 10px', marginBottom: 6 }}>
          <span style={{ fontSize: 14 }}>{b.text}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <PixelButton small color={meta.color} disabled={openSlots <= 0} onClick={() => promote(b)} title={openSlots <= 0 ? "Today's full — finish or clear something first" : ''}>
              → Today
            </PixelButton>
            <button onClick={() => remove(b.id)} style={{ border: 'none', background: 'none', color: '#8B7A9E' }}>✕</button>
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="add to backlog…" style={{ flex: 1, border: '2px solid var(--ink)', borderRadius: 5, padding: '6px 8px', fontSize: 13 }} />
        <PixelButton small color={meta.color} onClick={add}>Add</PixelButton>
      </div>
    </PixelCard>
  );
}

// ================= HABITS TAB =================

function HabitsTab({ habitsData, updateHabits }) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState(3);
  const wk = weekStartKey();
  const weekLog = habitsData.log[wk] || {};

  const addHabit = () => {
    if (!name.trim()) return;
    updateHabits((prev) => ({ ...prev, habits: [...prev.habits, { id: uid(), name: name.trim(), goal: Number(goal) || 1 }] }));
    setName('');
    setGoal(3);
  };
  const removeHabit = (id) => updateHabits((prev) => ({ ...prev, habits: prev.habits.filter((h) => h.id !== id) }));
  const bump = (id, delta) =>
    updateHabits((prev) => {
      const current = (prev.log[wk] && prev.log[wk][id]) || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, log: { ...prev.log, [wk]: { ...(prev.log[wk] || {}), [id]: next } } };
    });

  return (
    <div>
      <PixelCard style={{ background: '#FFF6DE' }}>
        <SectionTitle emoji="🐾">This week's habits</SectionTitle>
        {habitsData.habits.length === 0 && <EmptyHint>Add a habit below — tap the pixel heart each time you do it. No dates to feel guilty about, just a weekly count.</EmptyHint>}
        {habitsData.habits.map((h) => {
          const count = weekLog[h.id] || 0;
          const hit = count >= h.goal;
          return (
            <div key={h.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{h.name}</span>
                <button onClick={() => removeHabit(h.id)} style={{ border: 'none', background: 'none', color: '#B7A6CC' }}>✕</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <div style={{ display: 'flex', gap: 3 }}>
                  {Array.from({ length: h.goal }).map((_, i) => (
                    <span key={i} style={{ fontSize: 16 }}>{i < count ? '💛' : '🤍'}</span>
                  ))}
                  {count > h.goal && <span style={{ fontSize: 12, marginLeft: 4, color: '#5C4A70' }}>+{count - h.goal}</span>}
                </div>
                <PixelButton small color="#FFE7A8" onClick={() => bump(h.id, 1)}>+1</PixelButton>
                <PixelButton small color="#F1E7DB" onClick={() => bump(h.id, -1)}>−1</PixelButton>
                {hit && <span style={{ fontSize: 12, color: '#3D8A57', fontWeight: 700 }}>goal met ✓</span>}
              </div>
            </div>
          );
        })}
      </PixelCard>

      <PixelCard>
        <SectionTitle emoji="➕">New habit</SectionTitle>
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="gym, art class, clay…" style={{ flex: 1, border: '2px solid var(--ink)', borderRadius: 5, padding: '6px 8px', fontSize: 13 }} />
          <input type="number" min={1} value={goal} onChange={(e) => setGoal(e.target.value)} style={{ width: 54, border: '2px solid var(--ink)', borderRadius: 5, padding: '6px 6px', fontSize: 13 }} />
          <PixelButton small color="#FFE7A8" onClick={addHabit}>Add</PixelButton>
        </div>
        <div style={{ fontSize: 11, color: '#8B7A9E', marginTop: 4 }}>number = times per week</div>
      </PixelCard>
    </div>
  );
}

// ================= WISHLIST TAB =================

function WishlistTab({ app, updateApp }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    if (!draft.trim()) return;
    updateApp((prev) => ({ ...prev, wishlist: [...prev.wishlist, { id: uid(), text: draft.trim(), done: false }] }));
    setDraft('');
  };
  const toggle = (id) => updateApp((prev) => ({ ...prev, wishlist: prev.wishlist.map((w) => (w.id === id ? { ...w, done: !w.done } : w)) }));
  const remove = (id) => updateApp((prev) => ({ ...prev, wishlist: prev.wishlist.filter((w) => w.id !== id) }));

  return (
    <PixelCard>
      <SectionTitle emoji="🛒">Wishlist / to buy</SectionTitle>
      {app.wishlist.length === 0 && <EmptyHint>Empty for now.</EmptyHint>}
      {app.wishlist.map((w) => (
        <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <input type="checkbox" checked={w.done} onChange={() => toggle(w.id)} />
          <span style={{ flex: 1, fontSize: 14, textDecoration: w.done ? 'line-through' : 'none', opacity: w.done ? 0.55 : 1 }}>{w.text}</span>
          <button onClick={() => remove(w.id)} style={{ border: 'none', background: 'none', color: '#B7A6CC' }}>✕</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="add something to buy…" style={{ flex: 1, border: '2px solid var(--ink)', borderRadius: 5, padding: '6px 8px', fontSize: 13 }} />
        <PixelButton small color="#FFE7A8" onClick={add}>Add</PixelButton>
      </div>
    </PixelCard>
  );
}
