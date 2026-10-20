# Exceed Leads Dashboard

A modern lead dashboard and reporting app built in React + TypeScript, designed to match the style of the FutureTech admin dashboard while adding lead management, status-driven analytics, and Word report downloads.

## Features

- Dashboard with KPI cards, trend charts, status chart, and date filtering
- Leads management with add, edit, delete, and search
- Multiple emails, locations, and phone numbers per lead
- Status text and analytics connected to summaries and charts
- DOCX report export for lead review
- Logout flow for session completion
- Prisma schema ready for PostgreSQL and Render deployment

## Local development

1. Install dependencies:
   npm install
2. Start the app:
   npm run dev
3. Build for production:
   npm run build

## PostgreSQL / Prisma setup

1. Copy `.env.example` to `.env`
2. Set a working `DATABASE_URL`
3. Run:
   npx prisma generate
   npx prisma db push

## Render deployment

Use Render's "Web Service" with the following configuration:

- Build command: `npm install && npm run build`
- Start command: `npm run dev -- --host 0.0.0.0 --port 10000`
- Environment variables:
  - `NODE_ENV=production`
  - `DATABASE_URL=postgresql://...`

For a production deployment, it is recommended to add a small API server or switch the app to a Node backend for Prisma access, while keeping the Vite frontend as a static build.

## Notes

- This version stores data in the browser localStorage by default.
- The Prisma schema is included for database-ready integration when you are ready to move to PostgreSQL in Render.
- The DOCX export uses the `docx` library and can be extended with Gemini-generated business narrative once an API key is supplied.
