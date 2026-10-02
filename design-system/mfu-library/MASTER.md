# Design System Master File — Minimalist Monochrome (Black & White)

> **LOGIC:** When building or updating a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** MFU Library  
**Theme:** Minimalist & Swiss Modernism (Monochrome Black & White)  
**Target Roles:** Member & Admin  
**Design Philosophy:** Pure clarity, high contrast, zero unnecessary ornamentation, essential typographic hierarchy, crisp borders.

---

## 1. Global Color Palette (Monochrome Black & White)

| Role | Light Mode Hex | Dark Mode Hex | Usage |
|------|----------------|---------------|-------|
| **Background (Canvas)** | `#FAFAFA` / `#FFFFFF` | `#0A0A0C` / `#000000` | Main window & body canvas |
| **Card / Surface** | `#FFFFFF` | `#121214` / `#18181B` | Cards, modals, drawers, panels |
| **Foreground (Primary Text)** | `#09090B` | `#FAFAFA` | Main headings, primary copy |
| **Muted Text** | `#71717A` | `#A1A1AA` | Subtitles, metadata, timestamps |
| **Faint Text** | `#A1A1AA` | `#52525B` | Captions, placeholders, disabled states |
| **Border / Divider** | `#E4E4E7` | `#27272A` | Card edges, table dividers, input borders |
| **Primary Action (CTA)** | `#000000` (text: `#FFF`) | `#FFFFFF` (text: `#000`) | Main submit buttons, active tabs, primary badges |
| **Secondary Action** | `#F4F4F5` (text: `#18181B`) | `#27272A` (text: `#FAFAFA`) | Secondary buttons, ghost controls |
| **Destructive / Alert** | `#18181B` or `#DC2626` | `#FAFAFA` or `#EF4444` | High-contrast warning/destructive (functional only) |

---

## 2. Typography & Hierarchy

- **Font Family:** `Sarabun`, `Prompt`, `system-ui`, sans-serif (clean sans-serif for Thai & English)
- **Hierarchy:**
  - Page Titles: `text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white`
  - Section Headers: `text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-white`
  - Card Titles: `text-sm sm:text-base font-semibold text-neutral-900 dark:text-white`
  - Body Text: `text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed`
  - Microcopy / Badges: `text-[10px] sm:text-xs font-semibold tracking-wider uppercase`

---

## 3. Component Standards

### Buttons
- **Primary CTA:**
  `bg-black hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-semibold rounded-xl transition-all shadow-xs active:scale-[0.98]`
- **Secondary / Ghost:**
  `bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-medium rounded-xl transition-all`
- **Outline / Bordered:**
  `border border-neutral-300 dark:border-neutral-700 hover:border-black dark:hover:border-white text-neutral-700 dark:text-neutral-300 font-medium rounded-xl transition-all`

### Status Badges
- **Available / Success / Active:**
  `bg-black text-white dark:bg-white dark:text-black font-semibold text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full`
- **Borrowed / In Progress:**
  `bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full`
- **Overdue / Alert:**
  `bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-bold border border-neutral-700 dark:border-neutral-300 text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full`

### Inputs & Forms
- `bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-black dark:focus:border-white outline-none transition-colors`

### Cards & Panels
- `bg-white dark:bg-[#121214] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs hover:border-black dark:hover:border-white transition-all`

---

## 4. Member vs Admin Guidelines

- **Member Experience:**
  - Fast book browsing, instant search, clear copy availability counter.
  - Large cover art, easy 1-click borrow or return.
  - Uncluttered personal dashboard (`/my-borrows`) with clean history table.
- **Admin Experience:**
  - High-density data presentation with minimal visual noise.
  - Quick action tables for Books, Borrows, Queues, Users, and Feedback.
  - Monochromatic toggle pills (เปิด/ปิด), modal confirmations with clear action verbs.
  - No colored noise — black/white contrast indicates selection and state.
