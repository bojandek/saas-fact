# Design Approval Workflow

Complete process for design review, approval, and implementation in SaaS Factory UI components.

## Overview

```
Phase 1: DESIGN CONCEPT
  ↓ Designer creates in Figma
  
Phase 2: DESIGN REVIEW
  ↓ Team feedback cycle
  
Phase 3: TOKEN EXPORT
  ↓ Designers export design tokens
  
Phase 4: STORYBOOK PREVIEW
  ↓ Engineers create interactive previews
  
Phase 5: QA & TESTING
  ↓ Visual regression + component tests
  
Phase 6: APPROVAL GATE
  ↓ Final stakeholder sign-off
  
Phase 7: PRODUCTION
  ↓ Deploy to npm & all apps
```

## Phase 1: Design Concept

### Figma Setup
- Create new component in SaaS Factory Figma library
- Name format: `ComponentName` (e.g., `Button`, `Dialog`, `DataTable`)
- Create variant layers for all states
- Document in Figma annotations

### Component States to Design
- Default/Normal
- Hover
- Active/Pressed
- Disabled
- Error/Invalid
- Loading
- Focus (keyboard)
- Dark mode (if applicable)

### File Structure
```
SaaS Factory UI Library/
├── Components/
│   ├── Button/
│   │   ├── Default
│   │   ├── Hover
│   │   ├── Active
│   │   ├── Disabled
│   │   └── Dark Mode
│   └── ...
├── Tokens/
│   ├── Colors
│   ├── Typography
│   └── Spacing
└── Patterns/
    ├── Forms
    └── Cards
```

## Phase 2: Design Review

### Review Checklist
- [ ] Follows Apple design system principles
- [ ] Uses centralized design tokens
- [ ] Supports light/dark mode
- [ ] Accessible (WCAG AA)
- [ ] Consistent with existing components
- [ ] Mobile responsive
- [ ] States documented (hover, active, disabled, loading, error)
- [ ] Naming follows conventions
- [ ] Ready for token extraction

### Review Process
1. **Designer** → Posts Figma link in Slack #design-review
2. **Product** → Provides feedback on UX/usage
3. **Engineering** → Flags implementation concerns
4. **Accessibility** → Reviews for WCAG compliance
5. **Designer** → Iterates based on feedback
6. **Approver** → Signs off when ready

### Approval Criteria
- ✅ Design aligns with brand guidelines
- ✅ All states covered (default, hover, active, disabled, loading, error)
- ✅ WCAG AA accessibility standards met
- ✅ Design tokens clearly identified
- ✅ Mobile-friendly layout
- ✅ No hardcoded colors/spacing (uses tokens)

## Phase 3: Token Export

### Token Definition
Before handoff, designer creates/updates tokens:

```json
{
  "colors": {
    "button-primary-bg": {
      "value": "#007AFF",
      "type": "color",
      "description": "Button primary background"
    },
    "button-primary-hover": {
      "value": "#0051D5",
      "type": "color",
      "description": "Button primary hover state"
    }
  },
  "typography": {
    "button-text": {
      "fontSize": { "value": "16px" },
      "fontWeight": { "value": "600" },
      "lineHeight": { "value": "1.4" }
    }
  },
  "spacing": {
    "button-padding-x": { "value": "16px" },
    "button-padding-y": { "value": "12px" }
  }
}
```

### Export Steps
1. Go to Figma → SaaS Factory Design Tokens frame
2. Export → "Export as design-tokens.json"
3. Validate JSON format
4. Upload to repository

## Phase 4: Storybook Preview

### Engineer Creates Stories

File: `packages/ui/src/components/button.stories.tsx`

```tsx
export const AllStates: Story = {
  render: () => (
    <div className="space-y-4">
      <Button variant="default">Default</Button>
      <Button variant="default" className="hover:bg-primary-dark">Hover</Button>
      <Button variant="default" disabled>Disabled</Button>
      <Button variant="default" className="opacity-50">Loading</Button>
    </div>
  ),
};
```

### Storybook Preview
```bash
npm run storybook
# Visit http://localhost:6006
# View Button component stories
# Compare with design
```

### Accessibility Documentation
```tsx
export const A11y: Story = {
  args: {
    children: 'Click me',
    // Storybook addon-a11y automatically checks:
    // - Color contrast
    // - Focus states
    // - ARIA labels
    // - Keyboard navigation
  },
};
```

## Phase 5: QA & Testing

### Visual Regression Testing
```bash
npm run test:visual
```
Creates baseline screenshots and compares future renders.

### Component Testing
```tsx
// packages/ui/src/components/button.test.tsx
describe('Button', () => {
  it('displays all variants correctly', () => {
    // Test each variant
  });
  
  it('meets accessibility requirements', () => {
    // a11y tests
  });
  
  it('responds to hover/active states', () => {
    // Interactive tests
  });
});
```

### Accessibility Audit
```bash
npm run a11y:audit
```
Checks:
- ✅ Color contrast (WCAG AA 4.5:1)
- ✅ Focus indicators visible
- ✅ Keyboard navigation works
- ✅ Screen reader compatible
- ✅ Font sizes readable (≥12px)

### Cross-Browser Testing
- Chrome (Chromium)
- Firefox
- Safari
- Edge

### Dark Mode Testing
```tsx
// Verify dark mode classes work
<div className="dark">
  <Button>Dark mode button</Button>
</div>
```

## Phase 6: Approval Gate

### Checklist Before Production
- [ ] Figma design approved by product
- [ ] Design tokens extracted and validated
- [ ] Storybook previews match design
- [ ] All component states tested
- [ ] Accessibility audit passed (WCAG AA)
- [ ] Visual regression tests created
- [ ] Unit tests pass (>80% coverage)
- [ ] Documentation updated
- [ ] No TypeScript errors
- [ ] Engineering review approved
- [ ] Design review approved

### Approval Sign-Off
```
🎨 Design: [Designer Name] ✅
🚀 Engineering: [Engineer Name] ✅
♿ Accessibility: [A11y Specialist] ✅
✅ Ready for production
```

## Phase 7: Production Deployment

### Deployment Steps

1. **Push to GitHub**
   ```bash
   git add packages/ui/
   git commit -m "feat(ui): add Button component with design tokens"
   git push origin main
   ```

2. **Build & Test**
   ```bash
   npm run build
   npm run test
   npm run test:visual
   ```

3. **Publish to npm**
   ```bash
   npm publish
   # Version automatically bumped (minor for new component)
   ```

4. **Update Dependent Apps**
   ```bash
   # In each app that uses @saas-factory/ui
   npm update @saas-factory/ui
   npm run build
   npm run test
   ```

5. **Deploy**
   ```bash
   # Deploy to production
   npm run deploy
   ```

### Version Management
```
v1.0.0 → Initial release
v1.1.0 → New Button component (minor)
v1.1.1 → Button bug fix (patch)
v2.0.0 → Redesign entire library (major)
```

## Rollback Procedure

If issues found in production:

```bash
# Revert npm publish
npm unpublish @saas-factory/ui@1.1.0

# Revert git
git revert <commit-hash>

# Redeploy previous version
npm install @saas-factory/ui@1.0.0
npm run deploy
```

## Timeline

| Phase | Time | Owner |
|-------|------|-------|
| Design Concept | 2-3 days | Designer |
| Design Review | 1-2 days | Team |
| Token Export | 2 hours | Designer |
| Storybook Preview | 4-6 hours | Engineer |
| QA & Testing | 2-3 days | QA + Engineering |
| Approval Gate | 1 day | Stakeholders |
| Production Deploy | 2-4 hours | DevOps |

**Total: ~1-2 weeks per component**

## Documentation Template

### Component: [Name]

**Status**: [Concept/Review/Preview/QA/Approved/Production]

**Description**: 
Brief description of component purpose.

**Figma Link**: 
https://figma.com/...

**Storybook Version**:
v1.0.0 (ready after approval)

**Design Tokens**:
- `color-primary`: #007AFF
- `spacing-md`: 16px
- `typography-body`: 16px, 400 weight

**States**:
- Default
- Hover
- Active
- Disabled
- Loading
- Error
- Focus

**Accessibility**:
- ✅ WCAG AA compliant
- ✅ Keyboard navigable
- ✅ Screen reader compatible

**Approved By**:
- Design: [Name]
- Engineering: [Name]
- Accessibility: [Name]

## Tools & Resources

- **Figma**: Design creation & collaboration
- **Design Tokens JSON**: Token exchange format
- **Storybook**: Component preview & documentation
- **Jest**: Unit testing
- **Cypress**: E2E testing
- **axe-core**: Accessibility testing
- **Percy**: Visual regression testing

## References

- [SaaS Factory Design System](./packages/ui/src/design-system.stories.mdx)
- [Figma Design Sync](./FIGMA_DESIGN_SYNC.md)
- [Component Library](./src/components)
- [Design Tokens](./src/design-tokens.ts)
