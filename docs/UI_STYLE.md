# The Uncovery Devotional — UI Style Guide

## Design Goals
- Reflective, calm, and hopeful
- Inspired by the book cover (cross, road, sunrise)
- Feels like reading a printed devotional, not a tech product
- Personal and encouraging — never clinical or dashboard-like

---

## Color Palette (Tailwind Custom Colors)

| Name | Usage |
|---|---|
| `canvas` | Warm off-white — card backgrounds, input backgrounds |
| `charcoal` | Primary text color — not pure black |
| `steel` | Muted steel blue — buttons, links, labels, borders |
| `muted` | Soft gray — secondary text, dates, placeholders |
| `sunrise` | Warm orange — destructive actions (delete, leave), highlights |
| `brand-blue` | Brighter blue — page titles, hero text |

These are defined in `tailwind.config.ts`.

---

## Background
- All pages share a **fixed dark hero background** — a photo with a `bg-black/50` overlay
- Set in `app/layout.tsx`, not individual pages
- White text on this background requires `text-shadow-hero` utility class for readability
- Content cards sit on top of this background with `bg-white` or `bg-canvas`

---

## Typography

| Element | Style |
|---|---|
| Page titles | `text-2xl font-semibold text-white text-shadow-hero` |
| Section labels | `text-xs uppercase tracking-widest text-steel` |
| Devotion body | `font-serif` — printed book feel |
| Prayer section | `font-serif` with soft background separation |
| Verse text | Italic, slight indent or left border |
| Body text | `text-sm text-charcoal` |
| Muted/secondary | `text-sm text-muted` |

---

## Layout
- Mobile-first
- Centered reading column: `max-w-reading` (defined in Tailwind config, ~700px)
- `px-4` horizontal padding
- `pt-10 pb-24` on mobile (extra bottom padding for nav bar), `pb-10` on desktop
- Generous vertical spacing between sections (`space-y-6` or `space-y-8`)

---

## Cards
- `rounded-2xl border border-steel/20 bg-white p-6 shadow-sm`
- Subtle shadow, gentle border, no harsh elevation
- Content inside uses `space-y-4` or `space-y-5`

---

## Buttons

Primary:
```
rounded-lg bg-steel px-4 py-2.5 text-white text-sm font-medium hover:bg-steel/90 transition-colors
```

Destructive (delete/leave):
```
rounded-lg bg-sunrise px-4 py-2.5 text-white text-sm font-medium hover:bg-sunrise/90 transition-colors
```

Text/ghost:
```
text-sm text-muted hover:text-charcoal transition-colors
```

Full-width (modals/forms):
```
w-full rounded-xl bg-steel px-4 py-3 text-center text-sm font-medium text-white
```

---

## Inputs
```
w-full rounded-lg border border-steel/20 bg-canvas px-3 py-2.5 text-charcoal placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-steel/30
```

---

## Navigation

**Header** (`components/Header.tsx`):
- Minimal, shows app name and nav links on desktop
- Links: Today | Groups | (Admin if admin) | Profile

**Bottom Nav** (`components/BottomNav.tsx`):
- Visible on mobile only
- Tabs: Home | Today | Groups | Search | More

---

## Modals
- `fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 px-4`
- Card: `w-full max-w-sm rounded-2xl border border-steel/20 bg-white p-6 shadow-lg`
- Click outside to dismiss
- Always have a Cancel option alongside the confirm action

---

## Animations
- Framer Motion used on `/welcome` page only (stagger entrance animation)
- Keep animations subtle: `opacity 0→1`, `y 14→0`, `duration 0.5`
- No animations on functional UI — only on onboarding/first impression screens

---

## Emotional Tone

The app should feel:
- Gentle and grounded
- Spacious — never cluttered
- Personal and encouraging
- Sacred without being heavy

Avoid:
- Loud animations or transitions
- Heavy gradients
- Bright tech colors
- Overly modern "SaaS dashboard" aesthetics
- Pure black or pure white (use charcoal and canvas instead)
