# Exceed

A lightweight internal dashboard for lead tracking, analytics, and status-based reporting.

## Features

- Secure login flow with JWT auth
- Dashboard with KPI cards, filters, trend charts, and location chart
- Leads management with multiple emails, locations, and phone numbers
- Status-based reporting and dashboard summarization
- AI-powered report generation through Gemini
- DOCX download export for management reporting
- Prisma + PostgreSQL schema for production persistence
- Render deployment config

## Default login

- Email: admin@exceed.local
- Password: admin123

Update these values in your Render environment variables or `.env` file before production use.

## Local development

1. Install dependencies
   npm install
2. Create your `.env` file based on `.env.example`
3. Push Prisma schema
   npx prisma db push
4. Start the application
   npm run dev

The frontend runs on port 3000 and the backend runs on port 4000.

## Production / Render

1. Add your PostgreSQL connection string in `DATABASE_URL`
2. Add a valid `GEMINI_API_KEY` for AI report generation
3. Deploy with the included `render.yaml`

The app will serve the built React frontend and API routes from the same Node service.
