import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { Lead } from '../types';

const statusSummary = (leads: Lead[]) => {
  const counts: Record<string, number> = {};

  leads.forEach((lead) => {
    counts[lead.status] = (counts[lead.status] ?? 0) + 1;
  });

  return Object.entries(counts)
    .map(([status, count]) => `${status}: ${count}`)
    .join(', ');
};

export const generateLeadReport = (title: string, leads: Lead[], extraNarrative: string) => {
  const total = leads.length;
  const qualified = leads.filter((lead) => /qualified|interested|closed won|follow up/i.test(lead.status)).length;
  const locations = new Set(leads.flatMap((lead) => lead.location)).size;
  const summaryText = statusSummary(leads) || 'No status data';

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Generated for ${total} leads`, bold: true }),
            ],
          }),
          new Paragraph({
            text: `Total leads reviewed: ${total}`,
          }),
          new Paragraph({
            text: `Qualified or active leads: ${qualified}`,
          }),
          new Paragraph({
            text: `Locations represented: ${locations}`,
          }),
          new Paragraph({
            text: `Status summary: ${summaryText}`,
          }),
          new Paragraph({
            text: 'Executive Summary',
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: extraNarrative || 'The team has a healthy pipeline across key statuses. Continued follow-up and lead nurturing remain essential to convert interest into confirmed wins.',
          }),
          new Paragraph({
            text: 'Lead Details',
            heading: HeadingLevel.HEADING_1,
          }),
          ...leads.flatMap((lead) => [
            new Paragraph({
              text: `${lead.name} — ${lead.company}`,
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              text: `Contact person: ${lead.contactPerson}`,
            }),
            new Paragraph({
              text: `Email: ${lead.email.join(', ') || 'No email provided'}`,
            }),
            new Paragraph({
              text: `Phone: ${lead.phone.join(', ') || 'No phone provided'}`,
            }),
            new Paragraph({
              text: `Location: ${lead.location.join(', ') || 'No location provided'}`,
            }),
            new Paragraph({
              text: `Status: ${lead.status}`,
            }),
            new Paragraph({
              text: `Notes: ${lead.notes || 'No notes provided'}`,
            }),
          ]),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
};
