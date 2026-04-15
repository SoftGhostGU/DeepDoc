## Why

The current DeepDoc UI uses a generic light theme with standard slate colors and Geist fonts that lacks distinctive character. As a RAG (Retrieval-Augmented Generation) document workspace where users spend significant time reading and analyzing documents, the interface should evoke a sense of depth, focus, and intellectual immersion. The "Deep Sea Research Station" aesthetic—dark, controlled, with bioluminescent accents—creates an environment conducive to deep work while establishing a memorable brand identity.

## What Changes

- **Complete visual redesign** from light slate theme to dark deep-sea theme
- **New color system**: Deep ocean blue (`#0a1628`) backgrounds, bioluminescent cyan (`#00d4ff`) accents, signal red alerts
- **Typography refresh**: JetBrains Mono for code/technical elements, Space Grotesk for UI text (replacing Geist)
- **Enhanced visual effects**: Subtle scanline overlays, glow effects on interactive elements, depth shadows
- **Component restyling**: Cards become "observation panels" with subtle borders and glow states
- **Animation system**: Smooth transitions for state changes, loading animations resembling sonar/depth readings
- **Accessibility maintained**: All color combinations maintain WCAG AA contrast ratios
- **No breaking changes** to functionality or API—purely visual layer

## Capabilities

### New Capabilities
- `deep-sea-theme`: Complete dark theme implementation with deep-sea color palette, glow effects, and atmospheric backgrounds
- `typography-refresh`: New font stack (JetBrains Mono + Space Grotesk) with updated type scale
- `motion-system`: Coordinated animation system for interactions, loading states, and transitions

### Modified Capabilities
- `ui-text-chinese`: Update to ensure Chinese text renders beautifully with new font stack and maintains readability in dark theme

## Impact

- **CSS/Styles**: Complete overhaul of `globals.css`, Tailwind theme configuration
- **Components**: All UI components in `components/ui/` and `components/rag/` updated with new styling
- **Layout**: `layout.tsx` updated with new font imports
- **Dependencies**: New Google Fonts (JetBrains Mono, Space Grotesk)
- **Assets**: May include subtle texture/background assets
- **User experience**: Users familiar with current UI will notice immediate visual transformation, but workflows remain identical
