import React, { useState, useEffect } from 'react';
import { PlusCircle, BarChart2, X, Circle, CheckCircle2 } from 'lucide-react';
import { TabNotesStats } from './TabNotesStats';
import { getTranslation, Language } from '../utils/i18n';

interface LocalTask {
  id: string;
  name: string;
  done: boolean;
  due_date: string | null;
  rollover_count: number;
  created_at_unix_s: number;
  completed_at_unix_s: number | null;
}

interface TabNotesProps {
  onCountChange: (count: number) => void;
  language: Language;
}

export const TabNotes: React.FC<TabNotesProps> = ({ onCountChange, language }) => {
  const t = getTranslation(language);
  const [todos, setTodos] = useState<LocalTask[]>([]);
  const [input, setInput] = useState('');
  const [showStats, setShowStats] = useState(false);

  const isTauri = !!(window as any).__TAURI__;

  // Load Todos from SQLite Local DB or LocalStorage Mock
  const fetchTodos = async () => {
    const today = new Date().toISOString().split('T')[0];
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const list = await invoke<LocalTask[]>('get_local_tasks', { today });
        setTodos(list);
      } catch (err) {
        console.error('Failed to fetch local tasks:', err);
      }
    } else {
      const saved = localStorage.getItem('local_tasks_mock');
      if (saved) {
        const list: LocalTask[] = JSON.parse(saved);
        const filtered = list.filter((t) => t.done || !t.due_date || t.due_date <= today);
        setTodos(filtered);
      } else {
        setTodos([]);
        localStorage.setItem('local_tasks_mock', JSON.stringify([]));
      }
    }
  };

  useEffect(() => {
    fetchTodos();
    const intervalId = setInterval(fetchTodos, 3000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const activeCount = todos.filter((t) => !t.done).length;
    onCountChange(activeCount);
  }, [todos]);

  const addNote = async () => {
    if (!input.trim()) return;

    // Check limit
    const activeCount = todos.filter((t) => !t.done).length;
    if (activeCount >= 3) return;

    const today = new Date().toISOString().split('T')[0];

    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('add_local_task', { name: input.trim(), dueDate: today, today });
        fetchTodos();
      } catch (err) {
        console.error('Failed to save local task:', err);
      }
    } else {
      const newTodo: LocalTask = {
        id: `task_${crypto.randomUUID()}`,
        name: input.trim(),
        done: false,
        due_date: today,
        rollover_count: 0,
        created_at_unix_s: Math.floor(Date.now() / 1000),
        completed_at_unix_s: null,
      };
      setTodos((prev) => {
        const next = [...prev, newTodo];
        localStorage.setItem('local_tasks_mock', JSON.stringify(next));
        return next;
      });
    }
    setInput('');
  };

  const toggleNote = async (id: string) => {
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('toggle_local_task', { id });
        fetchTodos();
      } catch (err) {
        console.error('Failed to update local task:', err);
      }
    } else {
      // Mock toggle on web (+1 day recurrence)
      setTodos((prev) => {
        const todo = prev.find((t) => t.id === id);
        if (!todo) return prev;

        const updated = {
          ...todo,
          done: !todo.done,
          completed_at_unix_s: !todo.done ? Math.floor(Date.now() / 1000) : null,
        };

        let next = prev.map((t) => (t.id === id ? updated : t));

        // Create recurrence mock
        if (updated.done && updated.due_date) {
          const parts = updated.due_date.split('-');
          if (parts.length === 3) {
            const d = new Date(updated.due_date);
            d.setDate(d.getDate() + 1);
            const nextDateStr = d.toISOString().split('T')[0];

            // Check if already exists to prevent duplicate breeding in mock
            const exists = next.some(t => t.name === updated.name && t.due_date === nextDateStr);
            if (!exists) {
              const activeCount = next.filter((t) => !t.done).length;
              if (activeCount < 3) {
                const recurringTask: LocalTask = {
                  id: `task_${crypto.randomUUID()}`,
                  name: updated.name,
                  done: false,
                  due_date: nextDateStr,
                  rollover_count: 0,
                  created_at_unix_s: Math.floor(Date.now() / 1000),
                  completed_at_unix_s: null,
                };
                next = [recurringTask, ...next];
              }
            }
          }
        }

        localStorage.setItem('local_tasks_mock', JSON.stringify(next));
        return next;
      });
    }
  };

  const deleteNote = async (id: string) => {
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('delete_local_task', { id });
        setTodos((prev) => prev.filter((t) => t.id !== id));
      } catch (err) {
        console.error('Failed to delete local task:', err);
      }
    } else {
      setTodos((prev) => {
        const next = prev.filter((t) => t.id !== id);
        localStorage.setItem('local_tasks_mock', JSON.stringify(next));
        return next;
      });
    }
  };

  const formatTime = (unixS: number | null) => {
    if (!unixS) return '';
    const date = new Date(unixS * 1000);
    const hrs = date.getHours().toString().padStart(2, '0');
    const mins = date.getMinutes().toString().padStart(2, '0');
    return `${hrs}:${mins}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') addNote();
    if (e.key === 'Escape') setInput('');
  };

  const activeTasks = todos.filter((t) => !t.done);
  const limitReached = activeTasks.length >= 3;

  if (showStats) {
    return <TabNotesStats onBack={() => setShowStats(false)} language={language} />;
  }

  return (
    <div className="flex flex-col gap-3 w-full max-h-[240px]">
      {/* Header with Stats Toggle */}
      <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
        <span className="text-[12px] font-black uppercase tracking-widest text-white/40">{t.tasksTitle}</span>
        <button
          onClick={() => setShowStats(true)}
          className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white transition-all text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-white/5"
        >
          <BarChart2 className="w-3.5 h-3.5 text-success-color" />
          {t.tasksStats}
        </button>
      </div>

      {/* List */}
      <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar flex-grow pr-1">
        {todos.map((todo) => {
          const isDone = todo.done;
          return (
            <div
              key={todo.id}
              className={`group flex items-center justify-between px-3 py-2 rounded-md transition-all duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
                isDone
                  ? 'bg-white/[0.01] border border-white/[0.02] hover:bg-white/[0.04] opacity-60'
                  : 'bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  onClick={() => toggleNote(todo.id)}
                  className="focus:outline-none transition-transform hover:scale-110 active:scale-95 flex-shrink-0"
                >
                  {isDone ? (
                    <CheckCircle2 className="w-[18px] h-[18px] text-success-color fill-success-color/10" />
                  ) : (
                    <Circle className="w-[18px] h-[18px] text-white/30 hover:text-success-color hover:border-success-color" />
                  )}
                </button>
                <span className={`text-[13px] truncate mr-2 ${isDone ? 'line-through text-text-secondary/60' : 'text-white/90'}`}>
                  {todo.name}
                </span>
                {/* Rollover Badge */}
                {!isDone && todo.rollover_count > 0 && (
                  <span className={`text-[9.5px] px-1.5 py-0.5 rounded font-black font-mono tracking-wider flex-shrink-0 ${
                    todo.rollover_count >= 3
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                  }`}>
                    {t.tasksRollover} {todo.rollover_count}/3
                  </span>
                )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {isDone && todo.completed_at_unix_s && (
                <span className="text-[10px] text-white/35 font-mono select-none" title="Completion time">
                  {formatTime(todo.completed_at_unix_s)}
                </span>
              )}
              <button
                onClick={() => deleteNote(todo.id)}
                className="text-red-500 hover:scale-110 active:scale-95 opacity-0 group-hover:opacity-100 transition-all duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
                title="Delete task"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition-all duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
        limitReached
          ? 'bg-red-500/[0.02] border-red-500/20'
          : 'bg-white/[0.02] border-white/[0.04] focus-within:border-success-color focus-within:border-dashed'
      }`}>
        <PlusCircle
          onClick={addNote}
          className={`w-[18px] h-[18px] transition-all duration-[400ms] ${
            limitReached
              ? 'text-red-500/40 cursor-not-allowed'
              : 'text-text-secondary hover:text-success-color hover:scale-110 active:scale-95 cursor-pointer'
          }`}
        />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={limitReached}
          placeholder={limitReached ? t.tasksLimitReached : t.tasksPlaceholder}
          className={`flex-grow bg-transparent border-none text-[13px] outline-none transition-colors ${
            limitReached ? 'text-red-400/60 placeholder-red-400/40' : 'text-white placeholder-text-secondary'
          }`}
        />
        {!limitReached && (
          <div className="flex items-center gap-1 text-[10px] text-white/30 font-medium select-none pr-1 flex-shrink-0">
            <span>↵ {t.tasksAdd}</span>
            <span className="text-white/10 font-bold">·</span>
            <span>{t.tasksEsc}</span>
          </div>
        )}
      </div>
    </div>
  );
};
