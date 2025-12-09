# URL Scanner: Top 3 Digital Twin Recommendations

## Overview

The URL scanner now surfaces **only the top 3 most relevant Digital Twin blueprints** for each scanned company, with **multi-layer filtering** including hard term blocking, industry matching, and strict score thresholds to ensure recommendations match the company's actual business reality.

## Architecture

The recommendation engine uses a **3-stage filtering pipeline**:

1. **Hard Filter Layer**: Blocks recommendations containing banned B2C/retail terms
2. **Scoring Layer**: Calculates Enterprise Fit, Industry Match, and Digital Twin Relevance scores
3. **Strict Filter Layer**: Enforces minimum score thresholds (70/100 for B2B companies)

Only recommendations that pass all 3 stages are ranked and returned as the top 3.

## Key Features

### 1. Hard Filter Layer (Pre-Scoring)

**Banned Terms Automatically Blocked:**
- **B2C/Consumer**: retail, shopping, shopper, store operations, loyalty program, customer personalization
- **Consumer Marketing**: consumer segmentation, customer journey optimization, d2c marketing, brand loyalty
- **E-commerce**: checkout, cart, purchase journey, merchandising, promotions, offers

Any recommendation containing these terms is **immediately rejected** before scoring.

**Logging:**
```
[Filter] BLOCKED recommendation "Enhance Customer Experience..." - contains banned term: "customer personalization"
[Filter] Blocked 2 irrelevant recommendations
[Filter] Kept 8 relevant recommendations for scoring
```

### 2. Business Model-Aware Scoring

The system classifies each company's business model and applies three specialized scores:

#### Enterprise Fit Score (0-100)
**For B2B Enterprise Companies (SAP, Oracle, AWS, etc.):**
- **Baseline**: 50
- **Boost (+10 per keyword)**: procurement, spend, supplier, ERP, supply chain, finance, compliance, ESG, sustainability, partner ecosystem, developer, cloud cost, DevOps
- **Penalty (-30 per keyword)**: customer experience, personalization, marketing automation (B2C contexts)
- **Minimum Required**: 70/100

#### Industry Match Score (0-100)
**For B2B Enterprise Companies:**
- **Baseline**: 60
- **Boost (+15 per match)**: Alignment with valid enterprise industries (enterprise software, supply chain, ERP, finance, procurement, HR, sustainability, ESG, developer ecosystem)
- **Penalty (-40)**: Mismatched departments (e.g., Marketing + consumer focus for B2B)
- **Minimum Required**: 70/100

#### Digital Twin Relevance (0-100)
**For All Companies:**
- **Baseline**: 50
- **Boost (+8 per keyword)**: process, workflow, automation, intake, triage, event, trigger, pipeline, orchestration, twin, digital twin, agent, agentic, operational
- **Minimum Required**: 70/100

### 3. Strict Filtering (Post-Scoring)

**For Enterprise B2B Companies, ALL recommendations must satisfy:**
```
EnterpriseFitScore ≥ 70 AND
IndustryMatchScore ≥ 70 AND
DigitalTwinRelevance ≥ 70
```

**Logging:**
```
[Strict Filter] BLOCKED "Upskill Workforce for Retail..." - Enterprise Fit Score too low: 45
[Strict Filter] BLOCKED "Customer Journey Optimization..." - Industry Match Score too low: 30
[Strict Filter] 6 recommendations passed all thresholds
```

### 4. Final Relevance Score

The final ranking score combines:
- **20%** Confidence (from AI)
- **30%** Impact (High=30%, Medium=15%, Low=5%)
- **-8%** Effort penalty (High=-8%, Medium=-4%, Low=0%)
- **25%** Enterprise Fit Score (normalized 0-1)
- **20%** Industry Match Score (normalized 0-1)
- **15%** Digital Twin Relevance (normalized 0-1)
- **+5%** Funding eligibility bonus
- **+3%** Agentic AI tag bonus
- **+2%** Edge AI tag bonus

**Example Scoring Output:**
```
[Scoring] "AI-Powered Spend Management Digital Twin": EnterpriseFit=90, IndustryMatch=85, DTRelevance=88, FinalScore=94
[Scoring] "Supply Chain Resilience Digital Twin": EnterpriseFit=85, IndustryMatch=90, DTRelevance=82, FinalScore=91
```

### 5. Business Model Classification

**AI Prompt STEP 1: Classify Business Model**
- B2B enterprise software (SAP, Oracle, IBM, AWS, Salesforce, ServiceNow, Snowflake)
- B2C consumer brand
- Industrial/Manufacturing
- Healthcare provider
- Retail/E-commerce
- Logistics/Supply Chain
- Finance or Banking
- Public sector/Government
- Energy/Utilities
- Professional Services
- Marketplace/Platform
- Nonprofit or NGO

**AI Prompt STEP 2: Apply Category-Specific Rules**

**For B2B Enterprise Companies - PRIORITIZE:**
- ✔️ Finance Digital Twins (AP/AR automation, spend analytics)
- ✔️ Supply Chain Digital Twins (procurement, supplier risk)
- ✔️ Procurement & Spend Optimization
- ✔️ Risk & Compliance Digital Twins
- ✔️ Sustainability & ESG Digital Twins
- ✔️ Partner/Developer Ecosystem Enablement

**For B2B Enterprise Companies - DEPRIORITIZE:**
- ❌ B2C personalization
- ❌ Consumer marketing automation
- ❌ E-commerce front-end recommendations
- ❌ Shopper behavior analysis
- ❌ Retail workforce upskilling

### 6. Output Format

Each Digital Twin must include:
- **Title**: Format as "[Process Name] Digital Twin for [Company]"
- **Description**: ≤80 words explaining:
  - The business process being mirrored/automated
  - The triggering events
  - Expected outcome and ROI
  - **WHY THIS FITS THIS SPECIFIC COMPANY'S BUSINESS MODEL**
- All other standard fields (impact, effort, tags, funding, etc.)

## Implementation

### 1. Edge Function Scoring (`url-recommendations`)

The edge function now:
- **Classifies the company's business model** (B2B enterprise, B2C consumer, manufacturing, healthcare, etc.)
- **Applies strict filtering rules** to ensure recommendations match the company's actual business
- **Generates 5-10 recommendations** from AI across all departments
- **Filters out irrelevant recommendations** before scoring:
  - ❌ No B2C personalization for B2B enterprise companies
  - ❌ No e-commerce improvements for non-retail companies
  - ❌ No consumer marketing for B2B platforms
  - ✔️ Finance/supply chain twins for B2B enterprise
  - ✔️ Patient workflow twins for healthcare
  - ✔️ Logistics optimization for supply chain companies
- **Calculates a `relevanceScore`** (0-1) for each recommendation based on:
  - **Confidence score (35%)**: AI's confidence in the recommendation
  - **Impact score (10-35%)**: High=35%, Medium=20%, Low=10%
  - **Effort penalty (-10 to 0%)**: High=-10%, Medium=-5%, Low=0%
  - **Digital Twin bonus (0-12%)**: Keywords like process, workflow, automation, intake, triage, event, trigger
  - **Funding bonus (8%)**: If funding programs are identified
  - **Agentic AI bonus (5%)**: If tagged with "Agentic AI"
  - **Edge AI bonus (3%)**: If tagged with "Edge AI"
- **Sorts all recommendations** by `relevanceScore` (descending)
- **Returns only top 3** in the response
- **Includes `totalCount`** field showing total recommendations before filtering

### 2. AI Prompt Changes

The system prompt now includes:

**STEP 1: Business Model Classification**
- Classifies company as B2B enterprise, B2C consumer, manufacturing, healthcare, logistics, finance, etc.
- Uses conservative classification when uncertain

**STEP 2: Category-Specific Filtering**
- Invalid matches for B2B enterprise (SAP, Oracle, AWS, etc.):
  - ❌ Consumer personalization
  - ❌ E-commerce improvements
  - ❌ B2C marketing automation
  - ❌ Retail-shopper segmentation
- Valid matches for B2B enterprise:
  - ✔️ Spend management, procurement, supply chain twins
  - ✔️ Finance automation, compliance twins
  - ✔️ Partner/developer ecosystem enablement
  - ✔️ ESG/sustainability digital twins

**STEP 3: Multi-Factor Filters**
- Industry fit (maps to actual business)
- Product ecosystem fit (aligns with company's offerings)
- High ROI use case (measurable impact)
- Event-driven + operationally integrated

**STEP 4: Special B2B Enterprise Rules**
- Prioritizes: Finance, Supply Chain, Procurement, Compliance, Sustainability, Partner Ecosystem
- Deprioritizes: Consumer-facing features, B2C marketing, e-commerce front-end

**Output Format:**
- Titles formatted as: "[Process Name] Digital Twin for [Company]"
- Descriptions explicitly explain WHY this fits THIS specific company
- Emphasizes process-driven, event-triggered workflows
- Asks for 5-10 recommendations (not 3 per department) to enable better ranking
- Includes business model classification in `industryGuess` field

### 3. UI Display (`RecommendationsPanel`)

The UI now:
- Shows header: "Top N Digital Twin Blueprints for [Company]"
- Displays "Showing top 3 of X AI opportunities" when `totalCount` is available
- Shows relevance score badge for each recommendation
- Emphasizes process-driven nature in subtitle
- Maintains existing ranking styles (🥇🥈🥉) for top 3

### 4. Data Model Updates

Added fields to `RecommendationData` type:
```typescript
relevanceScore?: number;  // 0-1 score indicating relevance to company
totalCount?: number;      // Total recommendations before filtering
```

Added field to `RecoResponse` interface:
```typescript
totalCount?: number;  // Total recommendations before filtering to top N
```

## User Experience

**Before**: Long list of unprioritized recommendations across many departments

**After**: 
- Only 3 cards displayed
- Each explicitly framed as a Digital Twin/Agent blueprint
- Sorted by multi-factor relevance score
- Clear ranking indicators (🥇🥈🥉)
- Shows "Top 3 of N opportunities" to indicate filtering

## Example: SAP Recommendations

### Before (Invalid Results - User Screenshot)
The system incorrectly returned B2C/retail recommendations for SAP:

1. ❌ **"Enhance Customer Experience with AI-Powered Personalization"** (95%)
   - **Why Invalid**: B2C consumer personalization doesn't match SAP's B2B enterprise business model
   - **Blocked By**: Hard filter (contains "customer personalization")
   - **Scores**: EnterpriseFit=20, IndustryMatch=15, DTRelevance=45

2. ❌ **"Upskill Your Workforce for the AI-Driven Retail Future"** (80%)
   - **Why Invalid**: Retail-focused workforce upskilling doesn't align with SAP's partner ecosystem
   - **Blocked By**: Hard filter (contains "retail"), Enterprise Fit Score too low (35)
   - **Scores**: EnterpriseFit=35, IndustryMatch=40, DTRelevance=55

3. ✅ **"Optimize Supply Chain and Inventory Management with Predictive AI"** (90%)
   - **Why Valid**: Aligns with SAP's core ERP and supply chain offerings
   - **Passes All Filters**: No banned terms, all scores ≥ 70

### After (Valid Results - Fixed System)
The system now returns only enterprise-relevant Digital Twin blueprints:

1. ✅ **"AI-Powered Spend Management & Procurement Optimization Digital Twin for SAP"** (94%)
   - **Why Valid**: Directly aligns with SAP Ariba, SAP S/4HANA Finance modules
   - **Scores**: EnterpriseFit=90, IndustryMatch=95, DTRelevance=88
   - **Triggers**: Purchase requisition intake, invoice upload, supplier onboarding event
   - **Outcome**: 25% faster procurement cycles, 15% cost reduction

2. ✅ **"Predictive Supply Chain Planning & Logistics Digital Twin for SAP"** (91%)
   - **Why Valid**: Core to SAP's Integrated Business Planning (IBP) and supply chain offerings
   - **Scores**: EnterpriseFit=85, IndustryMatch=90, DTRelevance=82
   - **Triggers**: Demand forecast, supplier delay signal, inventory threshold event
   - **Outcome**: 30% reduction in stockouts, 20% improved forecast accuracy

3. ✅ **"Enterprise Workforce AI-Readiness & Partner Ecosystem Digital Twin for SAP"** (88%)
   - **Why Valid**: Aligns with SAP's developer community, partner network, and SuccessFactors
   - **Scores**: EnterpriseFit=80, IndustryMatch=85, DTRelevance=78
   - **Triggers**: Partner onboarding, certification completion, ecosystem expansion event
   - **Outcome**: 40% faster partner enablement, 2x developer productivity

### Key Improvements

**Blocked Recommendations (2 of 3 original):**
- Consumer personalization → BLOCKED (banned term: "customer personalization")
- Retail workforce → BLOCKED (banned term: "retail", Enterprise Fit Score: 35 < 70)

**New Recommendations (3 of 6 generated):**
- All 3 passed hard filter (no banned terms)
- All 3 passed strict filter (all scores ≥ 70)
- All 3 explicitly mention SAP's business model fit
- All 3 framed as Digital Twins with event triggers and outcomes

## Example Recommendation Title Format

**Before**: "Improve Customer Support Efficiency"

**After**: "Customer Support Intake & Triage Digital Twin for Acme Corp"

## Compatibility

- Existing builder flow unchanged - clicking "Create Agent" still:
  - Sets `recommendationData`
  - Initializes `digitalTwinDraft` via `mapRecommendationToDigitalTwinConfig`
  - Navigates to 6-step builder with Digital Twin mode enabled
- All existing tests remain valid
- Backward compatible with cached recommendations (will just show all items if `totalCount` not present)

## Testing Scenarios

1. **URL scan with many recommendations**: API returns 3 items + totalCount (e.g., 8)
2. **Frontend displays correctly**: Shows "Top 3 of 8 AI opportunities"
3. **Create Agent flow**: Works identically to before, just with better-ranked recommendations
4. **Edge case**: If fewer than 3 recommendations, shows only those (1-2) with no errors

## Future Enhancements

- Allow users to expand and view all recommendations (not just top 3)
- Add filter to show "All" vs "Top 3"
- Expose relevance score weighting to admin configuration
