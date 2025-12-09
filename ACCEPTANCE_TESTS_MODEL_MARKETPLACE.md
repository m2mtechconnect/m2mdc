# Model Marketplace - Acceptance Tests

## Overview
This document outlines all acceptance criteria and test cases for the production Model Marketplace feature.

## Test Categories

### 1. Visual & Branding Tests
- [ ] **Real Provider Logos**: All provider logos (Google, OpenAI, Anthropic, DeepSeek, Cohere, Mistral, Hugging Face) display correctly
- [ ] **Logo Fallback**: If logo fails to load, card layout doesn't break
- [ ] **Brand Colors**: All cards use M2M design system tokens (--primary, --secondary, --accent)
- [ ] **Gradient Effects**: Selected cards show glow-gold effect
- [ ] **Hover States**: Cards show purple border and subtle lift on hover
- [ ] **Typography**: Uses Poppins for titles, Inter for body text
- [ ] **Spacing**: Follows 8px grid system
- [ ] **Responsive**: Cards properly reflow on mobile, tablet, desktop

### 2. Filtering & Search Tests
- [ ] **Text Search**: Filters by model name, description, and capabilities
- [ ] **Provider Filter**: Shows only models from selected provider
- [ ] **Pricing Filter**: Shows only models in selected pricing tier (free/low/medium/high)
- [ ] **Region Filter**: Automatically filters models by targetRegion prop
- [ ] **Combined Filters**: All filters work together correctly
- [ ] **Clear Filters**: Button resets all filters to default state
- [ ] **Empty State**: Shows helpful message when no models match filters
- [ ] **Region Badge**: Shows "Region compliant" or "Region not supported" indicator

### 3. Model Selection Tests
- [ ] **Select Action**: Clicking card or Select button selects model
- [ ] **Visual Feedback**: Selected card shows checkmark icon and "Selected" button
- [ ] **State Persistence**: Selection persists if agentId provided
- [ ] **Toast Notification**: Shows success toast with model name
- [ ] **RAG Settings**: Applies model's ragSettings to parent state
- [ ] **Keyboard Selection**: Enter/Space key selects focused model
- [ ] **Single Selection**: Only one model can be selected at a time

### 4. Connect Action Tests
- [ ] **RBAC Check**: Only executives can connect models
- [ ] **Access Denied**: Shows error toast for non-executives
- [ ] **No Auth Models**: Shows info toast for Lovable AI models (no auth needed)
- [ ] **Integration Creation**: Creates integration record for auth-required models
- [ ] **Loading State**: Shows spinner during connection
- [ ] **Error Handling**: Shows error toast if connection fails
- [ ] **Success Toast**: Confirms integration created

### 5. Test Action Tests
- [ ] **RBAC Check**: Only executives and engineers can test models
- [ ] **Access Denied**: Shows error toast for managers
- [ ] **Google Models**: Tests via Lovable AI gateway
- [ ] **OpenAI Models**: Tests via Lovable AI gateway
- [ ] **Anthropic Models**: Shows not supported message
- [ ] **Loading State**: Shows spinner during test
- [ ] **Success Response**: Shows latency in toast
- [ ] **Error Handling**: Catches and displays API errors
- [ ] **Rate Limiting**: Shows specific error for 429 status
- [ ] **Payment Required**: Shows specific error for 402 status
- [ ] **Test Logging**: Logs test to integration_logs table
- [ ] **Region Validation**: Disabled for non-compliant regions

### 6. Pricing & Context Display Tests
- [ ] **Normalized Pricing**: Shows consistent format "$X.XX / 1M tokens"
- [ ] **Pricing Badge**: Color-coded by tier (free/low/medium/high)
- [ ] **Context Window**: Shows consistent format "XK/XM tokens"
- [ ] **Speed Indicator**: Shows icon (Zap/TrendingUp/Brain) based on speed
- [ ] **Capabilities**: Shows first 3 capabilities, "+X" for more

### 7. RBAC Tests
- [ ] **Executive**: Can connect, test, and select models
- [ ] **Engineer**: Can test and select models, cannot connect
- [ ] **Manager**: Can only select models
- [ ] **Loading State**: Shows loader while checking permissions
- [ ] **Permission Checks**: Validates roles via has_role RPC

### 8. Error Handling Tests
- [ ] **Network Errors**: Shows user-friendly error messages
- [ ] **API Errors**: Logs to console, shows toast
- [ ] **Rate Limits**: Shows specific guidance (429)
- [ ] **Payment Issues**: Shows specific guidance (402)
- [ ] **Auth Errors**: Shows unauthorized message (401)
- [ ] **Invalid Model**: Shows unsupported model error
- [ ] **Missing API Key**: Shows configuration error
- [ ] **Database Errors**: Silently fails, selection still works in UI

### 9. Database Persistence Tests
- [ ] **Agent Config**: Updates agents.config with selected model
- [ ] **RAG Settings**: Persists model's ragSettings
- [ ] **Test Logs**: Saves test results to integration_logs
- [ ] **Integration Logs**: Logs all connect/disconnect actions
- [ ] **User ID**: All logs include authenticated user_id

### 10. Performance Tests
- [ ] **Initial Render**: < 300ms for all models
- [ ] **Search Filtering**: < 100ms response time
- [ ] **Model Selection**: < 200ms interaction time
- [ ] **No Layout Shift**: CLS < 0.1 during image loading
- [ ] **Lazy Loading**: Images load progressively
- [ ] **LCP**: < 2.5s for largest contentful paint
- [ ] **Rapid Interactions**: No degradation with rapid filter changes
- [ ] **API Non-blocking**: UI remains responsive during API calls
- [ ] **60fps**: Smooth animations without frame drops

### 11. Accessibility Tests (WCAG 2.1 AA)
- [ ] **Color Contrast**: All text meets 4.5:1 contrast ratio
- [ ] **ARIA Labels**: All interactive elements have proper labels
- [ ] **Focus Indicators**: Clear focus ring on all focusable elements
- [ ] **Keyboard Navigation**: Full tab order and Enter/Space selection
- [ ] **Screen Reader**: All images have alt text, proper heading hierarchy
- [ ] **Touch Targets**: All buttons ≥ 44x44px
- [ ] **Loading States**: Proper ARIA for spinners
- [ ] **Error Messages**: Announced to screen readers
- [ ] **Auto WCAG**: No violations in axe-core audit

### 12. Integration Tests
- [ ] **Builder Integration**: Prefills Configure Intelligence step
- [ ] **Agent Workspace**: Shows selected model in deployed agents
- [ ] **Template Integration**: Loads model from template config
- [ ] **Integrations Page**: Connected models appear in list

### 13. Region Compliance Tests
- [ ] **northamerica-northeast1**: All Google models supported
- [ ] **us-central1**: Most models supported
- [ ] **europe-west1**: Regional models supported
- [ ] **global**: OpenAI models supported globally
- [ ] **Visual Indicator**: Alert icon for non-compliant models
- [ ] **Disabled Actions**: Test button disabled for non-compliant models

### 14. M2M Branding Tests
- [ ] **Signal Gold**: Used for CTAs, selected states, focus rings
- [ ] **Purple Gradient**: Used for secondary elements
- [ ] **Carbon Black**: Used in dark mode
- [ ] **Typography**: Poppins Bold for titles, Inter for body
- [ ] **Glow Effects**: Gold glow on selected, purple glow on hover
- [ ] **Card Style**: Rounded corners (16px), subtle shadows
- [ ] **Transitions**: Smooth 300ms cubic-bezier transitions

## Test Execution Checklist

### Manual Tests
- [ ] Test on Chrome, Firefox, Safari, Edge
- [ ] Test on mobile (iOS, Android)
- [ ] Test on tablet (iPad, Android tablet)
- [ ] Test with keyboard only (no mouse)
- [ ] Test with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Test in dark mode and light mode
- [ ] Test with slow 3G connection
- [ ] Test as executive, engineer, manager roles

### Automated Tests
- [ ] Run Playwright tests: `npm run test:e2e`
- [ ] Run Cypress tests: `npm run cypress:run`
- [ ] Run axe accessibility audit
- [ ] Run Lighthouse audit (Performance, Accessibility, Best Practices)
- [ ] Run bundle size analysis

## Performance Budgets
- Initial Render: < 300ms
- Search/Filter: < 100ms
- Selection: < 200ms
- API Calls: < 1000ms
- LCP: < 2.5s
- CLS: < 0.1
- FID: < 100ms

## Accessibility Requirements
- WCAG 2.1 Level AA compliance
- Color contrast: ≥ 4.5:1
- Touch targets: ≥ 44x44px
- Focus indicators: Visible on all elements
- Keyboard navigation: Full support
- Screen reader: Full support

## Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Sign-off Criteria
All tests must pass before deploying to production:
- [ ] All functional tests pass
- [ ] All performance budgets met
- [ ] All accessibility requirements met
- [ ] All browsers tested
- [ ] All user roles tested
- [ ] Product owner approval
- [ ] Security review completed
