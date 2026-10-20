import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  BriefcaseBusiness,
  Building2,
  Download,
  Eye,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  UserRoundCheck,
  Users,
  X,
} from 'lucide-react';
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
import { getStatusColors } from './lib/utils';

type MenuName = 'dashboard' | 'leads' | 'reports';

type Lead = {
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

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
};

type DashboardSummary = {
  total: number;
  active: number;
  won: number;
  statusBreakdown: Array<{ name: string; value: number }>;
  locationBreakdown: Array<{ name: string; value: number }>;
  trend: Array<{ date: string; total: number }>;
};

const defaultForm = {
  company: '',
  email: '',
  location: '',
  phone: '',
  contactPerson: '',
  status: 'New',
  notes: '',
};

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'reports', label: 'Reports', icon: BriefcaseBusiness },
] as const;

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-ET', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const authHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

const getToken = () => localStorage.getItem('exceed-token');

export default function App() {
  const [token, setToken] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<User | null>(null);
  const [menu, setMenu] = useState<MenuName>('dashboard');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({
    total: 0,
    active: 0,
    won: 0,
    statusBreakdown: [],
    locationBreakdown: [],
    trend: [],
  });
  const [loginForm, setLoginForm] = useState({ email: 'admin@exceed.local', password: 'admin123' });
  const [loginError, setLoginError] = useState('');
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [reportTitle, setReportTitle] = useState('Exceed Internal Lead Report');
  const [reportNarrative, setReportNarrative] = useState('');

  const fetchDashboard = async () => {
    if (!token) return;

    try {
      const [leadsRes, summaryRes] = await Promise.all([
        fetch('/api/leads', { headers: authHeaders(token) }),
        fetch('/api/dashboard/summary', { headers: authHeaders(token) }),
      ]);

      if (!leadsRes.ok || !summaryRes.ok) {
        throw new Error('Fetch failed');
      }

      const leadsData = await leadsRes.json();
      const summaryData = await summaryRes.json();
      setLeads(leadsData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    }
  };

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    const fetchInit = async () => {
      try {
        const res = await fetch('/api/auth/me', { headers: authHeaders(token) });
        if (!res.ok) throw new Error('Unauthorized');
        const data = await res.json();
        setUser(data.user);
        await fetchDashboard();
      } catch {
        localStorage.removeItem('exceed-token');
        setToken(null);
      }
    };

    fetchInit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filteredLeads = useMemo(() => {
    return [...leads]
      .filter((lead) => {
        const from = dateStart ? new Date(dateStart) : null;
        const to = dateEnd ? new Date(`${dateEnd}T23:59:59.999Z`) : null;
        const createdAt = new Date(lead.createdAt);

        if (from && createdAt < from) return false;
        if (to && createdAt > to) return false;

        const q = search.toLowerCase();
        if (!q) return true;

        const haystack = `${lead.name} ${lead.company} ${lead.status} ${lead.contactPerson} ${lead.location.join(' ')}`.toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [leads, search, dateStart, dateEnd]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Login failed');

      localStorage.setItem('exceed-token', data.token);
      setToken(data.token);
      setUser(data.user);
      await fetchDashboard();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('exceed-token');
    setToken(null);
    setUser(null);
    setLeads([]);
    setSummary({ total: 0, active: 0, won: 0, statusBreakdown: [], locationBreakdown: [], trend: [] });
    setMenu('dashboard');
  };

  const handleField = (field: keyof typeof defaultForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
  };

  const handleSubmitLead = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    const payload = {
      ...form,
      name: form.company,
      email: form.email.split(',').map((item) => item.trim()).filter(Boolean),
      location: form.location.split(',').map((item) => item.trim()).filter(Boolean),
      phone: form.phone.split(',').map((item) => item.trim()).filter(Boolean),
      contactPerson: form.contactPerson || form.company,
    };

    try {
      const response = await fetch(editingId ? `/api/leads/${editingId}` : '/api/leads', {
        method: editingId ? 'PUT' : 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Save failed');
      resetForm();
      setShowForm(false);
      await fetchDashboard();
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (lead: Lead) => {
    setEditingId(lead.id);
    setForm({
      company: lead.company,
      email: lead.email.join(', '),
      location: lead.location.join(', '),
      phone: lead.phone.join(', '),
      contactPerson: lead.contactPerson,
      status: lead.status,
      notes: lead.notes,
    });
    setShowForm(true);
    setMenu('leads');
  };

  const handleDelete = async (leadId: string) => {
    if (!token) return;
    await fetch(`/api/leads/${leadId}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    });
    await fetchDashboard();
  };

  const handleReject = async (lead: Lead) => {
    if (!token) return;
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({ ...lead, status: 'Closed Lost' }),
    });
    await fetchDashboard();
  };

  const handleDownloadReport = async () => {
    if (!token) return;
    const response = await fetch('/api/reports/generate-docx', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        title: reportTitle,
        narrative: reportNarrative,
        leads: filteredLeads,
      }),
    });

    if (!response.ok) {
      alert('Report generation failed.');
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(reportTitle || 'exceed-report').replace(/\s+/g, '-').toLowerCase()}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (!token || !user) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="auth-brand">Exceed</div>
          <p className="auth-subtitle">Internal lead management portal</p>

          <form onSubmit={handleLogin} className="login-form">
            <label>
              <span>Email</span>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm((current) => ({ ...current, email: e.target.value }))}
              />
            </label>

            <label>
              <span>Password</span>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((current) => ({ ...current, password: e.target.value }))}
              />
            </label>

            {loginError && <div className="error-box">{loginError}</div>}

            <button className="primary-button" type="submit">Sign in</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark">E</div>
          <div>
            <strong>Exceed</strong>
            <small>Internal CRM</small>
          </div>
        </div>

        <nav className="nav-stack">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-button ${menu === id ? 'active' : ''}`}
              onClick={() => setMenu(id)}
              type="button"
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>

        <div className="user-card">
          <div className="avatar-sm">{user.name?.charAt(0)?.toUpperCase() || 'A'}</div>
          <div>
            <strong>{user.name || 'Admin'}</strong>
            <small>{user.email}</small>
          </div>
        </div>

        <button type="button" className="logout-button" onClick={handleLogout}>
          <LogOut size={16} />
          Logout
        </button>
      </aside>

      <main className="main-content">
        {menu === 'dashboard' && (
          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="section-kicker">Overview</p>
                <h1>Dashboard</h1>
              </div>

              <div className="date-picker-row">
                <label>
                  <span>From</span>
                  <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
                </label>
                <label>
                  <span>To</span>
                  <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
                </label>
                {(dateStart || dateEnd) && (
                  <button type="button" className="secondary-button" onClick={() => { setDateStart(''); setDateEnd(''); }}>
                    Reset
                  </button>
                )}
              </div>
            </div>

            <div className="stats-grid">
              <StatCard title="Total leads" value={String(filteredLeads.length)} icon={<Users size={18} />} tone="blue" />
              <StatCard title="Active pipeline" value={String(summary.active)} icon={<UserRoundCheck size={18} />} tone="green" />
              <StatCard title="Won deals" value={String(summary.won)} icon={<BriefcaseBusiness size={18} />} tone="purple" />
              <StatCard title="Locations" value={String(new Set(filteredLeads.flatMap((lead) => lead.location)).size)} icon={<Building2 size={18} />} tone="amber" />
            </div>

            <div className="chart-grid">
              <div className="chart-card large">
                <div className="card-title">
                  <h3>Lead trend</h3>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={summary.trend.length ? summary.trend : filteredLeads.map((lead) => ({ date: lead.createdAt.slice(0, 10), total: 1 }))}>
                    <defs>
                      <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#cbd5e1" tickLine={false} axisLine={false} />
                    <YAxis stroke="#cbd5e1" tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="total" stroke="#818cf8" fill="url(#lineFill)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <div className="card-title">
                  <h3>Status share</h3>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={summary.statusBreakdown.length ? summary.statusBreakdown : [{ name: 'No data', value: 1 }]} dataKey="value" nameKey="name" innerRadius={52} outerRadius={88}>
                      {(summary.statusBreakdown.length ? summary.statusBreakdown : [{ name: 'No data', value: 1 }]).map((segment) => (
                        <Cell key={segment.name} fill={getStatusColors[segment.name] || '#64748b'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-card">
              <div className="card-title">
                <h3>Location activity</h3>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={summary.locationBreakdown.length ? summary.locationBreakdown : [{ name: 'No data', value: 0 }]}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#cbd5e1" tickLine={false} axisLine={false} />
                  <YAxis stroke="#cbd5e1" tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar radius={[8, 8, 0, 0]} dataKey="value" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {menu === 'leads' && (
          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="section-kicker">Lead operations</p>
                <h1>Leads</h1>
              </div>

              <div className="header-actions">
                <div className="search-box">
                  <Search size={16} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search lead" />
                </div>
                <button type="button" className="primary-button" onClick={() => { resetForm(); setShowForm(true); }}>
                  <Plus size={16} />
                  Add New
                </button>
              </div>
            </div>

            <div className="table-card">
              <div className="card-title">
                <h3>Lead list</h3>
                <span className="mini-pill">{filteredLeads.length} records</span>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Company Name</th>
                      <th>Contact Person</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Locations</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className={lead.status === 'Closed Lost' ? 'rejected-row' : ''}>
                        <td>
                          <div className="person-cell">
                            <div className="avatar-dot">{lead.company.charAt(0).toUpperCase()}</div>
                            <strong>{lead.company}</strong>
                          </div>
                        </td>
                        <td>{lead.contactPerson || '—'}</td>
                        <td>{lead.email.join(', ') || '—'}</td>
                        <td>{lead.phone.join(', ') || '—'}</td>
                        <td>{lead.location.join(', ') || '—'}</td>
                        <td>
                          <div className="inline-actions">
                            <button type="button" className="table-button view" onClick={() => setViewingLead(lead)}>
                              <Eye size={14} />
                              View
                            </button>
                            <button type="button" className="table-button" onClick={() => handleEdit(lead)}>Edit</button>
                            {lead.status !== 'Closed Lost' && (
                              <button type="button" className="table-button danger" onClick={() => handleReject(lead)}>Reject</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add / Edit Modal */}
            {showForm && (
              <div className="modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
                <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>{editingId ? 'Edit lead' : 'Add new lead'}</h3>
                    <button type="button" className="modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleSubmitLead}>
                    <div className="field-grid">
                      <label className="full-span">
                        <span>Company name</span>
                        <input value={form.company} onChange={(e) => handleField('company', e.target.value)} required />
                      </label>

                      <label className="full-span">
                        <span>Email addresses</span>
                        <input value={form.email} onChange={(e) => handleField('email', e.target.value)} placeholder="Comma separated" />
                      </label>

                      <label className="full-span">
                        <span>Phone numbers</span>
                        <input value={form.phone} onChange={(e) => handleField('phone', e.target.value)} placeholder="Comma separated" />
                      </label>

                      <label>
                        <span>Contact person <small>(optional)</small></span>
                        <input value={form.contactPerson} onChange={(e) => handleField('contactPerson', e.target.value)} />
                      </label>

                      <label>
                        <span>Status</span>
                        <select value={form.status} onChange={(e) => handleField('status', e.target.value)}>
                          {['New', 'Interested', 'Follow Up', 'Qualified', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost', 'On Hold'].map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </label>

                      <label className="full-span">
                        <span>Locations <small>(optional)</small></span>
                        <input value={form.location} onChange={(e) => handleField('location', e.target.value)} placeholder="Comma separated" />
                      </label>

                      <label className="full-span">
                        <span>Status notes</span>
                        <textarea rows={4} value={form.notes} onChange={(e) => handleField('notes', e.target.value)} />
                      </label>
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="primary-button">
                        <Plus size={16} />
                        {editingId ? 'Update lead' : 'Save lead'}
                      </button>
                      <button type="button" className="secondary-button" onClick={() => { setShowForm(false); resetForm(); }}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* View Lead Modal */}
            {viewingLead && (
              <div className="modal-overlay" onClick={() => setViewingLead(null)}>
                <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>Lead details</h3>
                    <button type="button" className="modal-close" onClick={() => setViewingLead(null)}>
                      <X size={18} />
                    </button>
                  </div>

                  <div className="detail-grid">
                    <div className="detail-item">
                      <small>Company</small>
                      <strong>{viewingLead.company}</strong>
                    </div>
                    <div className="detail-item">
                      <small>Contact Person</small>
                      <strong>{viewingLead.contactPerson || '—'}</strong>
                    </div>
                    <div className="detail-item">
                      <small>Email</small>
                      <strong>{viewingLead.email.join(', ') || '—'}</strong>
                    </div>
                    <div className="detail-item">
                      <small>Phone</small>
                      <strong>{viewingLead.phone.join(', ') || '—'}</strong>
                    </div>
                    <div className="detail-item">
                      <small>Locations</small>
                      <strong>{viewingLead.location.join(', ') || '—'}</strong>
                    </div>
                    <div className="detail-item">
                      <small>Status</small>
                      <span className="status-pill" style={{ background: `${getStatusColors[viewingLead.status] || '#64748b'}22`, color: getStatusColors[viewingLead.status] || '#f8fafc' }}>
                        {viewingLead.status}
                      </span>
                    </div>
                    <div className="detail-item full-span">
                      <small>Notes</small>
                      <p>{viewingLead.notes || 'No notes.'}</p>
                    </div>
                    <div className="detail-item">
                      <small>Created</small>
                      <strong>{formatDate(viewingLead.createdAt)}</strong>
                    </div>
                    <div className="detail-item">
                      <small>Updated</small>
                      <strong>{formatDate(viewingLead.updatedAt)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {menu === 'reports' && (
          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="section-kicker">Intelligence</p>
                <h1>Reports</h1>
              </div>
            </div>

            <div className="report-card">
              <label className="full-span">
                <span>Report title</span>
                <input value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} />
              </label>

              <label className="full-span">
                <span>Business narrative</span>
                <textarea rows={7} value={reportNarrative} onChange={(e) => setReportNarrative(e.target.value)} placeholder="Add your team analysis or let Gemini generate it based on lead statuses." />
              </label>

              <div className="report-summary">
                <div>
                  <strong>{filteredLeads.length}</strong>
                  <span>Filtered leads</span>
                </div>
                <div>
                  <strong>{summary.active}</strong>
                  <span>Active pipeline</span>
                </div>
                <div>
                  <strong>{new Set(filteredLeads.flatMap((lead) => lead.location)).size}</strong>
                  <span>Locations</span>
                </div>
              </div>

              <div className="report-actions">
                <button type="button" className="primary-button" onClick={handleDownloadReport}>
                  <Download size={16} />
                  Download .docx
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, tone }: { title: string; value: string; icon: ReactNode; tone: 'blue' | 'green' | 'purple' | 'amber'; }) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <small>{title}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
