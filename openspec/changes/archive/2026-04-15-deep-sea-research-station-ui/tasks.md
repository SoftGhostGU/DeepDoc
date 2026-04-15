## 1. Foundation & Global Styles

- [x] 1.1 Update `web-app/app/layout.tsx` to import JetBrains Mono and Space Grotesk fonts from Google Fonts
- [x] 1.2 Update CSS variables in `web-app/app/globals.css` with deep-sea color palette
- [x] 1.3 Update Tailwind theme configuration with new colors, fonts, and animations
- [x] 1.4 Add global animation keyframes (shimmer, pulse-glow, slide-in, fade-in)
- [x] 1.5 Add print media query that reverts to high-contrast light theme
- [x] 1.6 Test font loading with `font-display: swap` and verify fallbacks

## 2. UI Component Library Updates

- [x] 2.1 Update `web-app/components/ui/button.tsx` with deep-sea styles and glow effects
- [x] 2.2 Update `web-app/components/ui/card.tsx` with dark theme backgrounds and borders
- [x] 2.3 Update `web-app/components/ui/input.tsx` with cyan focus ring and glow
- [x] 2.4 Update `web-app/components/ui/badge.tsx` with status-specific glow effects
- [x] 2.5 Update `web-app/components/ui/dialog.tsx` with dark theme styling
- [x] 2.6 Update `web-app/components/ui/scroll-area.tsx` with dark theme scrollbar
- [x] 2.7 Update `web-app/components/ui/tooltip.tsx` with dark styling
- [x] 2.8 Update `web-app/components/ui/tabs.tsx` with cyan accent for active tab

## 3. Document Management Components

- [x] 3.1 Update `web-app/components/rag/document-upload.tsx` with deep-sea theme
- [x] 3.2 Add shimmer animation to upload progress bar
- [x] 3.3 Update `web-app/components/rag/document-list.tsx` with dark card styling
- [x] 3.4 Implement card hover lift effect and cyan border glow
- [x] 3.5 Update status badges with glow effects (INDEXED=emerald, PARSING=amber pulse, UPLOADING=cyan shimmer, FAILED=rose)
- [x] 3.6 Update `web-app/components/rag/empty-state.tsx` with dark theme styling

## 4. Chat & Conversation Components

- [x] 4.1 Update `web-app/components/rag/chat-window.tsx` with deep-sea backgrounds
- [x] 4.2 Update `web-app/components/rag/chat-message.tsx` with dark message bubbles
- [x] 4.3 Implement message slide-in animations (user from right, assistant from left)
- [x] 4.4 Update `web-app/components/rag/chat-input.tsx` with cyan focus glow
- [x] 4.5 Update `web-app/components/rag/citation-panel.tsx` with observation panel styling
- [x] 4.6 Add citation pulse animation when clicked
- [x] 4.7 Update `web-app/components/rag/citation-marker.tsx` with cyan badge styling
- [x] 4.8 Update `web-app/components/rag/citation-summary-footer.tsx` with dark theme

## 5. Navigation & Sidebar Components

- [x] 5.1 Update `web-app/components/rag/app-sidebar.tsx` with dark sidebar styling
- [x] 5.2 Add cyan glow indicator for active navigation item
- [x] 5.3 Update `web-app/components/rag/session-sidebar.tsx` with dark theme
- [x] 5.4 Implement session hover highlight effect
- [x] 5.5 Update `web-app/components/rag/stage-indicator.tsx` with cascading animation
- [x] 5.6 Add flow/cascade effect to RAG processing stages

## 6. Page Layouts

- [x] 6.1 Update `web-app/app/(pages)/layout.tsx` with deep-sea background
- [x] 6.2 Update `web-app/app/(pages)/documents/page.tsx` with page load animation sequence
- [x] 6.3 Update `web-app/app/(pages)/chat/[documentId]/page.tsx` with dark theme
- [x] 6.4 Implement staggered card entrance animation

## 7. Chinese Typography Verification

- [x] 7.1 Test all Chinese text renders correctly with new font stack
- [x] 7.2 Verify Chinese line-height (1.8) is applied throughout
- [x] 7.3 Test Chinese fallbacks (PingFang SC, Microsoft YaHei) work
- [x] 7.4 Verify Chinese text contrast meets WCAG AA on all backgrounds
- [x] 7.5 Test mixed Chinese-English content looks harmonious

## 8. Accessibility & Quality Assurance

- [x] 8.1 Run accessibility audit to verify WCAG AA compliance
- [x] 8.2 Test keyboard navigation with new focus rings
- [x] 8.3 Test with `prefers-reduced-motion` media query
- [x] 8.4 Verify all interactive elements have visible focus states
- [x] 8.5 Test on mobile devices for responsive behavior
- [x] 8.6 Verify print styles produce readable output
- [x] 8.7 Test in multiple browsers (Chrome, Firefox, Safari, Edge)

## 9. Polish & Final Review

- [x] 9.1 Review all components for visual consistency
- [x] 9.2 Fine-tune animation timings and easing functions
- [x] 9.3 Adjust any colors that don't meet contrast requirements
- [x] 9.4 Verify all glow effects render smoothly
- [x] 9.5 Final visual QA pass comparing against design spec
