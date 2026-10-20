const currentYear = new Date().getFullYear();

export const formatDate = (value: string | undefined) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : new Intl.DateTimeFormat('en-ET', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

export const getDefaultReportNarrative = (leads: any[]) => {
  const total = leads.length;
  const active = leads.filter((lead) => ['Interested', 'Follow Up', 'Qualified', 'Closed Won'].includes(lead.status)).length;
  const statusList = [...new Set(leads.map((lead) => lead.status))].join(', ') || 'No statuses logged';

  return `This report covers ${total} leads. ${active} leads are currently active or progressing through the pipeline. Primary status signals include ${statusList}. The sales process remains active across multiple regions and should continue to focus on targeted follow-up and conversion conversion opportunities.`;
};

export const getStatusColors: Record<string, string> = {
  'Interested': '#3b82f6',
  'Follow Up': '#f59e0b',
  'Qualified': '#22c55e',
  'Closed Won': '#10b981',
  'Closed Lost': '#ef4444',
  'New': '#8b5cf6',
};

export const getStatusOptions = () => [
  'New',
  'Interested',
  'Follow Up',
  'Qualified',
  'Closed Won',
  'Closed Lost',
  'Proposal Sent',
  'Negotiation',
  'On Hold',
];

export const getDashboardDateRange = (leads: any[], start: string, end: string) => {
  if (!start && !end) return leads;

  return leads.filter((lead) => {
    const createdAt = new Date(lead.createdAt);
    const from = start ? new Date(start) : null;
    const to = end ? new Date(`${end}T23:59:59.999Z`) : null;

    if (from && createdAt < from) return false;
    if (to && createdAt > to) return false;

    return true;
  });
};

export const getStatusDistribution = (leads: any[]) => {
  const counts: Record<string, number> = {};

  leads.forEach((lead) => {
    counts[lead.status] = (counts[lead.status] ?? 0) + 1;
  });

  return Object.entries(counts).map(([name, value]) => ({ name, value }));
};

export const getLocationDistribution = (leads: any[]) => {
  const counts: Record<string, number> = {};

  leads.forEach((lead) => {
    lead.location.forEach((location: string) => {
      counts[location] = (counts[location] ?? 0) + 1;
    });
  });

  return Object.entries(counts).map(([name, value]) => ({ name, value }));
};

export const getTrendData = (leads: any[]) => {
  const map: Record<string, number> = {};

  leads.forEach((lead) => {
    const day = new Date(lead.createdAt).toISOString().slice(0, 10);
    map[day] = (map[day] ?? 0) + 1;
  });

  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, total]) => ({ date, total }));
};

export const getLeadCountByStatus = (leads: any[]) => {
  return Object.fromEntries(
    Object.entries(
      leads.reduce((acc: Record<string, number>, lead) => {
        acc[lead.status] = (acc[lead.status] ?? 0) + 1;
        return acc;
      }, {})
    ).sort(([a], [b]) => a.localeCompare(b))
  );
};

export const getReportMonth = () => new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date());

export const yearLabel = currentYear;
