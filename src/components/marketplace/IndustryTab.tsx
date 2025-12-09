import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarketplaceStore, IndustryApp } from '@/stores/marketplaceStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Plug, CheckCircle2, XCircle, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface IndustryTabProps {
  searchQuery: string;
}

export function IndustryTab({ searchQuery }: IndustryTabProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { industries, selectForBuilder } = useMarketplaceStore();
  const [selectedApp, setSelectedApp] = useState<IndustryApp | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredApps = industries.filter((app) => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || app.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(industries.map(a => a.category)));

  const handleConnect = (appId: string) => {
    // Navigate to integrations page to set up Zapier connection
    navigate(`/integrations?connect=${appId}`);
  };

  const handleAddToWorkflow = async (appId: string) => {
    try {
      // Get current system from URL or create new one
      const systemId = new URLSearchParams(window.location.search).get('systemId');
      
      if (!systemId) {
        toast({
          title: 'No System Selected',
          description: 'Please create a system in the Builder first',
          variant: 'destructive',
        });
        return;
      }

      const result = await selectForBuilder({
        type: 'industry',
        id: appId,
        system_id: systemId,
      });

      if (result.success && result.nextStep) {
        navigate(result.nextStep);
        toast({ title: 'Success', description: 'App added to your workflow' });
      }
    } catch (error) {
      console.error('Error adding to workflow:', error);
      toast({ title: 'Error', description: 'Failed to add app to workflow', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Apps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredApps.map((app) => (
          <Card key={app.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{app.name}</CardTitle>
                  <Badge variant="secondary" className="mt-2">
                    {app.category}
                  </Badge>
                </div>
                {app.logo && (
                  <img src={app.logo} alt={app.name} className="h-12 w-12 object-contain" />
                )}
              </div>
              <CardDescription className="mt-2 line-clamp-2">
                {app.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {app.status === 'connected' ? (
                  <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Connected
                  </Badge>
                )}
                {app.zapier_enabled && (
                  <Badge variant="outline">Zapier</Badge>
                )}
              </div>
            </CardContent>
            <CardFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedApp(app)}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              {app.status === 'connected' ? (
                <Button
                  size="sm"
                  onClick={() => handleAddToWorkflow(app.id)}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Workflow
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleConnect(app.id)}
                  className="flex-1"
                >
                  <Plug className="h-4 w-4 mr-2" />
                  Connect
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {filteredApps.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No apps found matching your criteria
        </div>
      )}

      {/* Preview Modal */}
      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-4">
              {selectedApp?.logo && (
                <img src={selectedApp.logo} alt={selectedApp.name} className="h-16 w-16 object-contain" />
              )}
              <div>
                <DialogTitle className="text-2xl">{selectedApp?.name}</DialogTitle>
                <DialogDescription>{selectedApp?.provider}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{selectedApp?.description}</p>
            </div>
            {selectedApp?.capabilities && selectedApp.capabilities.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Capabilities</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {selectedApp.capabilities.map((cap: string, idx: number) => (
                    <li key={idx}>{cap}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <h3 className="font-semibold mb-2">Connection Status</h3>
              <Badge className={selectedApp?.status === 'connected' ? 'bg-green-500/10 text-green-700' : ''}>
                {selectedApp?.status === 'connected' ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Connected
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Connected
                  </>
                )}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setSelectedApp(null)}
              className="flex-1"
            >
              Close
            </Button>
            {selectedApp?.status === 'connected' ? (
              <Button
                onClick={() => {
                  if (selectedApp) {
                    handleAddToWorkflow(selectedApp.id);
                    setSelectedApp(null);
                  }
                }}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add to Workflow
              </Button>
            ) : (
              <Button
                onClick={() => {
                  if (selectedApp) {
                    handleConnect(selectedApp.id);
                    setSelectedApp(null);
                  }
                }}
                className="flex-1"
              >
                <Plug className="h-4 w-4 mr-2" />
                Connect via Zapier
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
