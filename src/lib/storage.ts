import { Lead } from '../types';

const STORAGE_KEY = 'exceed-leads';

const sampleLeads: Lead[] = [
  {
    id: 'lead-1',
    name: 'Amina Yusuf',
    company: 'BrightPath Consulting',
    email: ['amina@brightpath.com', 'sales@brightpath.com'],
    location: ['Addis Ababa', 'Nairobi'],
    phone: ['+251911111111', '+254722222222'],
    contactPerson: 'Amina Yusuf',
    status: 'Interested',
    notes: 'Strong interest in strategy and transformation services.',
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: '2026-09-10T08:40:00.000Z',
  },
  {
    id: 'lead-2',
    name: 'Daniel Tesfaye',
    company: 'Nova Logistics',
    email: ['daniel@novalogistics.com'],
    location: ['Addis Ababa'],
    phone: ['+251922222222'],
    contactPerson: 'Daniel Tesfaye',
    status: 'Follow Up',
    notes: 'Requested an additional pricing proposal.',
    createdAt: '2026-09-12T12:00:00.000Z',
    updatedAt: '2026-09-18T14:30:00.000Z',
  },
  {
    id: 'lead-3',
    name: 'Selam Bekele',
    company: 'Aster Digital',
    email: ['selam@asterdigital.io', 'ops@asterdigital.io'],
    location: ['Dire Dawa', 'Cairo'],
    phone: ['+251933333333'],
    contactPerson: 'Selam Bekele',
    status: 'Qualified',
    notes: 'Decision maker confirmed and budget discussed.',
    createdAt: '2026-09-15T16:25:00.000Z',
    updatedAt: '2026-09-22T15:00:00.000Z',
  },
  {
    id: 'lead-4',
    name: 'Kebede Alemu',
    company: 'Green Valley Foods',
    email: ['kebede@greenvalleyfoods.com'],
    location: ['Addis Ababa', 'Harar'],
    phone: ['+251944444444', '+251955555555'],
    contactPerson: 'Kebede Alemu',
    status: 'Closed Won',
    notes: 'Project approved and kickoff scheduled.',
    createdAt: '2026-08-20T08:00:00.000Z',
    updatedAt: '2026-09-25T13:00:00.000Z',
  },
];

export const loadLeads = (): Lead[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleLeads));
      return sampleLeads;
    }
    const parsed = JSON.parse(raw) as Lead[];
    return parsed.length ? parsed : sampleLeads;
  } catch {
    return sampleLeads;
  }
};

export const saveLeads = (leads: Lead[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
};
