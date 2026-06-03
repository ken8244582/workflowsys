'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  allLabel?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = '请选择',
  allLabel = '全部',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  const toggleAll = () => {
    onChange(selected.length === options.length ? [] : [...options]);
  };

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((s) => s !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const displayText =
    selected.length === 0
      ? placeholder
      : selected.length === options.length
        ? allLabel
        : selected.length <= 2
          ? selected.join('、')
          : `${selected[0]}等${selected.length}项`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          setSearch('');
        }}
        className="flex items-center justify-between w-full h-8 px-2.5 text-xs border border-gray-200 rounded bg-white hover:border-gray-300 transition-colors"
      >
        <span
          className={`truncate ${selected.length === 0 ? 'text-gray-400' : 'text-gray-700'}`}
        >
          {displayText}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0 ml-1" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索..."
              className="w-full h-7 px-2 text-xs border border-gray-200 rounded focus:outline-none focus:border-blue-400"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            <label className="flex items-center px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
              <span
                className={`w-4 h-4 rounded border flex items-center justify-center mr-2 text-xs ${
                  selected.length === options.length
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300'
                }`}
              >
                {selected.length === options.length && <Check className="h-3 w-3" />}
              </span>
              <span className="text-xs text-gray-600 font-medium">{allLabel}</span>
            </label>
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-400 text-center">
                无匹配项
              </div>
            )}
            {filtered.map((opt) => (
              <label
                key={opt}
                className="flex items-center px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
              >
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center mr-2 text-xs ${
                    selected.includes(opt)
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-300'
                  }`}
                >
                  {selected.includes(opt) && <Check className="h-3 w-3" />}
                </span>
                <span className="text-xs text-gray-700 truncate">{opt}</span>
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <div className="border-t border-gray-100 p-2 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                已选 {selected.length} 项
              </span>
              <button
                type="button"
                onClick={() => {
                  onChange([]);
                  setSearch('');
                }}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                清除
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
