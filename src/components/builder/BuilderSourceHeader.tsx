import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useBuilderSelectionStore } from '@/stores/builderSelectionStore';
import { ArrowLeft, Package, Layers, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function BuilderSourceHeader() {
  const navigate = useNavigate();
  const { selection, normalizedApp } = useBuilderSelectionStore();

  if (!selection || !normalizedApp) return null;

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'templates':
        return 'M2M Templates';
      case 'industry':
        return 'Industry Marketplace';
      case 'mcp':
        return 'MCP Servers';
      default:
        return 'Marketplace';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'template':
        return <Package className="h-3 w-3" />;
      case 'agent':
        return <Layers className="h-3 w-3" />;
      case 'mcp':
        return <Server className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getMarketplaceUrl = () => {
    return `/marketplace?tab=${selection.originTab}`;
  };

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(getMarketplaceUrl())}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Marketplace
            </Button>
            
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/marketplace">Marketplace</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href={getMarketplaceUrl()}>
                    {getTabLabel(selection.originTab || '')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{normalizedApp.name}</BreadcrumbPage>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Builder</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-2">
              {getIcon(normalizedApp.type)}
              <span>From: {getTabLabel(selection.originTab || '')}</span>
              {normalizedApp.version && (
                <>
                  <span>•</span>
                  <span className="text-xs">{normalizedApp.version}</span>
                </>
              )}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
