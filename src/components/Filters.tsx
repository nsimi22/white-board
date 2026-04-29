import { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useStore } from '../store/useStore';

interface Option {
  value: string;
  label: string;
  color?: string;
  avatar?: string;
}

interface MultiSelectProps {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
}

function MultiSelect({ label, options, selected, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  const count = selected.length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                    ${count > 0
                      ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-300 dark:border-indigo-500/50 text-indigo-700 dark:text-indigo-300'
                      : 'bg-white dark:bg-[#162244] border-slate-200 dark:border-[#1e2f57] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500'
                    }`}
      >
        {label}
        {count > 0 && (
          <span className="bg-indigo-600 text-white rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none">
            {count}
          </span>
        )}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-[#0d1526]
                        border border-slate-200 dark:border-[#1e2f57] rounded-xl shadow-xl dark:shadow-2xl z-50 py-1 max-h-64 overflow-y-auto">
          {options.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">No options</p>
          )}
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left
                          hover:bg-slate-50 dark:hover:bg-[#162244] transition-colors
                          ${selected.includes(opt.value) ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}
            >
              <div className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center
                               ${selected.includes(opt.value)
                                 ? 'bg-indigo-600 border-indigo-600'
                                 : 'border-slate-300 dark:border-[#334155]'}`}>
                {selected.includes(opt.value) && (
                  <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2">
                    <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              {opt.color && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: opt.color }} />}
              {opt.avatar && <img src={opt.avatar} alt="" className="w-4 h-4 rounded-full flex-shrink-0" />}
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Filters() {
  const { epics, filters, setFilters } = useStore();

  const statusOptions = useMemo<Option[]>(() => {
    const seen = new Map<string, Option>();
    epics.forEach((e) => {
      const cat = e.fields.status.statusCategory;
      if (!seen.has(cat.key)) {
        const color = cat.key === 'done' ? '#22c55e' : cat.key === 'indeterminate' ? '#3b82f6' : '#64748b';
        seen.set(cat.key, { value: cat.key, label: cat.name, color });
      }
    });
    return [...seen.values()];
  }, [epics]);

  const assigneeOptions = useMemo<Option[]>(() => {
    const seen = new Map<string, Option>();
    epics.forEach((e) => {
      if (e.fields.assignee) {
        const { accountId, displayName, avatarUrls } = e.fields.assignee;
        if (!seen.has(accountId))
          seen.set(accountId, { value: accountId, label: displayName, avatar: avatarUrls['48x48'] });
      }
    });
    if (epics.some((e) => !e.fields.assignee))
      seen.set('__unassigned__', { value: '__unassigned__', label: 'Unassigned' });
    return [...seen.values()];
  }, [epics]);

  const labelOptions = useMemo<Option[]>(() => {
    const seen = new Set<string>();
    epics.forEach((e) => e.fields.labels.forEach((l) => seen.add(l)));
    return [...seen].sort().map((l) => ({ value: l, label: l }));
  }, [epics]);

  const hasFilters = filters.status.length > 0 || filters.assignee.length > 0 || filters.labels.length > 0;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <MultiSelect label="Status" options={statusOptions} selected={filters.status} onChange={(v) => setFilters({ status: v })} />
      <MultiSelect label="Assignee" options={assigneeOptions} selected={filters.assignee} onChange={(v) => setFilters({ assignee: v })} />
      {labelOptions.length > 0 && (
        <MultiSelect label="Label" options={labelOptions} selected={filters.labels} onChange={(v) => setFilters({ labels: v })} />
      )}
      {hasFilters && (
        <button
          onClick={() => setFilters({ status: [], assignee: [], labels: [] })}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs
                     text-slate-500 dark:text-slate-500 hover:text-red-600 dark:hover:text-rose-400
                     hover:bg-red-50 dark:hover:bg-rose-500/10 transition-colors"
        >
          <X size={11} />
          Clear
        </button>
      )}
    </div>
  );
}
