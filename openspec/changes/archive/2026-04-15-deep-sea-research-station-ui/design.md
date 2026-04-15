## Context

DeepDoc is a RAG (Retrieval-Augmented Generation) document workspace built with Next.js, React, TypeScript, and Tailwind CSS. The current UI uses a light slate theme with Geist fonts—functional but visually generic.

This change implements the "Deep Sea Research Station" aesthetic: a dark, immersive interface inspired by underwater research environments. The design emphasizes focus, depth, and technical precision—perfect for users who spend extended periods reading and analyzing documents.

Key constraints:
- Must maintain all existing functionality
- Must preserve Chinese language support
- Must meet WCAG AA accessibility standards
- Should feel cohesive with the "DeepDoc" product name

## Goals / Non-Goals

**Goals:**
- Create a distinctive, memorable visual identity for DeepDoc
- Implement a cohesive dark theme with deep-sea color palette
- Establish a new typography system (JetBrains Mono + Space Grotesk)
- Add purposeful motion design that enhances UX
- Maintain excellent readability for long-form content
- Ensure Chinese text renders beautifully
- Preserve all existing functionality

**Non-Goals:**
- No changes to application logic or data flow
- No new features or capabilities beyond visual enhancement
- No breaking changes to component APIs
- No redesign of information architecture
- No animation that impedes performance or accessibility

## Decisions

### Decision: Dark Theme as Default
**Rationale**: Dark themes reduce eye strain during extended use and create the immersive "research station" atmosphere. The deep blue palette (`#0a1628`) evokes depth and focus.

**Alternative considered**: System preference detection with light/dark toggle. Rejected to maintain a consistent, strong brand identity and simplify implementation.

### Decision: JetBrains Mono + Space Grotesk Font Stack
**Rationale**: 
- JetBrains Mono is highly legible for code/technical content and has a "terminal" feel that fits the research station aesthetic
- Space Grotesk is a distinctive geometric sans-serif with technical character, avoiding the overused Inter/Geist
- Both fonts support Chinese fallback gracefully

**Alternative considered**: Keeping Geist for consistency. Rejected because Geist is too generic and doesn't create the desired atmosphere.

### Decision: Bioluminescent Cyan (`#00d4ff`) as Primary Accent
**Rationale**: Cyan evokes underwater bioluminescence, creating a natural focal point. It's vibrant enough for calls-to-action but not as aggressive as pure blue or red.

**Alternative considered**: Teal or aqua. Rejected because cyan has better contrast on dark backgrounds and feels more "technical."

### Decision: CSS-First Animation Strategy
**Rationale**: CSS transitions and animations are performant and work without JavaScript. Complex choreography (like chat message sequencing) can use Framer Motion.

**Alternative considered**: Full Framer Motion for everything. Rejected to avoid bundle size increase for simple hover effects.

### Decision: Glow Effects via box-shadow
**Rationale**: box-shadow is GPU-accelerated and widely supported. The layered shadow approach creates the desired bioluminescent glow without heavy filters.

**Alternative considered**: backdrop-filter with blur. Rejected for performance reasons and to avoid overused "glassmorphism" look.

### Decision: Component-Level Styling Updates
**Rationale**: Rather than a global theme switcher, we'll update individual components. This gives precise control over each element and ensures the design is intentional.

**Alternative considered**: CSS custom properties with dark/light classes. Rejected because we want a single, bold aesthetic commitment.

## Risks / Trade-offs

**[Risk] Accessibility: Low contrast in dark theme**
→ **Mitigation**: All color combinations tested for WCAG AA compliance. Primary text uses `#f0f9ff` (very light) on `#0a1628` (very dark) for 15.3:1 contrast ratio. Interactive elements have focus indicators.

**[Risk] User preference: Some users prefer light themes**
→ **Mitigation**: This is an intentional product decision. The deep-sea aesthetic is core to the redesign. Users who strongly prefer light themes may need to adapt.

**[Risk] Font loading: Custom fonts may cause layout shift**
→ **Mitigation**: Use `font-display: swap` with system font fallbacks. Preload critical font weights (Space Grotesk regular + 600).

**[Risk] Performance: Glow effects may impact lower-end devices**
→ **Mitigation**: All effects use CSS box-shadow (GPU-accelerated). Provide `@media (prefers-reduced-motion)` fallbacks. Effects are subtle, not overwhelming.

**[Risk] Chinese text: New fonts may not render Chinese well**
→ **Mitigation**: Explicit Chinese font fallbacks in CSS (PingFang SC, Microsoft YaHei). Increased line-height (1.8) for Chinese readability.

**[Trade-off] Distinctiveness vs. Familiarity**
The new design is bold and memorable but may require a brief adjustment period for existing users. The trade-off favors creating a strong brand identity over immediate familiarity.

## Migration Plan

**Deployment approach**: Single atomic change
All visual updates happen in one deployment. There's no gradual migration path because this is a complete aesthetic replacement, not a feature addition.

**Rollback strategy**: Git revert
If critical issues emerge, revert the commit. All changes are cosmetic, so rollback is safe.

**User communication**: None required
This is a visual refresh, not a functional change. No user action needed.

## Open Questions

1. **Should we include a subtle scanline texture?**
   Could add atmosphere but might be distracting. Suggest implementing without first, adding as optional enhancement later.

2. **How should we handle print styles?**
   Dark theme doesn't print well. Should add print media query that reverts to high-contrast light for printing.

3. **Should citation markers have unique styling?**
   Currently thinking cyan badges with glow. Need to verify this doesn't conflict with code highlighting.
