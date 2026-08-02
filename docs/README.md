# SchulOS

**Free & open-source competence & grading platform for schools**

_Kompetenzorientierte Beurteilung fur alle_

---

## What is SchulOS?

SchulOS is a comprehensive, free, and open-source web application designed for schools to track student competencies, manage assessments, compute grades, and generate reports. Built with modern web technologies, it provides a rich, professional interface for teachers, school administrators, students, and parents.

## Features

### Core Modules
- **Dashboard** — Overview with KPIs, trends, recent activity, and quick actions
- **Classes & Students** — Manage classes, enrollments, seating order, and student profiles
- **Competency Grids** — Assign and track competency templates per class and subject
- **Progress Entries** — Record and visualize student learning progress over time
- **Competence Flower** — Radar chart visualization of student competencies per subject
- **Mastery Matrix** — Grid view of student mastery levels across all competencies
- **Assessments** — Create and manage tests, oral exams, projects, and homework
- **Grading** — Compute grades with configurable weight rules, overrides, and breakdowns
- **Reports** — Generate narrative report cards with phrase templates
- **Attendance** — Track student attendance with sessions, stats, and calendar heatmap
- **Calendar** — Unified calendar view of assessments, attendance, and deadlines
- **Lesson Plans** — Plan and manage lessons with objectives, materials, and reflections
- **Analytics** — Insights with mastery trends, risk detection, and competency analysis

### Additional Features
- **Parent Communication** — Message system for parent-teacher communication
- **Behavior Tracking** — Incident logging with categories, severity, and follow-up
- **Rubric Library** — Create and share analytic/holistic rubrics
- **Comment Bank** — Reusable comment templates for report cards
- **Curriculum Coverage** — Track which competencies have been assessed
- **Settings** — Admin panel with user management, demo accounts, audit logs, and data export
- **Student Detail** — Comprehensive student profile with journey timeline, grades, and export

### Technical Features
- **Keyboard Shortcuts** — Cmd+K command palette, Cmd+1-9 view switching, Cmd+/ shortcuts dialog
- **Batch Operations** — Batch deletion of progress entries
- **Drag-and-Drop** — Student seating order reordering
- **Custom Color Palette** — 7 preset colors + custom picker for competence flower
- **Notification System** — Deadline reminders and missing observation alerts
- **Onboarding Tour** — Guided tour for new users
- **CSV Export** — Export student data as CSV
- **Print Support** — Print-optimized CSS for report generation
- **Dark Mode** — Full light/dark mode support with next-themes
- **i18n** — 700+ translation keys in German and English
- **Responsive Design** — Mobile-first responsive layout

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: Prisma ORM + SQLite
- **State**: Zustand + React Query
- **Charts**: Recharts (Radar, Bar, Line)
- **Auth**: Cookie-based sessions + bcryptjs
- **Icons**: Lucide React (no emojis)
- **Animations**: Framer Motion

## Getting Started

### Prerequisites
- Node.js 18+ or Bun
- npm, yarn, or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/cetinmustafa83/schulos.git
cd schulos

# Install dependencies
npm install
# or: bun install

# Set up environment
cp .env.example .env

# Push database schema
npm run db:push

# Generate Prisma client
npm run db:generate

# Seed demo data
npm run db:seed

# Start development server
npm run dev
```

### Demo Accounts

After seeding, you can log in with these demo accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | `demo@competencetrack.org` | `Demo2025!` |
| Teacher | `demo.teacher@competencetrack.org` | `Demo2025!` |
| Student | `demo.student@competencetrack.org` | `Demo2025!` |
| Parent | `demo.parent@competencetrack.org` | `Demo2025!` |

## Project Structure

```
schulos/
  src/
    app/              # Next.js App Router pages & API routes
      api/            # 34+ API endpoint directories
      globals.css     # Global styles & animations
      layout.tsx      # Root layout
      page.tsx        # Entry point (SPA)
    components/       # 26 React components
      auth-view.tsx
      dashboard-view.tsx
      classes-view.tsx
      competence-flower-view.tsx
      ...
    hooks/            # Custom React hooks
    lib/              # Utilities
      api.ts          # API client functions
      auth.ts         # Auth helpers
      db.ts           # Prisma client
      i18n.ts         # Internationalization (700+ keys)
      store.ts        # Zustand state management
      utils.ts        # Utility functions
  prisma/
    schema.prisma     # 30+ database models
    seed.ts           # Demo data seed script
  public/
    logo.svg          # App logo
```

## License

MIT License — see [LICENSE](./LICENSE) for details.

## Contributing

Contributions are welcome! This is a free and open-source project aimed at making competence-oriented assessment accessible to all schools.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**SchulOS** — Kompetenzorientierte Beurteilung fur alle
