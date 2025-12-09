import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bug, X } from 'lucide-react';
import { RecommendationData } from '@/types/recommendation';

interface RecommendationDebugPanelProps {
  recommendationData: RecommendationData | null | undefined;
}

export function RecommendationDebugPanel({ recommendationData }: RecommendationDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        size="sm"
        variant="outline"
        className="fixed top-4 left-4 z-50 gap-2"
      >
        <Bug className="w-4 h-4" />
        Debug Reco
      </Button>
    );
  }

  const hasData = recommendationData != null;
  const isMalformed = hasData && (
    (recommendationData as any)._type === 'undefined' ||
    Object.values(recommendationData).every(v => v === undefined || v === null)
  );

  return (
    <Card className="fixed top-16 left-4 z-50 w-96 max-h-[600px] overflow-auto shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Recommendation Debug</CardTitle>
        <Button onClick={() => setIsOpen(false)} size="sm" variant="ghost">
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Status</div>
          <div className={`text-sm font-semibold ${hasData ? 'text-green-600' : 'text-orange-600'}`}>
            {hasData ? (isMalformed ? '⚠️ Malformed Data' : '✅ Has Data') : '❌ No Data'}
          </div>
        </div>

        {hasData && (
          <>
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Type</div>
              <div className="text-sm">{isMalformed ? 'Malformed Object' : 'Valid RecommendationData'}</div>
            </div>

            {!isMalformed && (
              <>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">ID</div>
                  <div className="text-sm font-mono">{recommendationData?.id || 'N/A'}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Source</div>
                  <div className="text-sm">{recommendationData?.source || 'N/A'}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Title</div>
                  <div className="text-sm">{recommendationData?.title || 'N/A'}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Problem</div>
                  <div className="text-sm line-clamp-3">{recommendationData?.problem || 'N/A'}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Solution</div>
                  <div className="text-sm line-clamp-3">{recommendationData?.solution || 'N/A'}</div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Raw Data</div>
              <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(recommendationData, null, 2)}
              </pre>
            </div>
          </>
        )}

        {!hasData && (
          <div className="text-sm text-muted-foreground">
            No recommendation data found. This agent may have been created:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Before recommendation tracking</li>
              <li>Manually without a recommendation</li>
              <li>From a template</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
