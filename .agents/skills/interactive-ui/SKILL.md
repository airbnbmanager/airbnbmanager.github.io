---
name: interactive-ui
description: |
  Modern interactive web components, micro-animations, floating action systems, and high-conversion booking widgets inspired by 21st.dev and modern craft UI.
  Provides patterns for sticky bottom navigation, fluid date pickers, dynamic price calculators, image lightboxes, and tactile button feedback.
---

# Interactive UI: Modern Components & Micro-Interactions

## 1. Floating Booking & Concierge Dock (Mobile Ergonomics)
On mobile devices (`< 768px`), standard booking forms get lost below extensive photo galleries and descriptions.
- **Floating Action Bar**:
  - Pinned to the bottom with backdrop-filter blur (`backdrop-filter: blur(16px); background: rgba(11, 17, 32, 0.85)`).
  - Displays nightly rate on left (`₹3,499 / night`) + instant primary CTA on right ("Book Direct" or "WhatsApp Concierge").
  - Preserves safe area inset for modern iPhones (`padding-bottom: max(12px, env(safe-area-inset-bottom))`).

---

## 2. Interactive Property Gallery & Lightbox
- High-performance, gesture-friendly carousel with thumbstrip navigation.
- Smooth CSS snap-scroll (`scroll-snap-type: x mandatory`).
- Tactile previous/next chevron buttons with backdrop blur pill design.
- Counter pill (e.g., `1 / 18 Photos`) anchored cleanly in bottom-right corner of image container.

---

## 3. Dynamic Rate & Date Calculation
- Seamless check-in and check-out interactive range selector.
- Live price computation showing breakdown:
  - Base nights x Nightly rate
  - Extra guest charge (if applicable)
  - Direct Booking Discount badge (e.g., "Save ₹1,200 vs Airbnb")
  - Transparent total amount with zero hidden cleaning/service surcharges.

---

## 4. Modern Glassmorphism & Surface Elevation
- **Proper Glass Rule**: Avoid low-contrast foggy blur over high-contrast text.
  ```css
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
  ```
- Use subtle noise texture or crisp gradient hairline borders to define edge separation.

---

## 5. Performance & Zero-Jank Animation Standard
- Hardware-accelerated animations using `transform: translate3d(...)` and `opacity`.
- Use `will-change` sparingly on animating components.
- Zero layout thrashing or cumulative layout shift (CLS < 0.05).
- Responsive image tags with `loading="lazy"` and explicit `width`/`height` or aspect-ratio containers.
