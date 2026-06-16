/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Database, TrendingUp, Users, ShieldAlert, Sliders, Trash2, Globe, FileText, CheckCircle } from 'lucide-react';
import { SiteStats, Template, User } from '../types.ts';

interface AdminConsoleProps {
  user: User;
}

export default function AdminConsole({ user }: AdminConsoleProps) {
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${user.id}` };
      
      // Get Stats
      const statRes = await fetch('/api/admin/stats', { headers });
      const statData = await statRes.json();
      setStats(statData);

      // Get templates
      const tmplRes = await fetch('/api/templates');
      const tmplData = await tmplRes.json();
      setTemplates(tmplData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Warning: Are you sure you want to permanently delete this base template? This could break downstream newly duplicated invitations.')) return;
    try {
      const res = await fetch(`/api/admin/templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.id}` }
      });
      if (res.ok) {
        setTemplates(templates.filter(t => t.id !== id));
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-stone-950 border-t-transparent"></span>
        <p className="text-xs uppercase font-bold tracking-widest text-stone-500 font-mono mt-4">Unlocking administrative console...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 text-stone-900 space-y-12 text-left">
      
      {/* HEADER SECTION */}
      <div className="border-b border-gray-100 pb-8 flex items-center gap-3">
        <div className="h-10 w-10 bg-rose-600 text-white rounded-xl flex items-center justify-center">
          <Database className="h-5.5 w-5.5" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight font-sans">Platform Administrative Panel</h1>
          <p className="text-xs text-stone-500 uppercase tracking-widest font-mono font-bold mt-1">Status: Active &bull; Global Database Logs Auditing Mode</p>
        </div>
      </div>

      {/* METRIC BOARD SECTION */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-rose-100 shadow-sm text-left">
            <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-3">Total Accounts</span>
            <span className="text-3xl font-black leading-none block text-rose-600">{stats.totalUsers}</span>
            <span className="text-[10px] text-gray-400 mt-2 block">Registered cloud users</span>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-rose-100 shadow-sm text-left">
            <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-3">Seeded Templates</span>
            <span className="text-3xl font-black leading-none block text-rose-600">{stats.totalTemplates}</span>
            <span className="text-[10px] text-gray-400 mt-2 block">Standard designs active</span>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-rose-100 shadow-sm text-left">
            <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-3">Invitations Cloned</span>
            <span className="text-3xl font-black leading-none block text-rose-600">{stats.totalInvitations}</span>
            <span className="text-[10px] text-gray-400 mt-2 block">Active personal user-copied works</span>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-rose-100 shadow-sm text-left">
            <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-3">Server Guest Clicks</span>
            <span className="text-3xl font-black leading-none block text-rose-600">{stats.totalVisits}</span>
            <span className="text-[10px] text-gray-400 mt-2 block">Cumulative page view counts</span>
          </div>
        </div>
      )}

      {/* TEMPLATE DB MANAGER */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-black tracking-tight font-sans">Global Templates Inventory</h2>
          <p className="text-xs text-stone-500 mt-1">Audit, modify, or permanently remove standard base catalog seeds.</p>
        </div>

        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
          <table className="w-full text-xs text-stone-700">
            <thead className="bg-stone-50 font-bold uppercase tracking-wider text-stone-500 border-b">
              <tr>
                <th className="p-4 pl-6 text-left">Template ID</th>
                <th className="p-4 text-left">Core Name</th>
                <th className="p-4 text-left">Category</th>
                <th className="p-4 text-left">Heading Font Pairing</th>
                <th className="p-4 text-center">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-sans">
              {templates.map(tmpl => (
                <tr key={tmpl.id} className="hover:bg-slate-50/50">
                  <td className="p-4 pl-6 font-mono font-bold text-stone-500">{tmpl.id}</td>
                  <td className="p-4 font-bold text-stone-900">{tmpl.name}</td>
                  <td className="p-4 font-semibold text-stone-700">
                    <span className="py-0.5 px-2 bg-stone-100 border rounded-full text-[10px] tracking-wider uppercase font-mono">{tmpl.category}</span>
                  </td>
                  <td className="p-4 font-mono font-medium">{tmpl.theme.fonts.heading}</td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => deleteTemplate(tmpl.id)}
                      className="p-1 text-stone-300 hover:text-red-650 rounded hover:bg-red-50 focus:outline-none"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
