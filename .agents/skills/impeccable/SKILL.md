---
name: impeccable
description: |
  World-class frontend design craft and anti-AI-slop design system guidelines.
  Eliminates generic AI templates, purple-blue gradient clichés, poorly contrasted cards, and robotic spacing.
  Enforces human craft floor standards, deliberate typography scales, restrained color harmony, purposeful motion, and responsive spatial rhythm.
---

# Impeccable: World-Class Frontend Craft & Design System

## 1. The Anti-AI-Slop Manifesto
AI-generated web interfaces commonly suffer from identifiable flaws ("AI Slop"):
- **Cliché purple/blue glow gradients** on dark backgrounds without purposeful context.
- **Floating cards within cards** with arbitrary nested padding and repetitive rounded borders (`rounded-2xl` everywhere).
- **Generic typography**: Unscaled Inter or Roboto body text without typographic hierarchy or personality.
- **Low-contrast muted text**: Unreadable light grey `#9ca3af` text on white or muddy backgrounds.
- **Decorative useless widgets**: Glowing spheres, meaningless particle effects, or generic hero sections that communicate nothing.

**Impeccable Principle**: Every pixel must serve the user, elevate the brand narrative, and feel crafted by an elite design director.

---

## 2. Typographic Craft
1. **Never use standard unstyled browser defaults.**
2. **Distinctive Heading & Body Pairing**:
   - High-end Editorial / Boutique Hospitality: Pair an expressive, editorial serif (e.g., *Cormorant Garamond*, *Playfair Display*, *Cinzel*) for display headlines with an ultra-clean geometric sans (e.g., *Plus Jakarta Sans*, *Outfit*, *Inter Display*) for body and UI elements.
3. **Typographic Scale**:
   - Expressive Hero: `clamp(2.5rem, 5vw, 4.5rem)` with tight letter-spacing (`-0.03em`) and balanced line-height (`1.1`).
   - Section Titles: `clamp(1.75rem, 3vw, 2.75rem)` with tracking `-0.02em`.
   - Subsection / Card Titles: `1.25rem` to `1.5rem` semi-bold (`font-weight: 600`).
   - Body Copy: `1rem` to `1.125rem` with generous line-height (`1.6` to `1.7`) for effortless readability.
   - Micro-copy / Eyebrows: `0.75rem` to `0.85rem` uppercase with wide tracking (`letter-spacing: 0.12em` to `0.18em`) and medium/semibold weight.

---

## 3. Color Harmony & Palette Discipline
1. **The 60-30-10 Rule**:
   - 60% Dominant canvas (rich obsidian black/navy or warm ivory/linen).
   - 30% Structural neutrals (cards, borders, subtle dividers, secondary panels).
   - 10% Accent pop (warm terracotta, champagne gold, emerald or bespoke brand tone). Never spray accent colors across background fills.
2. **Dark Mode Done Right**:
   - Never use pure `#000000` for large surfaces. Use deep tinted shades:
     - Obsidian Navy: `#0a0f1d` / `#0f172a`
     - Rich Charcoal: `#12141a` / `#181b22`
     - Warm Espresso: `#12100e` / `#1c1917`
3. **Contrast Compliance**:
   - WCAG AAA for body text (minimum 7:1 contrast ratio against background).
   - WCAG AA for large headlines and interactive badges (minimum 4.5:1).

---

## 4. Spatial Rhythm & Layout Hierarchy
1. **8pt Spatial Grid**:
   - Margins and paddings should use strict tokens: `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`, `96px`.
2. **Breathing Room**:
   - Premium feel is created by intentional whitespace. Don't crowd cards or cram sections together.
3. **Card Craft**:
   - Thin, crisp borders (`1px solid rgba(255, 255, 255, 0.08)` or `1px solid rgba(0, 0, 0, 0.06)`).
   - Multi-layered soft shadows instead of harsh black drops:
     `box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 25px -5px rgba(0, 0, 0, 0.08);`

---

## 5. Micro-Interactions & Purposeful Motion
1. **Interactive Feedback**:
   - Buttons and links must have subtle, tactile hover states (`transform: translateY(-2px)`, refined glow, or background transition).
   - Active state press effect (`transform: scale(0.98)`).
2. **Transition Curves**:
   - Use cubic-bezier curves for fluid, human feel: `transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1)`.
   - Never animate layout properties like `width`, `height`, or `margin` that cause browser reflows. Stick to `transform` and `opacity`.

---

## 6. Mobile-First & Touch Ergonomics
1. **Touch Targets**: Minimum `44px` x `44px` for any interactive element.
2. **Thumb Zone**: Critical actions (e.g., "Book Now", "Call", "WhatsApp") should be anchored in the bottom floating dock on mobile devices.
3. **Responsive Breakpoints**: Graceful degradation from 4K ultrawide (`1920px+`) down to small mobile phones (`360px`).
