import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCatalogStore } from '@/stores/catalogStore';
import { DigitalTwinTemplatesGrid } from '@/components/marketplace/DigitalTwinTemplatesGrid';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { StandardFilters, StandardFiltersState } from '@/components/shared/StandardFilters';
import { useCoPilotContext } from '@/contexts/CoPilotContext';

export default function Marketplace() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { updateContext } = useCoPilotContext();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [filters, setFilters] = useState<StandardFiltersState>({
    searchQuery: '',
    industryFilter: 'all',
    departmentFilter: 'all',
    typeFilter: 'all',
    levelFilter: 'all',
    showRecommended: false,
  });
  
  const { industryTemplates, loadIndustryTemplates } = useCatalogStore();

  // Update Co-Pilot context
  useEffect(() => {
    updateContext({
      activePage: 'template_library',
      industry: filters.industryFilter !== 'all' ? filters.industryFilter : undefined,
      department: filters.departmentFilter !== 'all' ? filters.departmentFilter : undefined,
    });
  }, [filters.industryFilter, filters.departmentFilter, updateContext]);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.warn('Marketplace: Authentication check failed:', error?.message || 'No session');
        navigate('/auth', { replace: true });
        return;
      }
      
      setIsAuthenticated(true);
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth', { replace: true });
      } else {
        setIsAuthenticated(!!session);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      loadIndustryTemplates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleClearFilters = () => {
    setFilters({
      searchQuery: '',
      industryFilter: 'all',
      departmentFilter: 'all',
      typeFilter: 'all',
      levelFilter: 'all',
      showRecommended: false,
    });
  };

  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-6 py-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold font-display text-foreground mb-1">
              {t('marketplace.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('marketplace.subtitle')}
            </p>
          </div>

          {/* Standardized Filters */}
          <StandardFilters
            mode="template"
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={handleClearFilters}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="container mx-auto px-6 py-8">
        <DigitalTwinTemplatesGrid 
          searchQuery={filters.searchQuery}
          industryFilter={filters.industryFilter}
          departmentFilter={filters.departmentFilter}
          twinTypeFilter={filters.typeFilter}
          difficultyFilter={filters.levelFilter}
          showRecommended={filters.showRecommended}
        />
      </div>
    </div>
  );
}
