# Agent Blueprint System - Phase 1 Foundation

## Overview

This folder contains the unified Agent Blueprint system that standardizes how all intake flows (file upload, questionnaire, templates) connect to the 5-step Builder.

## Core Concepts

### AgentBlueprint Type
The `AgentBlueprint` is a comprehensive data structure defined in `/src/types/agentBlueprint.ts` that captures all the information needed to configure an agent or digital twin across all 5 builder steps.

### Blueprint Store
The `blueprintStore` (`/src/stores/blueprintStore.ts`) manages the current blueprint being edited/viewed. It provides:
- Persistent storage of blueprints
- Dirty state tracking
- Blueprint CRUD operations

### Blueprint Helpers
The `blueprintHelpers.ts` file provides utilities for:
- Converting blueprints to/from builder state
- Navigating to the builder with a blueprint
- React hooks for easy integration

## Usage Examples

### Example 1: Opening Builder from File Upload

```typescript
import { useOpenBuilderWithBlueprint } from '@/lib/builder/blueprintHelpers';
import { AgentBlueprint } from '@/types/agentBlueprint';

function FileUploadFlow() {
  const openBuilder = useOpenBuilderWithBlueprint();
  
  const handleAnalysisComplete = (analysisResult: any) => {
    // Convert your analysis to a blueprint
    const blueprint: AgentBlueprint = {
      source: "file",
      name: analysisResult.suggestedName || "New Agent",
      description: analysisResult.summary,
      industry: analysisResult.detectedIndustry,
      department: analysisResult.detectedDepartment,
      goals: analysisResult.keyObjectives || [],
      
      model: {
        provider: "gemini",
        modelName: "google/gemini-2.5-flash",
        temperature: 0.7,
      },
      
      knowledge: {
        documents: [analysisResult.documentId],
        urls: [],
      },
      
      behavior: {
        systemPrompt: analysisResult.suggestedPrompt || "",
        safety: {
          hallucinationPrevention: true,
          requireCitations: true,
        },
      },
      
      tools: {
        recommendedIntegrations: analysisResult.suggestedIntegrations || [],
      },
      
      workflow: {
        templateType: "auto",
        triggers: [],
        actions: analysisResult.suggestedWorkflows || [],
        integrations: analysisResult.suggestedIntegrations || [],
      },
    };
    
    // Open builder with the blueprint (starts at step 2 by default)
    openBuilder(blueprint, 2);
  };
  
  return (
    // Your file upload UI...
  );
}
```

### Example 2: Opening Builder from Questionnaire

```typescript
import { useOpenBuilderWithBlueprint } from '@/lib/builder/blueprintHelpers';

function QuestionnaireFlow() {
  const openBuilder = useOpenBuilderWithBlueprint();
  
  const handleQuestionnaireSubmit = (answers: any) => {
    const blueprint: AgentBlueprint = {
      source: "questionnaire",
      name: `${answers.industry} ${answers.agentType}`,
      description: answers.primaryGoal,
      industry: answers.industry,
      department: answers.department,
      goals: [answers.primaryGoal],
      expectedRoi: answers.expectedRoi,
      
      model: {
        provider: "gemini",
        modelName: "google/gemini-2.5-flash",
        temperature: 0.7,
      },
      
      knowledge: {
        documents: [],
        urls: [],
      },
      
      behavior: {
        systemPrompt: `You are a ${answers.agentType} for ${answers.industry}.`,
        communicationStyle: {
          formal: answers.formalityLevel === 'formal',
          detailedExplanations: true,
        },
      },
      
      tools: {
        recommendedIntegrations: answers.currentTools || [],
      },
      
      workflow: {
        templateType: "auto",
        triggers: [],
        actions: [],
        integrations: answers.currentTools || [],
      },
    };
    
    openBuilder(blueprint, 1); // Start at step 1
  };
  
  return (
    // Your questionnaire UI...
  );
}
```

### Example 3: Opening Builder from Template

```typescript
import { useOpenBuilderWithBlueprint } from '@/lib/builder/blueprintHelpers';

function TemplateMarketplace() {
  const openBuilder = useOpenBuilderWithBlueprint();
  
  const handleUseTemplate = (template: any) => {
    const blueprint: AgentBlueprint = {
      source: "template",
      id: template.id,
      templateId: template.id,
      templateName: template.name,
      name: template.name,
      description: template.description,
      industry: template.industry,
      department: template.department,
      tags: template.tags,
      certified: template.certified,
      rating: template.rating,
      downloads: template.downloads,
      
      goals: template.kpi_definitions?.map((kpi: any) => kpi.name) || [],
      
      model: template.default_config?.model || {
        provider: "gemini",
        modelName: "google/gemini-2.5-flash",
      },
      
      knowledge: template.default_config?.knowledge || {
        documents: [],
        urls: [],
      },
      
      behavior: template.default_config?.behavior || {
        systemPrompt: template.default_config?.system_prompt || "",
      },
      
      tools: {
        recommendedIntegrations: template.default_config?.integrations || [],
      },
      
      workflow: template.default_config?.workflow || {
        templateType: "auto",
        triggers: [],
        actions: [],
        integrations: [],
      },
    };
    
    openBuilder(blueprint, 2); // Start at step 2
  };
  
  return (
    // Your template marketplace UI...
  );
}
```

## State Flow

```
┌─────────────────┐
│  Intake Flow    │ (File Upload / Questionnaire / Template)
│  Creates        │
│  AgentBlueprint │
└────────┬────────┘
         │
         │ openBuilderWithBlueprint()
         ▼
┌─────────────────┐
│ Blueprint Store │ (Persists blueprint temporarily)
└────────┬────────┘
         │
         │ Navigate to /builder
         ▼
┌─────────────────┐
│ Builder Page    │ (Initializes)
└────────┬────────┘
         │
         │ initializeBuilder()
         ▼
┌─────────────────┐
│ Wizard Store    │ (Hydrates from blueprint)
│ Creates Draft   │ (Saves to backend via builderService)
└────────┬────────┘
         │
         │ User edits through 5 steps
         ▼
┌─────────────────┐
│  Agent Deployed │
└─────────────────┘
```

## Key Features

✅ **Single Source of Truth**: One `AgentBlueprint` type used by all intakes  
✅ **Persistent State**: Blueprint persists across page reloads  
✅ **Smart Step Selection**: Automatically starts at the right step based on blueprint completeness  
✅ **Backend Sync**: Draft is created in backend immediately with blueprint data  
✅ **Clean Separation**: Blueprint store is cleared after hydration to avoid stale data  

## Next Steps (Phase 2-6)

- **Phase 2 ✅**: Wire file upload to create AgentBlueprint and open builder
  - Created `documentToBlueprint.ts` converter
  - Updated `ModernFileUploadWizard.tsx` to use blueprint system
  - Analytics tracking for file upload intake
- **Phase 3 ✅**: Build questionnaire wizard that outputs AgentBlueprint
  - Created `QuestionnaireWizard.tsx` with 4-step guided flow
  - Built `questionnaireToBlueprint.ts` converter with intelligent defaults
  - Integrated into dashboard via HeroSearchBar
  - Replaced legacy `IntakeQuestionnaire` component
  - Smart prompt generation and analytics tracking
- **Phase 4 ✅**: Update template marketplace to use AgentBlueprint
  - Created `templateToBlueprint.ts` converter
  - Updated `IndustryMarketplace.tsx` to use blueprint system
  - Updated `IndustryMarketplaceStep.tsx` similarly
  - All template selections now pre-fill Builder via blueprint store
- **Phase 5 ✅**: Update all 5 builder steps to read/write from blueprint
  - ✅ Step 1 Summary: Display blueprint data (ROI, goals, capabilities, workflows)
  - ✅ Step 2 Intelligence: System prompt from blueprint with live editing
  - ✅ Step 3 Tools: Auto-select recommended integrations from blueprint
  - ✅ Step 4 Workflow: Use blueprint workflow triggers/actions as defaults
  - ✅ Step 5 Simulation: Display blueprint ROI, time saved, efficiency, and goals
  - ✅ Created `blueprintSyncMiddleware.ts` for bidirectional sync
  - ✅ Blueprint persists during editing session (not cleared on hydration)
## Phase 6: Polish, Analytics & Testing ✅

**Status**: Complete

**Completed**:
- ✅ Created `intakeTracking.ts` for comprehensive analytics
- ✅ Added tracking to file upload flow
- ✅ Added tracking to questionnaire flow  
- ✅ Added tracking to template marketplace flows
- ✅ Track intake completions, builder opens, and conversions
- ✅ Calculate blueprint completeness scores
- ✅ Monitor time-to-deployment metrics

## Summary

The unified Agent Blueprint system is now complete! All three intake flows (file upload, questionnaire, templates) now:
1. Convert their data into a standardized `AgentBlueprint`
2. Store it in the blueprint store
3. Open the builder with pre-filled data
4. Track analytics throughout the journey
5. Maintain blueprint context during editing
6. Enable smooth progression through all 5 builder steps

**Next Steps**: Monitor analytics to optimize conversion rates and user experience.
