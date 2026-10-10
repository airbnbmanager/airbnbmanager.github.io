---
name: frontend-design
description: |
  Official Anthropic Frontend Design Skill. Establishes bespoke aesthetic direction, enforces strict CSS design tokens, mandates authentic typography pairings, and prevents generic AI slop.
---

# Official Frontend Design Skill (Anti-AI Slop Standards)

## 1. Aesthetic Direction & Intent
- Never rely on default Bootstrap or generic AI templates (purple-blue linear gradient hero, round white cards with grey text, emoji-stuffed headings).
- Every project must select a bold, intentional aesthetic rooted in the domain:
  - **Luxury Hospitality / Editorial**: Deep obsidian noir or warm architectural slate (`#0B0F15`, `#131922`), warm champagne gold (`#F59E0B`, `#FBBF24`), linen highlights, bespoke serif display typography.
  - **High-End Commerce**: Clean high-contrast typography, restrained monochrome with single vibrant accent.

## 2. Mandatory CSS Variables & Design Tokens
All styling must be driven by strict `:root` design tokens:
- **Canvas Base**: `--luxe-bg`
- **Surface Elevation**: `--luxe-surface`
- **Primary Ink**: `--luxe-ink`
- **Muted Ink**: `--luxe-muted`
- **Hairline Borders**: `--luxe-border`
- **Brand Accents**: `--luxe-gold`, `--luxe-emerald`, `--luxe-whatsapp`
- **Depth & Shadows**: Hardware-accelerated ambient shadows (`--luxe-shadow-md`, `--luxe-shadow-float`)

## 3. Deliberate Typography Pairings
- **Display / Editorial**: `Fraunces` or `Cormorant Garamond` with italic emotional accents (`where luxury slows down`, `rooms that don't compete with the view`).
- **Body & Functional UI**: `Plus Jakarta Sans` or `Outfit` with high x-height and clear numeric tabular spacing.
- **Micro-labels**: Strict uppercase tracking (`letter-spacing: 0.14em; font-size: 10.5px; font-weight: 800;`).

## 4. Purposeful Motion Principles
- Every animation must feel organic and physical (e.g., `cubic-bezier(0.16, 1, 0.3, 1)`).
- Never animate width/height directly; animate `transform` and `opacity` with `will-change`.
- Respect `prefers-reduced-motion`.
