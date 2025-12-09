import { useState, useEffect, useCallback } from 'react';
import { Building2, Briefcase, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useWizardBuilderStore } from '@/stores/wizardBuilderStore';
import { ALLOWED_INDUSTRIES, ALLOWED_DEPARTMENTS } from '@/lib/digitalTwin/deterministicMapper';
import { validateStep1 } from '@/lib/validation/builderValidation';

export function Step2Industry() {
  const { industry, department, setIndustryDepartment, error } = useWizardBuilderStore();
  const [industryError, setIndustryError] = useState('');
  const [departmentError, setDepartmentError] = useState('');
  const [showValidationError, setShowValidationError] = useState(false);

  const handleIndustryChange = (value: string) => {
    setIndustryDepartment(value, department);
    setIndustryError('');
    setShowValidationError(false);
  };

  const handleDepartmentClick = (dept: string) => {
    setIndustryDepartment(industry, dept);
    setDepartmentError('');
    setShowValidationError(false);
  };

  const handleIndustryBlur = () => {
    if (!industry || industry === 'Not selected') {
      setIndustryError('Industry is required');
    }
  };

  const handleDepartmentBlur = () => {
    if (!department) {
      setDepartmentError('Department is required');
    }
  };

  // Validate fields - separated into check and UI update
  const checkValidation = useCallback(() => {
    const validation = validateStep1(industry, department);
    return validation.isValid;
  }, [industry, department]);

  const validateFields = useCallback(() => {
    const validation = validateStep1(industry, department);
    
    if (!validation.isValid) {
      // Use setTimeout to avoid setState during render
      setTimeout(() => {
        setShowValidationError(true);
        
        // Set individual field errors
        if (!industry || industry === 'Not selected') {
          setIndustryError('Industry is required');
        }
        if (!department) {
          setDepartmentError('Department is required');
        }
        
        // Scroll to first error
        const firstError = document.querySelector('[aria-invalid="true"]');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 0);
      
      return false;
    }
    
    return true;
  }, [industry, department]);

  // Expose validation to parent navigation via useEffect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__step2Validate = validateFields;
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__step2Validate;
      }
    };
  }, [validateFields]);

  return (
    <div className="space-y-8 max-w-[880px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Select Industry & Department</h1>
        <p className="text-muted-foreground mt-2">
          Both fields required for deployment
        </p>
      </div>

      {showValidationError && (
        <Card className="p-4 border-destructive bg-destructive/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-destructive">Required fields missing</h3>
              <p className="text-sm text-destructive/90 mt-1">
                Please select both industry and department to continue.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Industry <span className="text-destructive">*</span>
            </label>
            <Select 
              value={industry} 
              onValueChange={handleIndustryChange}
            >
              <SelectTrigger 
                className={`w-full ${industryError ? 'border-destructive' : ''}`}
                onBlur={handleIndustryBlur}
                aria-invalid={!!industryError}
                aria-describedby={industryError ? 'industry-error' : undefined}
              >
                <SelectValue placeholder="Select your industry" />
              </SelectTrigger>
              <SelectContent className="bg-background max-h-[300px]">
                {ALLOWED_INDUSTRIES.map((ind) => (
                  <SelectItem key={ind} value={ind}>
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {industryError && (
              <p id="industry-error" className="text-sm text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {industryError}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Department <span className="text-destructive">*</span>
            </label>
            <div 
              className="flex flex-wrap gap-2"
              onBlur={handleDepartmentBlur}
              role="radiogroup"
              aria-label="Department selection"
              aria-required="true"
              aria-invalid={!!departmentError}
            >
              {ALLOWED_DEPARTMENTS.map((dept) => (
                <Badge
                  key={dept}
                  variant={department === dept ? 'default' : 'outline'}
                  className="cursor-pointer px-4 py-2 text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => handleDepartmentClick(dept)}
                  role="radio"
                  aria-checked={department === dept}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleDepartmentClick(dept);
                    }
                  }}
                >
                  {dept}
                </Badge>
              ))}
            </div>
            {departmentError && (
              <p className="text-sm text-destructive mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {departmentError}
              </p>
            )}
          </div>
        </div>
      </Card>

      {industry && department && (
        <Card className="p-4 bg-muted/50 border-primary/20">
          <h3 className="text-sm font-medium mb-2">Selected Configuration</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{industry}</span>
            <span>→</span>
            <span>{department}</span>
          </div>
        </Card>
      )}

      {error && (
        <div className="p-4 border border-destructive bg-destructive/10 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}