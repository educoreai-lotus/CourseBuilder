# Customization Log

## 2025-11-10 – Enrollment UX + Header Polish
- Enabled backend fallback headers (`X-User-Role`, `X-User-Id`, `X-User-Name`) so enrollment and publishing work without JWT tokens during local/Supabase environments.
- Simplified the application header: larger emerald logo focus, removed persona name/avatars for a cleaner professional navigation.
- Added request interceptor in `frontend/src/services/apiService.js` to attach the active role profile to every API call, keeping role-based routes functional without exposing personal data in the UI.

## 2025-11-10 – Softer Layout Geometry
- Introduced shared radius tokens and diffused shadow presets in `frontend/src/styles/index.css` to keep shapes consistent while maintaining existing colors/typography.
- Rounded key surfaces (`section-panel`, `course-card`, `dashboard-card`, `stage-button`, buttons, modals) with the new radii and softened card hover states for a calmer visual rhythm.
- Updated role controls and gamification widgets to adopt the softer geometry so the entire learner/trainer experience feels easier on the eyes.

## 2025-11-10 – Preserve Step-by-Step Course Journey
- Removed the auto-redirect from `CourseDetailsPage` so enrolled learners land on the overview first and choose when to advance to structure, keeping the four-step experience intentional.
- Reaffirmed individual route styling (hero background and spacing tweaks) so each step feels distinct without collapsing into a single mega page.

## 2025-11-10 – Final Lesson Assessment Flow
- Updated `LessonPage`/`LessonView`/`LessonViewer` so the final lesson swaps the “Next” CTA with a `Take Test` button once the learner marks it complete.
- Linked the assessment placeholder to jump directly into the feedback page after the simulated exam and routed all back/cancel buttons to the course structure view for consistency.
- Aligned the feedback screen navigation (back, cancel, success states) with the course structure route so the four-step loop remains linear.

## 2025-11-10 – Align With Vite Reference Styling
- Mirrored the visual language from `course-builder-vite/frontend`: restored the original emerald shadow set, hero gradients, and card geometry, and rewired the header layout to include the brand lockup plus themed toggle behaviour.
- Updated navigation and mobile drawers to follow the reference pattern while keeping role switching and route separation intact.
- Synced global button, card, modal, and dashboard treatments so the current app now renders with the same look and feel as the reference implementation.

