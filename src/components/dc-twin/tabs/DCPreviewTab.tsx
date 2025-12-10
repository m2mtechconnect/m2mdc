/**
 * DC Twin Preview Tab
 * Shows intelligence configuration and sample queries
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Bot, Brain, MessageSquare, Sparkles, Send, Zap, Database,
  Thermometer, DollarSign, Shield, AlertTriangle
} from 'lucide-react';
import { useDCTwinBuilderStore } from '@/stores/dcTwinBuilderStore';

const capabilityIcons: Record<string, React.ReactNode> = {
  'HPC/GPU': <Zap className="h-4 w-4" />,
  'Energy': <Thermometer className="h-4 w-4" />,
  'Emissions': <Sparkles className="h-4 w-4" />,
  'Compliance': <Shield className="h-4 w-4" />,
  'Incidents': <AlertTriangle className="h-4 w-4" />,
};

export function DCPreviewTab() {
  const { overview, intelligence } = useDCTwinBuilderStore();
  const [query, setQuery] = useState('');
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);
  
  const capabilities = [
    { id: 'hpc', name: 'HPC/GPU', description: 'GPU utilization, queue management, tenant workloads' },
    { id: 'energy', name: 'Energy', description: 'PUE monitoring, power optimization, load balancing' },
    { id: 'emissions', name: 'Emissions', description: 'Carbon tracking, renewable mix, sustainability' },
    { id: 'compliance', name: 'Compliance', description: 'Data sovereignty, PIPEDA, audit trails' },
    { id: 'incidents', name: 'Incidents', description: 'Alert management, root cause analysis, playbooks' },
  ];
  
  const handleSendQuery = () => {
    if (query.trim()) {
      console.log('Sending query:', query);
      // In real implementation, this would call the CoPilot
      setQuery('');
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Chat With This Digital Twin</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                Powered by CoPilot • {overview.twinName}
              </p>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            Ask questions about your data centre operations, get insights, and receive actionable recommendations.
          </p>
          
          {/* Capabilities */}
          <div className="flex flex-wrap gap-2">
            {capabilities.map((cap) => (
              <Badge 
                key={cap.id} 
                variant="secondary" 
                className="gap-1 cursor-help"
                title={cap.description}
              >
                {capabilityIcons[cap.name] || <Database className="h-3 w-3" />}
                {cap.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Intelligence Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Intelligence Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">LLM Provider</p>
              <p className="font-medium">{intelligence.llmProvider}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Model</p>
              <p className="font-medium text-sm">{intelligence.llmModel}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Temperature</p>
              <p className="font-medium">{intelligence.temperature}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">RAG</p>
              <Badge variant={intelligence.ragEnabled ? 'default' : 'secondary'}>
                {intelligence.ragEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Sample Queries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Sample Queries
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            {intelligence.sampleQueries.map((sampleQuery, i) => (
              <button
                key={i}
                onClick={() => {
                  setSelectedQuery(sampleQuery);
                  setQuery(sampleQuery);
                }}
                className={`p-3 rounded-lg border text-left text-sm transition-all hover:border-primary/50 hover:bg-primary/5 ${
                  selectedQuery === sampleQuery ? 'border-primary bg-primary/10' : ''
                }`}
              >
                <Sparkles className="h-4 w-4 text-primary mb-2" />
                {sampleQuery}
              </button>
            ))}
          </div>
          
          {/* Query Input */}
          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about your data centre..."
              onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}
            />
            <Button onClick={handleSendQuery} className="gap-2">
              <Send className="h-4 w-4" />
              Ask
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* System Prompt Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-4 rounded-lg font-mono">
            {intelligence.systemPrompt}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
