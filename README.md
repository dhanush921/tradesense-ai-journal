# TradeSense AI Journal

TradeSense AI Journal is a premium, production-ready AI-powered Trading Journal SaaS application built using Next.js 15, React 19, TypeScript, TailwindCSS (v4), Framer Motion, and Firebase.

## Technology Stack
- **Frontend Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS (v4), Glassmorphism styling overrides
- **Charts & Graphs:** Recharts Area, Line, Bar, and Pie charts; interactive embedded TradingView Widget
- **Backend & Database:** Firebase Auth (Email/Google), Cloud Firestore, Firebase Storage
- **AI Engine:** OpenAI Chat Completions API with contextual performative advice (with intelligent rule-based fallbacks)

## Features
- **Secure Authentication:** Login, Signup, Forgot Password, and Google OAuth with client-side Auth Guards.
- **Dynamic Dashboard:** Real-time metrics calculations (Win Rate, Profit Factor, streaking counters, average hold duration, calendar profit distribution, equity curves).
- **Comprehensive Trade Form:** Log title, asset type, lot sizing, pricing metrics, emotional triggers, strategy used, note annotations, and upload up to 4 trade screenshots.
- **AI Analysis Review:** Instantly reviews saved trades to grade risk allocation, entry quality, exit timing, weaknesses, and improvement plans.
- **Mindset & Psychology Log:** Track mood indicators (FOMO, Revenge, Discipline) and focus stats, checking automated alerts.
- **Interactive Watchlists & Technicals:** Manage target price thresholds and load dynamic TradingView charts.
- **Objectives Tracker:** Add profit targets (Daily, Weekly, Monthly) and safety rules.
- **AI Coaching Chatbot:** Interactive coach chat answering free-form questions using your actual performance metrics.
- **Reporting & Data Portability:** Download Weekly/Monthly/Yearly PDF reports, CSV export, and import historical CSV files matching standard headers.

## Setup Instructions

### 1. Prerequisites
- Node.js v18.18.0 or later (v20.11.1+ recommended)
- npm or yarn

### 2. Installation
Clone or copy the directory and run:
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file (inspired by `.env.example`):
```env
OPENAI_API_KEY=your_openai_key
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### 5. Build for Production
To build a static/production compile:
```bash
npm run build
```

## Database Schema (Firestore)
- **users:** Users registry details.
- **settings:** User timezone, currency, default risk allocations.
- **trades:** Execution pricing, lot details, emotional states, screenshots.
- **aiReports:** AI-generated review ratings, strengths, and goals.
- **watchlists:** Alerts and TradingView ticker targets.
- **goals:** Daily/weekly targets and drawdown rules.
- **psychology:** Mindset logs, sleep hours, stress indexes.
- **notifications:** Overtrading/revenge reminders.
