# MFU Library

A modern web application for managing book circulation, waitlist queues, and catalog inventory for the Mae Fah Luang University Muslim Club community. Built with Next.js, Supabase, Tailwind CSS, and Google Gemini AI.

Production URL: https://mcmfu-library.vercel.app

---

## Overview

MFU Library is designed to simplify book lending for university club members while giving administrators full visibility into their collection. The system replaces manual spreadsheets with automated queues, book availability tracking, and automated email reminders for returns.

---

## Core Features

### Member Experience
- Catalog Browsing: Instant keyword search, category filtering, and related book suggestions.
- Queue and Waitlist: When a book is currently borrowed, members can join a waitlist. Once the copy is returned, the next queued member is promoted to borrow.
- Circulation Dashboard: A personal "My Borrows" area tracking active loans, due dates, past borrow history, and queue position.
- Localization: Bilingual user interface supporting English and Thai.

### Administrative Tools
- Inventory Management: Add, edit, archive, and monitor physical book copies with availability tracking.
- AI Cover Vision: Upload or capture a book cover with a camera. Google Gemini Vision extracts the title, author, publisher, and publication year directly from the cover image.
- Member Administration: Role-based access control (Admin and Member), secure invitation links with token expiration, and member borrow audits.
- Announcements & Notices: Broadcast club announcements with pinned alerts and category tags.
- Circulation Monitoring: Live status tracking for active, overdue, and returned books.

### Notifications & Automation
- Automated Email Dispatch: Sends transaction receipts, return confirmations, and reminder notices via Gmail SMTP / Resend.
- Daily Cron Reminders: Scheduled cron endpoint to identify overdue loans and notify borrowers.

---

## Tech Stack

- Framework: Next.js (App Router, React Server Components)
- Language: TypeScript
- Database & Auth: Supabase (PostgreSQL with Row Level Security, Supabase Auth, Supabase Storage)
- Styling: Tailwind CSS (Monochrome, responsive, high-contrast design system)
- AI & Vision: Google Gemini API (gemini-1.5-flash / gemini-2.0-flash)
- Email Engine: Nodemailer (Gmail SMTP transport) with Resend fallback
- Hosting: Vercel

---

## Getting Started

### Prerequisites
- Node.js 18.18 or higher
- npm or yarn
- A Supabase project with PostgreSQL

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/NurulhudaAi/mfu-lib.git
   cd mfu-lib
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in the required credentials:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # SMTP / Email
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-google-app-password
   SMTP_FROM="MFU Library <your-email@gmail.com>"

   # AI Cover Vision
   GEMINI_API_KEY=your-gemini-api-key

   # App Settings
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_BORROW_DAYS=14
   CRON_SECRET=your-random-cron-secret
   ```

4. Database Setup:
   Execute the schema defined in `database-schema.sql` inside your Supabase SQL Editor. This configures the required tables, triggers, and Row Level Security policies.

5. Run the development server:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 in your browser.

---

## Building for Production

To create an optimized production build:

```bash
npm run build
npm run start
```

---

## Deployment on Vercel

1. Push your code to GitHub.
2. Import the repository in Vercel.
3. Configure Environment Variables in Project Settings matching `.env.local.example`, setting `NEXT_PUBLIC_APP_URL` to your production domain (`https://mcmfu-library.vercel.app`).
4. In Supabase Dashboard under Authentication -> URL Configuration:
   - Set Site URL to `https://mcmfu-library.vercel.app`
   - Add `https://mcmfu-library.vercel.app/**` and `https://mcmfu-library.vercel.app/auth/callback` to Redirect URLs.
5. In Supabase Storage, ensure the `covers` and `avatars` buckets are created and set to Public.

---

## Project Structure

```
├── app/                  # Next.js App Router pages and API routes
│   ├── admin/            # Admin console views
│   ├── api/              # Server route handlers (borrow, queue, AI vision, cron)
│   ├── auth/             # Supabase authentication callback handlers
│   └── books/            # Catalog and book detail pages
├── components/           # Reusable UI components
├── lib/                  # Utilities (Supabase clients, email transport, i18n)
├── database-schema.sql   # PostgreSQL database schema and RLS policies
└── public/               # Static assets
```

---

## Maintainers

Maintained by the Mae Fah Luang University Muslim Club development team.
