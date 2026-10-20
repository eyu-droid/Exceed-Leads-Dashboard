import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const app = express();
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || 'exceed-secret-dev';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@exceed.local').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

const issueToken = (user) => jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
  expiresIn: '7d',
});

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

async function seedAdmin() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (existing) return;

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await prisma.user.create({
    data: {
      name: 'System Admin',
      email: ADMIN_EMAIL,
      passwordHash,
      role: 'admin',
    },
  });
}

function normalizeLead(lead) {
  return {
    id: lead.id,
    name: lead.name,
    company: lead.company,
    email: Array.isArray(lead.email) ? lead.email : [],
    location: Array.isArray(lead.location) ? lead.location : [],
    phone: Array.isArray(lead.phone) ? lead.phone : [],
    contactPerson: lead.contactPerson,
    status: lead.status,
    notes: lead.notes || '',
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

function buildStatusSummary(leads) {
  const map = {};
  leads.forEach((lead) => {
    map[lead.status] = (map[lead.status] || 0) + 1;
  });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

function buildLocationSummary(leads) {
  const map = {};
  leads.forEach((lead) => {
    (lead.location || []).forEach((location) => {
      map[location] = (map[location] || 0) + 1;
    });
  });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

function buildTrendSummary(leads) {
  const map = {};

  leads.forEach((lead) => {
    const date = new Date(lead.createdAt).toISOString().slice(0, 10);
    map[date] = (map[date] || 0) + 1;
  });

  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, total]) => ({ date, total }));
}

async function generateGeminiNarrative(leads, title) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return '';

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `You are an internal business reporting assistant. Write a professional internal report based on the following leads. Include short insights and next-step recommendations.\n\nTitle: ${title}\n\nLeads JSON:\n${JSON.stringify(leads, null, 2)}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini generation failed:', error.message);
    return '';
  }
}

async function createDocFile({ title, reportText, leads }) {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: title || 'Exceed Lead Report',
          heading: HeadingLevel.TITLE,
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Executive Summary', bold: true })],
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({ text: reportText || 'Summary unavailable.' }),
        new Paragraph({
          children: [new TextRun({ text: 'Lead Details', bold: true })],
          heading: HeadingLevel.HEADING_1,
        }),
        ...leads.flatMap((lead) => [
          new Paragraph({
            text: `${lead.name} — ${lead.company}`,
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({ text: `Contact person: ${lead.contactPerson}` }),
          new Paragraph({ text: `Email: ${(lead.email || []).join(', ') || 'No email provided'}` }),
          new Paragraph({ text: `Phone: ${(lead.phone || []).join(', ') || 'No phone provided'}` }),
          new Paragraph({ text: `Locations: ${(lead.location || []).join(', ') || 'No locations provided'}` }),
          new Paragraph({ text: `Status: ${lead.status}` }),
          new Paragraph({ text: `Notes: ${lead.notes || 'No notes provided'}` }),
        ]),
      ],
    }],
  });

  return Packer.toBuffer(doc);
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Exceed API is running.' });
});

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  return res.json({
    token: issueToken(user),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

app.get('/api/auth/me', authRequired, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

app.get('/api/leads', authRequired, async (req, res) => {
  const leads = await prisma.lead.findMany({ orderBy: { updatedAt: 'desc' } });
  return res.json(leads.map(normalizeLead));
});

app.post('/api/leads', authRequired, async (req, res) => {
  const body = req.body || {};

  const lead = await prisma.lead.create({
    data: {
      name: String(body.name || '').trim(),
      company: String(body.company || '').trim(),
      email: Array.isArray(body.email) ? body.email : String(body.email || '').split(',').map((item) => item.trim()).filter(Boolean),
      location: Array.isArray(body.location) ? body.location : String(body.location || '').split(',').map((item) => item.trim()).filter(Boolean),
      phone: Array.isArray(body.phone) ? body.phone : String(body.phone || '').split(',').map((item) => item.trim()).filter(Boolean),
      contactPerson: String(body.contactPerson || body.name || '').trim(),
      status: String(body.status || 'New').trim(),
      notes: String(body.notes || '').trim(),
    },
  });

  return res.status(201).json(normalizeLead(lead));
});

app.put('/api/leads/:id', authRequired, async (req, res) => {
  const existing = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: 'Lead not found.' });
  }

  const body = req.body || {};
  const updated = await prisma.lead.update({
    where: { id: req.params.id },
    data: {
      name: String(body.name ?? existing.name).trim(),
      company: String(body.company ?? existing.company).trim(),
      email: Array.isArray(body.email) ? body.email : String(body.email ?? existing.email.join(', ')).split(',').map((item) => item.trim()).filter(Boolean),
      location: Array.isArray(body.location) ? body.location : String(body.location ?? existing.location.join(', ')).split(',').map((item) => item.trim()).filter(Boolean),
      phone: Array.isArray(body.phone) ? body.phone : String(body.phone ?? existing.phone.join(', ')).split(',').map((item) => item.trim()).filter(Boolean),
      contactPerson: String(body.contactPerson ?? existing.contactPerson).trim(),
      status: String(body.status ?? existing.status).trim(),
      notes: String(body.notes ?? existing.notes ?? '').trim(),
    },
  });

  return res.json(normalizeLead(updated));
});

app.delete('/api/leads/:id', authRequired, async (req, res) => {
  await prisma.lead.delete({ where: { id: req.params.id } }).catch(() => null);
  return res.json({ ok: true });
});

app.get('/api/dashboard/summary', authRequired, async (req, res) => {
  const leads = (await prisma.lead.findMany({ orderBy: { createdAt: 'asc' } })).map(normalizeLead);

  const statusBreakdown = buildStatusSummary(leads);
  const locationBreakdown = buildLocationSummary(leads);
  const trend = buildTrendSummary(leads);
  const active = leads.filter((lead) => ['Interested', 'Follow Up', 'Qualified', 'Closed Won', 'Proposal Sent', 'Negotiation'].includes(lead.status)).length;

  return res.json({
    total: leads.length,
    active,
    won: leads.filter((lead) => /won/i.test(lead.status)).length,
    statusBreakdown,
    locationBreakdown,
    trend,
  });
});

app.post('/api/reports/generate-docx', authRequired, async (req, res) => {
  const { title = 'Exceed Lead Report', leads = [], narrative = '' } = req.body || {};
  const rows = Array.isArray(leads) && leads.length ? leads : await prisma.lead.findMany({ orderBy: { updatedAt: 'desc' } });
  const normalizedLeads = rows.map(normalizeLead);
  const generated = narrative || (await generateGeminiNarrative(normalizedLeads, title));
  const buffer = await createDocFile({
    title,
    reportText: generated || 'The team has continued monitoring an active pipeline and should focus on conversion and follow-up priorities.',
    leads: normalizedLeads,
  });

  res.setHeader('Content-Disposition', `attachment; filename="${(title || 'exceed-report').replace(/\s+/g, '-').toLowerCase()}.docx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  return res.send(buffer);
});

const distFolder = path.join(__dirname, 'dist');
const distIndex = path.join(distFolder, 'index.html');

if (fs.existsSync(distIndex)) {
  app.use(express.static(distFolder));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(distIndex);
  });
}

async function start() {
  await seedAdmin();
  app.listen(PORT, () => {
    console.log(`Exceed backend running on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
