

## Plan: Enhance Infrastructure Page - Hero, How It Works, Pipeline, Typography

### Changes to `src/pages/InfrastructurePage.tsx`

#### 1. Hero CTA Enhancement
- Add a value proposition text box below the description explaining why users should create a pod (cost savings, operational efficiency, autonomous cooling, etc.)
- Add a right-side visual on desktop: an SVG/CSS illustration showing the data flow concept (sensors/robots -> DDN storage -> digital twin) using lucide icons arranged in a flowing layout with animated connecting lines and framer-motion

#### 2. How It Works - Single Row + Better Animations
- Change grid from `grid-cols-2 md:grid-cols-5` to `grid-cols-5` (always single row) with responsive `gap-2` on mobile
- Replace simple border highlight with the Agritwin-style ring, glow shadow, and gradient background per active card
- Add a framer-motion progress bar at bottom of active card (like Agritwin's `motion.div` with width 0->100% over 10s)
- Add animated connecting arrows between cards (desktop overlay, positioned absolutely between card gaps)
- Use color-coded stage backgrounds matching stage color tokens (`bg-${color}/[0.03]` idle, `bg-${color}/[0.08]` active)
- Upgrade detail panel below to use gradient border + larger icon (w-12 h-12) matching Agritwin style

#### 3. Physical AI Pipeline - Active Animations
- Add animated flowing dots between pipeline stage cards (vertical line with a dot that travels top to bottom, like Agritwin)
- Add color-coded borders and gradient backgrounds per stage (`border-${color}/30 bg-gradient-to-r from-${color}/5`)
- Add hover shadow effect on pipeline cards
- Move the closed-loop feedback indicator to the TOP of the pipeline (before the 5 stages), styled as a prominent banner with dashed border, rotating icon, and bold text

#### 4. Typography & Accessibility Fixes
- Bump all `text-[10px]` instances to `text-xs` (12px) for WCAG AA compliance (minimum 12px for body text)
- Bump all `text-[9px]` and `text-[8px]` instances to at least `text-[11px]`
- Add `font-sans` (Inter) to all badge/chip text to ensure Inter font is used
- Ensure headings use proper hierarchy: h1 for hero (already), h2 for sections, h3 for subsections
- Set consistent readable sizes: section titles `text-lg md:text-xl`, body text `text-sm`, labels `text-xs`

### Technical Details
- All changes in single file `src/pages/InfrastructurePage.tsx`
- No new files, no API calls
- Uses existing framer-motion, lucide-react, shadcn components
- Maintains dark theme compatibility with semantic color tokens
- Hero visual built with positioned divs + lucide icons + framer-motion (no external images needed)

