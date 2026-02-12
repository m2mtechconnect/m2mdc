

## Onboarding Questionnaire Page

### Overview
Replace the "Get Started Free" buttons on the marketing page with a link to a new `/onboarding` public page. This page will be a multi-step questionnaire that captures prospect information and data centre needs before routing them to sign up.

### Questionnaire Steps

**Step 1 -- About You**
- Full name
- Job title / role (dropdown: CIO, CTO, VP Infrastructure, Data Centre Manager, Operations Lead, Other)
- Company name
- Work email
- Company size (1-50, 51-200, 201-1000, 1000+)

**Step 2 -- Your Data Centre**
- Number of data centres (1, 2-5, 6-20, 20+)
- Total rack count (dropdown ranges)
- Primary workload type (multi-select: AI/ML Training, HPC, Cloud Hosting, Enterprise IT, Colocation, Other)
- Current PUE estimate (optional slider or dropdown)

**Step 3 -- Your Goals**
- What are you looking to achieve? (multi-select: Reduce PUE, Optimize cooling, Carbon/ESG reporting, Capacity planning, Predictive maintenance, Sovereign compliance, Other)
- Biggest operational challenge (free text)
- Timeline to deploy (Exploring, 1-3 months, 3-6 months, 6-12 months)

**Step 4 -- Summary and Sign Up**
- Review answers summary card
- CTA: "Create Your Account" which navigates to `/sign-up` with questionnaire data stored in the database for follow-up

### Technical Plan

1. **Database table** -- Create `onboarding_submissions` table (no auth required, public insert RLS policy):
   - `id` (uuid), `full_name`, `email`, `job_title`, `company_name`, `company_size`, `num_data_centres`, `rack_count`, `workload_types` (jsonb), `current_pue`, `goals` (jsonb), `challenge` (text), `timeline`, `created_at`

2. **New page** -- `src/pages/Onboarding.tsx`
   - Multi-step form using `react-hook-form` + `zod` validation
   - Step indicator/progress bar at top
   - Each step is a sub-component for clarity
   - Framer Motion slide transitions between steps
   - Mobile responsive layout

3. **Route** -- Add `/onboarding` to the unauthenticated routes in `App.tsx`

4. **Update CTAs** -- Change all "Get Started Free" `onClick` handlers in:
   - `TwinHero.tsx` -- navigate to `/onboarding`
   - `TwinCTASection.tsx` -- navigate to `/onboarding`
   - `TwinHeader.tsx` -- header CTA button to `/onboarding`

5. **Form submission flow**:
   - Validate with zod schema
   - Insert into `onboarding_submissions` table
   - Navigate to `/sign-up` on success (or show confirmation with link)

6. **Styling** -- Consistent with existing landing page design tokens (glass-panel cards, accent buttons, M2M branding). Back-to-home link at top (matching sign-in page pattern).

