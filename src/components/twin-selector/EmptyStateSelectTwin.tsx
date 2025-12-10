/**
 * EmptyStateSelectTwin - Displayed when no twin is selected
 * Prompts user to select or create a data centre
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateSelectTwinProps {
  title?: string;
  description?: string;
  showCreateButton?: boolean;
}

export function EmptyStateSelectTwin({ 
  title = "Select a Data Centre",
  description = "Choose a data centre from the header dropdown to view dashboards, simulations, and blueprints.",
  showCreateButton = true
}: EmptyStateSelectTwinProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <Card className="max-w-md w-full border-dashed">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="mb-6 relative">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            
            {/* Arrow pointing up to header */}
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full">
              <ArrowUp className="h-6 w-6 text-muted-foreground animate-bounce" />
            </div>
          </div>
          
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            {description}
          </p>
          
          {showCreateButton && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                variant="outline" 
                onClick={() => navigate('/build')}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Create New Data Centre Twin
              </Button>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground mt-6">
            Use the dropdown in the header to switch between data centres
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
