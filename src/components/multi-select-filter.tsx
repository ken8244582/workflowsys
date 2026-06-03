'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

interface MultiSelectFilterProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export function MultiSelectFilter({ label, options, selected, onChange, placeholder }: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    if (!search) return options;
    const s = search.toLowerCase();
    return options.filter(o => o.toLowerCase().includes(s));
  }, [options, search]);

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter(s => s !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const selectAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  const displayText = selected.length === 0
    ? (placeholder || `选择${label}`)
    : selected.length === 1
      ? selected[0]
      : `${label}(${selected.length})`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(''); }}
        className={`h-7 px-2 text-xs rounded border flex items-center gap-1 min-w-[100px] max-w-[160px] cursor-pointer ${
          selected.length > 0
            ? 'border-blue-400 bg-blue-50 text-blue-700'
            : 'border-slate-300 bg-white text-slate-600'
        }`}
      >
        <span className="truncate flex-1 text-left">{displayText}</span>
        <svg className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 top-8 left-0 bg-white border border-slate-200 rounded-md shadow-lg min-w-[180px] max-h-[280px] flex flex-col">
          <div className="p-1.5 border-b border-slate-100">
            <input
              type="text"
              className="w-full h-6 px-2 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-400"
              placeholder={`搜索${label}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="px-1.5 py-1 border-b border-slate-100">
            <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer hover:text-slate-700">
              <input
                type="checkbox"
                className="w-3 h-3 accent-blue-500"
                checked={selected.length === options.length && options.length > 0}
                ref={el => {
                  if (el) el.indeterminate = selected.length > 0 && selected.length < options.length;
                }}
                onChange={selectAll}
              />
              全选
            </label>
          </div>
          <div className="overflow-y-auto flex-1 max-h-[200px]">
            {filtered.length === 0 ? (
              <div className="px-2 py-3 text-xs text-slate-400 text-center">无匹配项</div>
            ) : (
              filtered.map(opt => (
                <label key={opt} className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-700 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    className="w-3 h-3 accent-blue-500"
                    checked={selected.includes(opt)}
                    onChange={() => toggle(opt)}
                  />
                  <span className="truncate">{opt}</span>
                </label>
              ))
            )}
          </div>
          {selected.length > 0 && (
            <div className="p-1.5 border-t border-slate-100">
              <button
                type="button"
                className="w-full text-xs text-red-500 hover:text-red-600 py-0.5"
                onClick={() => { onChange([]); }}
              >
                清除筛选
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
