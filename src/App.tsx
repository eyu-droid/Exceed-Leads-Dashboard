import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Download,
  Filter,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import { formatDate, getDashboardDateRange, getLocationDistribution, getStatusColors, getStatusDistribution, getTrendData, getDefaultReportNarrative, yearLabel } from './utils';
import { generateLeadReport } from './report';
import { loadLeads, saveLeads } from './storage';
import { Lead, MenuName } from '../types';

const emptyForm = {
  name: '',
  company: '',
  email: '',
  location: '',
  phone: '',
  contactPerson: '',
  status: 'New',
  notes: '',
};

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];

const sortLeads = (items: Lead[]) => [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [menu, setMenu] = useState<MenuName>('dashboard');
  const [leads, setLeads] = useState<Lead[]>(() => loadLeads());
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [reportTitle, setReportTitle] = useState(`Exceed Sales Report - ${yearLabel}`);
  const [reportNarrative, setReportNarrative] = useState('');

  useEffect(() => {
    saveLeads(leads);
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const rangeFiltered = getDashboardDateRange(leads, dateStart, dateEnd);
    return sortLeads(
      rangeFiltered.filter((lead) => {
        const haystack = `${lead.name} ${lead.company} ${lead.status} ${lead.contactPerson} ${lead.location.join(' ')}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      })
    );
  }, [leads, search, dateStart, dateEnd]);

  const totalLeads = filteredLeads.length;
  const wonLeads = filteredLeads.filter((lead) => lead.status.toLowerCase().includes('won')).length;
  const followUps = filteredLeads.filter((lead) => lead.status.toLowerCase().includes('follow')).length;
  const avgPerRegion = filteredLeads.length ? Math.round(filteredLeads.reduce((sum, lead) => sum + lead.location.length, 0) / filteredLeads.length) : 0;

  const statusData = useMemo(() => getStatusDistribution(filteredLeads), [filteredLeads]);
  const locationData = useMemo(() => getLocationDistribution(filteredLeads), [filteredLeads]);
  const trendData = useMemo(() => getTrendData(filteredLeads), [filteredLeads]);

  const handleInputChange = (field: keyof typeof emptyForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const nextLead: Lead = {
      id: editingId ?? crypto.randomUUID(),
      name: form.name.trim(),
      company: form.company.trim(),
      email: form.email.split(',').map((item) => item.trim()).filter(Boolean),
      location: form.location.split(',').map((item) => item.trim()).filter(Boolean),
      phone: form.phone.split(',').map((item) => item.trim()).filter(Boolean),
      contactPerson: form.contactPerson.trim() || form.name.trim(),
      status: form.status,
      notes: form.notes.trim(),
      createdAt: editingId ? leads.find((lead) => lead.id === editingId)?.createdAt ?? new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingId) {
      setLeads((current) => current.map((lead) => (lead.id === editingId ? nextLead : lead)));
    } else {
      setLeads((current) => [nextLead, ...current]);
    }

    resetForm();
  };

  const handleEdit = (lead: Lead) => {
    setEditingId(lead.id);
    setForm({
      name: lead.name,
      company: lead.company,
      email: lead.email.join(', '),
      location: lead.location.join(', '),
      phone: lead.phone.join(', '),
      contactPerson: lead.contactPerson,
      status: lead.status,
      notes: lead.notes,
    });
    setMenu('leads');
  };

  const handleDelete = (leadId: string) => {
    setLeads((current) => current.filter((lead) => lead.id !== leadId));
  };

  const handleDownloadReport = async () => {
    const data = filteredLeads.length ? filteredLeads : leads;
    const narrative = reportNarrative || getDefaultReportNarrative(data);
    const blob = await generateLeadReport(reportTitle || 'Exceed Lead Report', data, narrative);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(reportTitle || 'lead-report').replace(/\s+/g, '-').toLowerCase()}.docx`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const renderDashboard = () => (
    <div className="content-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Dashboard</h1>
        </div>
        <div className="date-filter">
          <label>
            <span>From</span>
            <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
          </label>
          <label>
            <span>To</span>
            <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
          </label>
          {(dateStart || dateEnd) && (
            <button className="secondary-button" onClick={() => { setDateStart(''); setDateEnd(''); }}>
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <StatCard title="Total Leads" value={String(totalLeads)} icon={<Users size={18} />} accent="blue" />
        <StatCard title="Qualified" value={String(wonLeads + followUps)} icon={<UserRoundCheck size={18} />} accent="green" />
        <StatCard title="Won Deals" value={String(wonLeads)} icon={<BriefcaseBusiness size={18} />} accent="purple" />
        <StatCard title="Avg Locations" value={String(avgPerRegion)} icon={<Building2 size={18} />} accent="orange" />
      </div>

      <div className="chart-grid">
        <div className="chart-card large">
          <div className="chart-title-row">
            <h3>Lead trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="date" stroke="#cbd5e1" />
              <YAxis stroke="#cbd5e1" />
              <Tooltip />
              <Area type="monotone" dataKey="total" stroke="#818cf8" fill="url(#trendFill)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-title-row">
            <h3>Status split</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={getStatusColors[entry.name] ?? '#64748b'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-title-row">
          <h3>Location activity</h3>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={locationData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis dataKey="name" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip />
            <Bar dataKey="value" fill="#22c55e" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderLeads = () => (
    <div className="content-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Leads</h1>
        </div>
        <div className="search-box">
          <Search size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads" />
        </div>
      </div>

      <div className="lead-layout">
        <form className="lead-form" onSubmit={handleSubmit}>
          <div className="section-title-row">
            <h3>{editingId ? 'Edit lead' : 'Add lead'}</h3>
          </div>

          <div className="field-grid">
            <label>
              <span>Name</span>
              <input value={form.name} onChange={(e) => handleInputChange('name', e.target.value)} required />
            </label>
            <label>
              <span>Company</span>
              <input value={form.company} onChange={(e) => handleInputChange('company', e.target.value)} required />
            </label>
            <label className="full-width">
              <span>Email addresses</span>
              <input value={form.email} onChange={(e) => handleInputChange('email', e.target.value)} placeholder="comma separated emails" />
            </label>
            <label className="full-width">
              <span>Locations</span>
              <input value={form.location} onChange={(e) => handleInputChange('location', e.target.value)} placeholder="comma separated locations" />
            </label>
            <label className="full-width">
              <span>Phone numbers</span>
              <input value={form.phone} onChange={(e) => handleInputChange('phone', e.target.value)} placeholder="comma separated phones" />
            </label>
            <label>
              <span>Contact person</span>
              <input value={form.contactPerson} onChange={(e) => handleInputChange('contactPerson', e.target.value)} />
            </label>
            <label>
              <span>Status</span>
              <select value={form.status} onChange={(e) => handleInputChange('status', e.target.value)}>
                {['New', 'Interested', 'Follow Up', 'Qualified', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost', 'On Hold'].map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="full-width">
              <span>Status notes</span>
              <textarea value={form.notes} onChange={(e) => handleInputChange('notes', e.target.value)} rows={4} placeholder="Write the lead status or summary here..." />
            </label>
          </div>

          <div className="form-actions">
            <button className="primary-button" type="submit">
              <Plus size={16} />
              {editingId ? 'Update lead' : 'Save lead'}
            </button>
            {editingId && (
              <button className="secondary-button" type="button" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="lead-table-card">
          <div className="section-title-row">
            <h3>Lead list</h3>
            <div className="chip">{filteredLeads.length} records</div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <div className="person-cell">
                        <div className="avatar">{lead.name.charAt(0).toUpperCase()}</div>
                        <div>
                          <strong>{lead.name}</strong>
                          <div className="muted small">{lead.contactPerson}</div>
                        </div>
                      </div>
                    </td>
                    <td>{lead.company}</td>
                    <td>
                      <span className="status-pill" style={{ background: `${getStatusColors[lead.status] ?? '#64748b'}22`, color: getStatusColors[lead.status] ?? '#cbd5e1' }}>
                        {lead.status}
                      </span>
                    </td>
                    <td>{lead.location.join(', ') || '—'}</td>
                    <td>{formatDate(lead.updatedAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="table-button" type="button" onClick={() => handleEdit(lead)}>Edit</button>
                        <button className="table-button danger" type="button" onClick={() => handleDelete(lead.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="content-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Intelligence</p>
          <h1>Reports</h1>
        </div>
      </div>

      <div className="report-box">
        <div className="field-grid">
          <label className="full-width">
            <span>Report title</span>
            <input value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} />
          </label>
          <label className="full-width">
            <span>AI / business narrative</span>
            <textarea rows={7} value={reportNarrative} onChange={(e) => setReportNarrative(e.target.value)} placeholder="Describe the sales performance or use the generated summary from Gemini later." />
          </label>
        </div>

        <div className="report-summary-box">
          <div className="mini-kpis">
            <div>
              <strong>{filteredLeads.length}</strong>
              <span>Filtered leads</span>
            </div>
            <div>
              <strong>{new Set(filteredLeads.flatMap((lead) => lead.location)).size}</strong>
              <span>Locations</span>
            </div>
            <div>
              <strong>{new Set(filteredLeads.map((lead) => lead.status)).size}</strong>
              <span>Status groups</span>
            </div>
          </div>
        </div>

        <div className="report-actions">
          <button className="primary-button" type="button" onClick={handleDownloadReport}>
            <Download size={16} />
            Download .docx
          </button>
        </div>
      </div>
    </div>
  );

  if (!isLoggedIn) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-brand">Exceed</div>
          <h1>Access dashboard</h1>
          <p>Sign in to manage leads, status tracking, charts, and report generation.</p>
          <button className="primary-button" onClick={() => setIsLoggedIn(true)}>
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">E</div>
          <div>
            <strong>Exceed</strong>
            <small>CRM Dashboard</small>
          </div>
        </div>

        <nav className="nav-links">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-button ${menu === id ? 'active' : ''}`} onClick={() => setMenu(id as MenuName)}>
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-button" onClick={() => setIsLoggedIn(false)}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <main className="main-panel">
        {menu === 'dashboard' && renderDashboard()}
        {menu === 'leads' && renderLeads()}
        {menu === 'reports' && renderReports()}
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, accent }: { title: string; value: string; icon: React.ReactNode; accent: string }) {
  return (
    <div className={`stat-card ${accent}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <small>{title}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
