export type Lead = {
  id: string;
  name: string;
  company: string;
  email: string[];
  location: string[];
  phone: string[];
  contactPerson: string;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type MenuName = 'dashboard' | 'leads' | 'reports';
