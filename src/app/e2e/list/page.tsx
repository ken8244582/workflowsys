import { Card, CardContent } from '@/components/ui/card';

export default function E2EListPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-8 w-1.5 rounded-full bg-[#1e3a5f]" />
        <h2 className="text-xl font-semibold text-[#1e3a5f]">端到端流程清单</h2>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex h-[50vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-muted-foreground">数据接入中</p>
            <p className="mt-1 text-xs text-muted-foreground/70">端到端流程清单数据正在准备中，请稍后访问</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
