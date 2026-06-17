'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function PaginationBar({
  page, totalPages, total, pageSize, pageSizeOptions,
  onPageChange, onPageSizeChange, showTotal = true
}: {
  page: number; totalPages: number; total: number;
  pageSize: number; pageSizeOptions: number[];
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  showTotal?: boolean;
}) {
  const [inputPage, setInputPage] = useState(String(page));
  useEffect(() => { setInputPage(String(page)); }, [page]);

  const handleJump = () => {
    const p = parseInt(inputPage);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      onPageChange(p);
    } else {
      setInputPage(String(page));
    }
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-3">
        {showTotal && <span className="text-sm text-gray-500">共 {total} 条</span>}
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-500">每页</span>
          <Select value={String(pageSize)} onValueChange={v => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-7 w-[88px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map(s => (
                <SelectItem key={s} value={String(s)}>{s}条</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => onPageChange(1)}>«</Button>
        <Button variant="outline" size="sm" className="h-7 px-2" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>‹</Button>
        {getPageNumbers().map((p, i) =>
          typeof p === 'string' ? (
            <span key={`e${i}`} className="px-1 text-gray-400 text-sm">...</span>
          ) : (
            <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" className="h-7 w-7 p-0 text-xs"
              onClick={() => onPageChange(p)}
              style={p === page ? { backgroundColor: '#1e3a5f' } : undefined}>
              {p}
            </Button>
          )
        )}
        <Button variant="outline" size="sm" className="h-7 px-2" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>›</Button>
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)}>»</Button>
        <div className="flex items-center gap-1 ml-2">
          <span className="text-xs text-gray-500">跳至</span>
          <Input className="h-7 w-12 text-xs text-center" value={inputPage}
            onChange={e => setInputPage(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleJump(); }}
            onBlur={handleJump} />
          <span className="text-xs text-gray-500">页</span>
        </div>
      </div>
    </div>
  );
}
