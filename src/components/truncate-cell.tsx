'use client';

import { TableCell } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TruncateCellProps {
  content: string;
  maxWidth?: string;
  className?: string;
}

export function TruncateCell({ content, maxWidth = '200px', className = '' }: TruncateCellProps) {
  return (
    <TableCell className={`text-sm text-muted-foreground ${className}`}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="truncate" style={{ maxWidth }}>
            {content || '--'}
          </div>
        </TooltipTrigger>
        {content && (
          <TooltipContent side="top" className="max-w-[400px] whitespace-normal break-words">
            {content}
          </TooltipContent>
        )}
      </Tooltip>
    </TableCell>
  );
}

interface TruncateDivProps {
  content: string;
  maxWidth?: string;
  className?: string;
}

export function TruncateDiv({ content, maxWidth = '200px', className = '' }: TruncateDivProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`truncate ${className}`} style={{ maxWidth }}>
          {content || '--'}
        </div>
      </TooltipTrigger>
      {content && (
        <TooltipContent side="top" className="max-w-[400px] whitespace-normal break-words">
          {content}
        </TooltipContent>
      )}
    </Tooltip>
  );
}
