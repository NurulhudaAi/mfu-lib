# MFU Muslim Club Library Management System

[![Live Demo](https://img.shields.io/badge/Live%20Demo-mcmfu--library.vercel.app-000000?style=for-the-badge&logo=vercel)](https://mcmfu-library.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-15+-000000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

A modern, minimalist library management web application designed for the **Mae Fah Luang University (MFU) Muslim Club**. Built with high performance, accessibility, clean architecture, and AI-powered automation.

---

## Key Features

### For Students & Readers
- **Curated Catalog & Fast Search:** Instant search across titles, authors, and categories with dynamic status badges (Available, Borrowed, Queued).
- **Smart Queue Reservation:** Automated FIFO queue system. When a book is returned, the next user in queue receives priority borrowing rights.
- **My Borrows Dashboard:** Real-time tracking of active borrows, due date countdowns, overdue indicators, and queue status.
- **Bilingual Interface:** Full localization support for both Thai and English.
- **Mobile-First Responsive Design:** Clean monochrome aesthetic optimized for smartphones, tablets, and desktops.

### For Administrators
- **AI-Powered Book Cover Scanner:** Take a photo or upload a book cover image; Google Gemini Vision extracts the title, author, publisher, and publication year automatically.
- **Barcode & ISBN Scanner:** Built-in camera scanner (powered by Quagga2) for quick book cataloging and checkouts.
- **Borrow & Return Lifecycle:** One-click confirmation, return tracking, and penalty calculations.
- **Dashboard & Analytics:** Overview metrics for total inventory, active borrows, overdue items, member engagement, and feedback.
- **Role-Based Admin Invitations:** Secure invite tokens for onboarding club officers without exposing master credentials.
- **Automated Email Notifications:** Scheduled daily cron jobs send due date reminders and return confirmations via SMTP (Gmail) and Resend.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js](https://nextjs.org/) (App Router, Server Components & Route Handlers) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) with Lucide Icons |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Storage, Auth) |
| **Vision AI** | [Google Gemini Flash](https://ai.google.dev/) (Book cover OCR & metadata extraction) |
| **Email Service** | [Nodemailer](https://nodemailer.com/) (SMTP) & [Resend](https://resend.com/) |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## Project Structure

```text
mfu-lib/
├── app/                        # Next.js App Router
│   ├── admin/                  # Admin dashboard & management routes
│   │   ├── announcements/      # Club news & announcements
│   │   ├── books/              # Inventory management & AI book scanner
│   │   ├── borrows/            # Active borrows & return approvals
│   │   ├── dashboard/          # Analytics & key performance metrics
│   │   ├── feedback/           # User reviews & suggestions
│   │   └── users/              # Member & admin role management
│   ├── api/                    # Serverless API route handlers
│   │   ├── borrow/             # Borrow & auto-queue dispatch
│   │   ├── cron/remind/        # Daily scheduled overdue email trigger
│   │   ├── queue/              # Queue join/cancel management
│   │   └── read-cover/         # Gemini Vision AI cover scanner
│   ├── books/                  # Book catalog & book detail views
│   ├── my-borrows/             # User borrowing history & active queue
│   └── login/                  # Authentication entry
├── components/                 # Reusable UI & client components
├── lib/                        # Core utilities (Supabase, Email, i18n)
├── database-schema.sql         # PostgreSQL schema, RLS policies, and triggers
└── public/                     # Static media & assets
```

---

## Getting Started

### 1. Prerequisites
- Node.js 18.x or later
- npm or yarn
- A [Supabase](https://supabase.com) project
- A [Google AI Studio API Key](https://aistudio.google.com/) (for book cover AI extraction)

### 2. Clone and Install Dependencies

```bash
git clone https://github.com/NurulhudaAi/mfu-lib.git
cd mfu-lib
npm install
```

### 3. Setup Environment Variables

Copy the example environment configuration:

```bash
cp .env.local.example .env.local
```

Fill in your actual credentials in `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_public_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BORROW_DAYS=14

# AI Vision & Metadata Extraction
GEMINI_API_KEY=your_gemini_api_key

# Email Notifications (SMTP)
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM="MFU Library <your_email@gmail.com>"

# Cron Security Secret
CRON_SECRET=your_random_secret_token
```

### 4. Database Setup

Execute the SQL script in [`database-schema.sql`](./database-schema.sql) in your Supabase SQL Editor. This sets up:
- Tables: `books`, `borrows`, `book_queue`, `profiles`, `announcements`, `feedback`, `admin_invitations`
- Storage buckets: `covers`, `avatars` (ensure buckets are set to public read)
- Row Level Security (RLS) policies for user privacy and role-based admin controls

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Production Build & Quality Assurance

Run type check and create an optimized production build:

```bash
# Type check
npx tsc --noEmit

# Production build
npm run build
```

---

## Deployment to Vercel

1. Push your repository to GitHub:
   ```bash
   git push origin main
   ```
2. Import the project into [Vercel](https://vercel.com).
3. Paste all variables from `.env.local` into the **Environment Variables** section on Vercel.
4. Set `NEXT_PUBLIC_APP_URL` to your production domain (e.g. `https://mcmfu-library.vercel.app`).
5. In **Supabase Authentication > URL Configuration**, add your production domain to **Site URL** and **Redirect URLs**:
   - `https://mcmfu-library.vercel.app/**`
   - `https://mcmfu-library.vercel.app/auth/callback`
   - `https://mcmfu-library.vercel.app/login`

---

## License

This project is open-source and maintained for the educational and community services of the **Mae Fah Luang University Muslim Club**.
