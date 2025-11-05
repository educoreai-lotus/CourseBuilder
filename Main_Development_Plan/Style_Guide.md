[Stage: Style Guide]
[Feeds: API Endpoints Design]
[Created: 2025-11-04]

# Style Guide — Course Builder UI (React + Vite + Tailwind)

## Overview
The Course Builder UI is part of Educore AI’s unified design system — built for clarity, accessibility, and aesthetic coherence across all microservices. The style blends a calm educational tone with dynamic AI-driven gradients, ensuring learners and trainers experience focus and flow equally in both light and dark modes.

## Brand & Design Tokens
- Colors (HEX)
  - --primary-emerald: #00A676 (light accent)
  - --primary-cyan: #1DD3B0 (highlight + gradient tone)
  - --gradient-primary: linear-gradient(90deg,#00A676 0%,#1DD3B0 50%,#0FC2C0 100%)
  - Light BG: #FFFFFF / Dark BG: #0D1117
  - Text primary: #1E1E1E (light) / #E6F4F1 (dark)
  - Text secondary: #4B5563 (light) / #9CA3AF (dark)
- Logos
  - /assets/logo-light.png (light theme)
  - /assets/logo-dark.png (dark theme)
- Theme Switching
  - Dark mode is toggled via the `useApp()` context (`theme === 'day-mode' ? … : …`) and CSS `[data-theme="dark"]` selectors. All variables switch dynamically to maintain color consistency and contrast (≥4.5:1).
- Typography (Web Fonts + Sizes)
  - Headings: Poppins 600–800
  - Body/UI: Inter 400–700
  - Base: 16px (1rem)
  - Scale: xs 0.75rem, sm 0.875rem, base 1rem, lg 1.125rem, xl 1.25rem, 2xl 1.5rem, 3xl 2rem, 5xl 3rem
  - Line height ≈ 1.6; titles letter‑spacing −0.01em
- Spacing Scale
  - --spacing-xs: 4px; --spacing-sm: 8px; --spacing-md: 16px; --spacing-lg: 24px; --spacing-xl: 32px; --spacing-2xl: 48px
- Corner Radius Defaults
  - --radius-sm: 8px (inputs/buttons)
  - --radius-md: 12px (cards/dialogs)
  - --radius-lg: 16px (heroes/modals)
  - --radius-xl: 24px (feature blocks)
- Visual Intent
  - Rounded geometry + emerald‑cyan gradients reflect Educore AI’s intelligent calm aesthetic across light/dark themes

## Components (Atoms/Molecules)
- Buttons
  - Variants
    - btn-primary: background var(--gradient-primary); border none; text white — primary CTAs (Create, Publish, Save)
    - btn-secondary: background transparent; border 2px solid var(--primary-cyan); text var(--text-primary) — secondary actions (View, Back)
    - btn-outline: background transparent; border 1px solid var(--primary-emerald); text var(--primary-emerald) — neutral/subtle actions
    - btn-danger: background #EF4444; border none; text white — destructive actions
  - Sizes
    - sm: 8px 16px padding; 0.875rem font; radius var(--radius-sm)
    - md: 12px 24px padding; 1rem font; radius var(--radius-md)
    - lg: 16px 32px padding; 1.125rem font; radius var(--radius-lg)
  - States
    - Hover/Focus: transform translateY(-2px), box-shadow var(--shadow-hover); gradient +10% brightness; focus ring 2px solid #00A676
- Inputs & Textareas
  - Base: border 1px solid var(--border-muted) (gray-300 light / gray-600 dark); radius var(--radius-sm); padding var(--spacing-sm) var(--spacing-md); font Inter 400, 1rem
  - States
    - Default: neutral border; bg white (light) / gray-700 (dark)
    - Focus: border-color var(--primary-emerald) + glow ring
    - Error: border-color #EF4444 + subtle red shadow
    - Disabled: opacity 0.6; no hover/focus ring
  - Placeholder: muted gray (#9CA3AF / #6B7280)
- Card Layout (Course / Lesson)
  - Structure: container rounded var(--radius-md), shadow var(--shadow-card), gradient border accent
  - Layout: top thumbnail/icon; middle title, tags, short description; bottom rating stars + optional duration/progress
  - Styling: bg var(--bg-secondary); hover border-image: var(--gradient-primary) 1; title fw 600 with gradient-text on hover; tags as small pills (radius var(--radius-sm), translucent emerald); rating stars #FACC15 aligned right

## Gradient Usage Guidelines
- Use gradients for emphasis only (headings, buttons, highlight borders)
- Avoid full-panel gradient fills; prefer gradient borders, icons, or text masks
- Orientation: linear-gradient(90deg, #00A676 0%, #1DD3B0 50%, #0FC2C0 100%)
- Maintain accessibility: ensure 4.5:1 contrast for text over gradient backgrounds

## Layout & Pages
- Learner: /learner/dashboard, /learner/personalized, /learner/enrolled, /course/:id, /course/:id/assessment, /course/:id/feedback
- Trainer: /trainer/dashboard, /trainer/course/:id, /trainer/publish/:id, /trainer/feedback/:id
- Responsive Breakpoints
  - sm: 640px (mobile landscape → base layout shift)
  - md: 768px (tablets → 2‑column grids)
  - lg: 1024px (laptops → primary container width)
  - xl: 1280px (desktops → max content width)
  - 2xl: 1536px (large screens → centered wide hero sections)
- Containers & Grid
  - max-width: 1200px content zone; side padding var(--spacing-xl) (~32px); section vertical padding var(--spacing-2xl) (~48px)
  - Default 12‑column grid (CSS Grid/Tailwind grid-cols-12); gaps use --spacing-md..--spacing-lg
  - Cards/features: grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)) with auto-wrap at all breakpoints

## Accessibility (A11y)
- Focus & Keyboard
  - Focus ring: outline 2px solid #00A676; outline-offset 2px; visible on all interactive elements
  - High-contrast: respect system prefers-contrast
  - Tab Navigation: buttons, inputs, links must be reachable and show visible focus
  - ARIA
    - aria-label on icon-only buttons
    - role="dialog" + aria-modal="true" for modals
    - aria-expanded + aria-controls on collapsibles
  - Skip link: <a href="#main">Skip to main content</a> visible on focus

## Motion & Animation Preferences
- Default transitions: 0.25–0.3s ease for hover/opacity/transform; use transition-all + will-change: transform
- Hover depth: translateY(-4px) + var(--shadow-hover)
- Reduce Motion: @media (prefers-reduced-motion: reduce) { * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; } }
- Avoid parallax or continuous looping animations; prefer subtle fades/slides (Framer Motion allowed for controlled reveals)

## Content Style
- Tone: concise, instructional, action-oriented
- Labels: sentence case; avoid jargon; show units and context

## Tailwind Conventions
- Use design tokens via CSS variables; utility-first classes; avoid deep overrides
- Component composition with small reusable parts; no long class chains

## Example Snippets
```jsx
<button className="btn btn-primary">
  <i className="fas fa-plus mr-2"></i>Create Course
</button>

<div className="card">
  <h3 className="text-lg font-semibold">AI Course Builder</h3>
  <p>Auto-generates modular learning paths for learners.</p>
  <div className="flex justify-between text-sm mt-2">
    <span className="tag bg-emerald-100 text-emerald-800">AI</span>
    <span className="text-yellow-400">⭐ 4.8</span>
  </div>
</div>
```

## Token Reference
Token Source: All variables and gradients are defined in `/src/theme/tokens.css` and mapped in the Tailwind configuration for consistency across Educore microservices.

## Refinements
- Feature: TBD — TBD
