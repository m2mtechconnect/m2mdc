import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Link as LinkIcon, 
  Globe, 
  Clock, 
  ExternalLink,
  Lightbulb,
  BookOpen,
  Download,
  Zap,
  TrendingUp,
  FileCheck,
  Library
} from "lucide-react";
import { formatDuration, formatPercentage, formatFileSize } from "@/lib/formatters";

interface SearchResult {
  type: "url" | "query" | "file";
  intent?: string;
  query: string;
  answer?: string;
  key_points?: string[];
  citations?: any[];
  sources?: any[];
  snapshot?: {
    title: string;
    url: string;
    content: string;
    headings: string[];
    bytes: number;
  };
  summary?: {
    summary: string;
    key_points: string[];
    topics: string[];
    faqs: Array<{ question: string; answer: string }>;
  };
  latency_ms?: number;
  needs_clarification?: boolean;
  clarifying_questions?: string[];
  confidence?: number;
  model?: string;
  grounded?: boolean;
  requestId?: string;
}

interface SearchResultsPanelProps {
  result: SearchResult;
  onAction?: (action: string, data?: any) => void;
}

export function SearchResultsPanel({ result, onAction }: SearchResultsPanelProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>(
    result.type === "url" ? "website" : "answer"
  );

  const isURL = result.type === "url";
  const isFile = result.type === "file";

  // Determine contextual actions based on intent
  const getContextualActions = () => {
    const actions = [];
    
    switch (result.intent) {
      case 'automation':
        actions.push({
          label: 'Open in AI System Builder',
          icon: Zap,
          action: () => navigate('/builder?template=blank&mode=create')
        });
        break;
      case 'kpi':
        actions.push({
          label: 'View in Analytics Dashboard',
          icon: TrendingUp,
          action: () => navigate('/analytics')
        });
        break;
      case 'compliance':
      case 'knowledge':
        actions.push({
          label: 'Add to Knowledge Library',
          icon: Library,
          action: () => onAction?.('add-to-library', result)
        });
        break;
      case 'website':
        actions.push({
          label: 'Save as Knowledge Source',
          icon: FileCheck,
          action: () => onAction?.('save-knowledge-source', result.snapshot?.url)
        });
        break;
    }
    
    return actions;
  };

  const contextualActions = getContextualActions();

  return (
    <Card className="section-padding">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            {isURL ? (
              <Globe className="h-5 w-5 text-primary" />
            ) : isFile ? (
              <FileText className="h-5 w-5 text-primary" />
            ) : (
              <Lightbulb className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-h4">
                {isURL ? "Website Analysis" : isFile ? "Document Processed" : "Gemini Answer"}
              </h3>
              {result.grounded && (
                <Badge variant="default" className="bg-primary">
                  Verified
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-caption text-muted-foreground mt-1">
              {result.latency_ms && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(result.latency_ms)}
                </span>
              )}
              {result.confidence && (
                <span>Confidence: {formatPercentage(result.confidence * 100, 0)}</span>
              )}
              {result.model && (
                <span className="text-primary">{result.model}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          {contextualActions.map((action, i) => (
            <Button 
              key={i}
              variant="default" 
              size="sm"
              onClick={action.action}
              className="glow-yellow"
            >
              <action.icon className="mr-2 h-4 w-4" />
              {action.label}
            </Button>
          ))}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onAction?.("save-report")}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="answer">
            <BookOpen className="mr-2 h-4 w-4" />
            Answer
          </TabsTrigger>
          <TabsTrigger value="sources">
            <FileText className="mr-2 h-4 w-4" />
            Sources
          </TabsTrigger>
          {isURL && (
            <TabsTrigger value="website">
              <Globe className="mr-2 h-4 w-4" />
              Website Snapshot
            </TabsTrigger>
          )}
        </TabsList>

        {/* Answer Tab */}
        <TabsContent value="answer" className="space-y-6">
          {isURL ? (
            // URL Summary
            <div className="space-y-6">
              <div>
                <h4 className="text-h5 mb-3">Summary</h4>
                <p className="text-body">{result.summary?.summary}</p>
              </div>

              {result.summary?.key_points && result.summary.key_points.length > 0 && (
                <div>
                  <h4 className="text-h5 mb-3">Key Points</h4>
                  <ul className="space-y-2">
                    {result.summary.key_points.map((point, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="text-primary mt-1">•</span>
                        <span className="text-body">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.summary?.topics && result.summary.topics.length > 0 && (
                <div>
                  <h4 className="text-h5 mb-3">Topics Covered</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.summary.topics.map((topic, i) => (
                      <Badge key={i} variant="secondary">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.summary?.faqs && result.summary.faqs.length > 0 && (
                <div>
                  <h4 className="text-h5 mb-3">FAQs</h4>
                  <div className="space-y-4">
                    {result.summary.faqs.map((faq, i) => (
                      <div key={i} className="border-l-2 border-primary pl-4">
                        <p className="text-body font-medium mb-2">{faq.question}</p>
                        <p className="text-body text-muted-foreground">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Query Answer
            <div className="space-y-6">
              <div>
                <p className="text-body whitespace-pre-wrap">{result.answer}</p>
              </div>

              {result.key_points && result.key_points.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="text-h5 mb-3 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Key Takeaways
                  </h4>
                  <ul className="space-y-2">
                    {result.key_points.map((point, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="text-primary mt-1">•</span>
                        <span className="text-body">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.needs_clarification && result.clarifying_questions && (
                <div className="bg-warning/10 border border-warning rounded-lg p-4">
                  <h4 className="text-h5 mb-3">Need more information</h4>
                  <ul className="space-y-2">
                    {result.clarifying_questions.map((q, i) => (
                      <li key={i} className="text-body">{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Sources Tab */}
        <TabsContent value="sources" className="space-y-4">
          {(result.citations || result.sources || []).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No sources available
            </p>
          ) : (
            <div className="space-y-4">
              {(result.citations || result.sources)?.map((source: any, i: number) => (
                <Card key={i} className="p-4 hover:bg-muted/50 transition-smooth">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{source.source_type || source.source_name}</Badge>
                        {source.relevance && (
                          <span className="text-caption text-muted-foreground">
                            {source.relevance}
                          </span>
                        )}
                      </div>
                      <h4 className="text-body font-medium mb-2">{source.title}</h4>
                      <p className="text-caption text-muted-foreground line-clamp-2">
                        {source.content?.substring(0, 200)}...
                      </p>
                    </div>
                    {source.url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={source.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Website Snapshot Tab */}
        {isURL && result.snapshot && (
          <TabsContent value="website" className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-h4 mb-2">{result.snapshot.title}</h3>
                  <a 
                    href={result.snapshot.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-caption text-primary hover:underline flex items-center gap-2"
                  >
                    <LinkIcon className="h-4 w-4" />
                    {result.snapshot.url}
                  </a>
                </div>
                <Badge variant="outline">
                  {formatFileSize(result.snapshot.bytes)}
                </Badge>
              </div>

              {result.snapshot.headings && result.snapshot.headings.length > 0 && (
                <div>
                  <h4 className="text-h5 mb-3">Page Outline</h4>
                  <ul className="space-y-2">
                    {result.snapshot.headings.map((heading, i) => (
                      <li key={i} className="text-body pl-4 border-l-2 border-muted">
                        {heading}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h4 className="text-h5 mb-3">Content Preview</h4>
                <div className="bg-muted/30 rounded-lg p-4 max-h-96 overflow-auto">
                  <p className="text-caption whitespace-pre-wrap">
                    {result.snapshot.content}
                  </p>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => onAction?.("index-site", result.snapshot?.url)}
              >
                <Globe className="mr-2 h-4 w-4" />
                Index This Site (Deeper Crawl)
              </Button>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </Card>
  );
}
