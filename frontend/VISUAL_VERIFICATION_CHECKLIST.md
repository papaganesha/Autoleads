# Visual Verification Checklist — Dark Theme Refactor

**Run `npm run dev` and navigate to each URL in your browser to verify visually.**

## Critical Tests (must verify before shipping)

### 1. Color System Consolidation
- [ ] **SearchPage** (`/`) 
  - Logo gradient: purple → cyan (matches header exactly)
  - "Leads" text in title: purple color
  - Search card title/inputs: dark background, correct focus ring color
  
- [ ] **Meus Leads** (`/leads`)
  - Temperature badges (ScoreBadge): shows FRIO (cyan), MORNO (orange), QUENTE (rose)
  - Avatar circles: purple background
  - Status dots in table: correct colors per LEAD_STATUS_STYLES
  - Export button: surface-alt background, not white

### 2. Forms & Input Consistency
- [ ] **DashboardPage** (navigate via search results)
  - All 6 filter dropdowns (Site, WhatsApp, Instagram, Facebook, Rating, Status): dark background with surface-border
  - **Focus state**: tab into any input → ring should be thin (ring-1) and purple
  - Sort dropdown: dark panel, active row shows purple background

- [ ] **LeadsListPage** (`/leads`)
  - Search input: dark background, borders correct
  - Sort menu: same dark dropdown as Dashboard

### 3. Error & Success States
- [ ] **LeadsListPage** (trigger error by clicking "Nova busca" on empty page)
  - Error banner: rose-500/30 border, rose-500/10 background, rose-400 text
  - Error button: rose-500/20 background

- [ ] **DeletionRequestPage** (`/solicitar-remocao`)
  - Success banner (if submitting form): emerald colors
  - Error banner: rose colors
  - Form inputs: dark theme, purple focus rings

### 4. Component-Specific Checks

#### ScoreBadge (in 2+ places)
- [ ] **LeadsListPage table**: FRIO/MORNO/QUENTE badges with chip ring
- [ ] **OutreachKanbanPage cards**: same badges within cards

#### LoadingSpinner
- [ ] Appears when loading pages: spinner should have purple top border, gray text

#### ProgressBar
- [ ] **DashboardPage during search**: gradient purple→cyan, text gray-200/400

#### FilterTabs
- [ ] **LeadsListPage** & **DashboardPage**:
  - Inactive tabs: light gray background, gray text
  - Active tab: colored chip (cyan for FRIO, orange for MORNO, rose for QUENTE, purple for TODOS)
  - Count badge: subtle background

#### LeadTable
- [ ] Name column: white text, purple avatar
- [ ] Rating: amber stars (exception, not changed) + gray-300 number
- [ ] Channel icons:
  - Website (Globe): cyan, dimmed if missing
  - WhatsApp (Message): green, dimmed if missing
  - Instagram: pink, dimmed if missing
  - Facebook: blue, dimmed if missing

#### GlassToggle
- [ ] On state: purple→cyan gradient
- [ ] Off state: surface-alt background
- [ ] Knob: white (unchanged)

#### OutreachKanbanPage
- [ ] Kanban columns: correct colored top bars per status
- [ ] Drag-and-drop: ring shows status color when dragging
- [ ] Hero panel: dark with surface-border, metrics cards with surface-alt
- [ ] Charts: renders correctly with dark background

## Regression Tests (to ensure nothing broke)

- [ ] All links still work (click 5 random links across pages)
- [ ] All buttons execute their actions
- [ ] Search form submits and shows results
- [ ] Temperature/status filters work
- [ ] Sort dropdowns change sort order
- [ ] Kanban: drag a card between columns (status updates)
- [ ] Modal (click lead name in table): opens, closes on X or outside click

## Accessibility Spot-Check

- [ ] Focus ring visible on inputs (use Tab key across SearchForm and DeletionRequestPage)
- [ ] If ring-1 is too thin, switch to ring-2 locally
- [ ] Text contrast: no text should be unreadable (gray-400 on dark backgrounds should have 5.5:1 ratio minimum)

---

## Once All Checks Pass
Run `npm run build && npm run dev` one more time, manually verify above list takes ~3 min.
If green, the refactor is complete. All files committed, build passes, visual consistency confirmed.

**Current Status**: Code changes complete + orphaned files deleted. Build passes.
**Next Step**: You run visual checks above in your browser, report any findings.
