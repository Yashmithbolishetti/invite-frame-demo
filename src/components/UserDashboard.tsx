/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Sliders, Eye, Download, Trash2, Calendar, Users, BarChart3, Search, 
  ArrowUpRight, Share2, Plus, Info, ExternalLink, RefreshCw, FileSpreadsheet,
  FileText, Code, Archive
} from 'lucide-react';
import { Invitation, RSVPData, User } from '../types.ts';
import { downloadInvitationPDF } from '../lib/pdfHelper.ts';

interface UserDashboardProps {
  user: User;
  onEditInvitation: (id: string) => void;
  onBrowseTemplates: () => void;
}

export default function UserDashboard({ user, onEditInvitation, onBrowseTemplates }: UserDashboardProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [rsvps, setRsvps] = useState<RSVPData[]>([]);
  const [selectedInviteRSVP, setSelectedInviteRSVP] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState<boolean>(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const authHeader = `Bearer ${user.id}`;
      
      // Get User's invitations
      const inviteRes = await fetch('/api/invitations', {
        headers: { 'Authorization': authHeader }
      });
      const inviteData = inviteRes.ok ? await inviteRes.json() : [];
      const safeInvites = Array.isArray(inviteData) ? inviteData : [];
      setInvitations(safeInvites);

      // Get all RSVP list by looping invitations
      if (safeInvites.length > 0) {
        let compiledRSVPs: RSVPData[] = [];
        for (const invite of safeInvites) {
          const rsvpRes = await fetch(`/api/invitations/${invite.id}/rsvps`);
          const rsvpData = rsvpRes.ok ? await rsvpRes.json() : [];
          if (Array.isArray(rsvpData)) {
            compiledRSVPs = [...compiledRSVPs, ...rsvpData];
          }
        }
        setRsvps(compiledRSVPs || []);
      } else {
        setRsvps([]);
      }
    } catch (err) {
      console.error('Error fetching dashboard inputs:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteInvitation = async (id: string) => {
    // Show confirmation modal (Requirements: Show confirmation modal)
    setDeletingId(id);
    setDeleteErrorMessage(null);
    setDeleteInProgress(false);
  };

  const handleConfirmPurge = async () => {
    if (!deletingId) return;
    setDeleteInProgress(true);
    setDeleteErrorMessage(null);
    try {
      const res = await fetch(`/api/invitations/${deletingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.id}`
        }
      });
      if (res.ok) {
        // State updates and immediate automatic dashboard refresh (Requirements: Dashboard refreshes automatically, Deleted draft immediately disappears from list)
        setInvitations(invitations.filter(i => i.id !== deletingId));
        setRsvps(rsvps.filter(r => r.invitationId !== deletingId));
        setDeletingId(null);
        // Requirement 10: Success message is shown
        setNotification('Invitation draft and all related assets and RSVPs successfully deleted.');
        setTimeout(() => setNotification(null), 6000);
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMessage = errData.error || `Server responded with status code: ${res.status}`;
        setDeleteErrorMessage(errMessage);
      }
    } catch (err: any) {
      console.error('Failed to notify server of deletion:', err);
      setDeleteErrorMessage(err.message || 'Network transport failure. Could not connect to host.');
    } finally {
      setDeleteInProgress(false);
    }
  };

  const deleteRSVPResponse = async (rsvpId: string) => {
    if (!confirm('Permanently remove this guest RSVP message?')) return;
    try {
      const res = await fetch(`/api/rsvps/${rsvpId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.id}`
        }
      });
      if (res.ok) {
        setRsvps(rsvps.filter(r => r.id !== rsvpId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOfflineZIPDownload = (inviteId: string) => {
    window.location.href = `/api/invitations/${inviteId}/export`;
  };

  const handleHTMLDownload = (inviteId: string) => {
    window.location.href = `/api/invitations/${inviteId}/html`;
  };

  const handlePDFDownload = (invite: Invitation) => {
    downloadInvitationPDF(invite);
  };

  // EXPORT CLIENT GUEST RSVPS LIST DIRECTLY AS SPREADSHEET-COMPATIBLE CSV FILE
  const handleExportCSV = () => {
    const targetRSVPs = selectedInviteRSVP === 'all' 
      ? rsvps 
      : rsvps.filter(r => r.invitationId === selectedInviteRSVP);

    if (targetRSVPs.length === 0) {
      alert('No guest RSVP list records found to compile spreadsheet.');
      return;
    }

    // Build raw columns rows
    const headers = 'Guest ID,Guest Name,Email Address,Phone Number,Attendees Volume,Personal Message,Submitted At\n';
    const rows = targetRSVPs.map(r => {
      const safeMsg = r.message.replace(/"/g, '""');
      const safeName = r.name.replace(/"/g, '""');
      return `"${r.id}","${safeName}","${r.email}","${r.phone}",${r.attendees},"${safeMsg}","${r.createdAt}"`;
    }).join('\n');

    const csvBlob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const csvUrl = URL.createObjectURL(csvBlob);
    
    // Auto anchor clicks download
    const link = document.createElement('a');
    link.setAttribute('href', csvUrl);
    link.setAttribute('download', `inviteframe-guestlist-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Searching & Filters computed values
  const filteredRSVPs = rsvps.filter(r => {
    const matchesInviteToken = selectedInviteRSVP === 'all' || r.invitationId === selectedInviteRSVP;
    const matchesKW = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      r.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesInviteToken && matchesKW;
  });

  const aggregateAttendees = rsvps.reduce((acc, r) => acc + (r.attendees || 1), 0);
  const aggregateVisits = invitations.reduce((acc, i) => acc + (i.visitCount || 0), 0);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-stone-950 border-t-transparent"></span>
        <p className="text-xs uppercase font-bold tracking-widest text-stone-500 font-mono mt-4">Unfolding user dashboard...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 text-stone-900 space-y-12 animate-fade-in">
      
      {notification && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-150 text-emerald-800 text-xs font-bold font-sans shadow-sm flex items-center justify-between">
          <span>✓ {notification}</span>
          <button type="button" onClick={() => setNotification(null)} className="text-emerald-500 hover:text-emerald-700 font-black px-2 py-1 select-none">✕</button>
        </div>
      )}
      
      {/* 1. SEAMLESS LANDING ANALYTICS HEADING BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 pb-8 text-left">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-sans">Owner Management Center</h1>
          <p className="text-xs text-stone-500 mt-1 uppercase tracking-wider font-semibold">Welcome back, {user.name} &bull; Personal Account Workspace</p>
        </div>
        
        <button 
          id="dash-btn-make-new-invite"
          onClick={onBrowseTemplates}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-stone-950 px-6 text-xs font-bold uppercase tracking-widest text-white shadow-lg hover:bg-stone-850 active:scale-[0.99] transition-all"
        >
          <Plus className="h-4.5 w-4.5" /> Design New Invitation
        </button>
      </div>

      {/* 2. STATS ANALYTICS BANNER GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-stone-150 shadow-sm text-left">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Personal Creations</span>
            <BarChart3 className="h-5 w-5 text-stone-400" />
          </div>
          <span className="text-3xl font-black block leading-none">{invitations.length}</span>
          <span className="text-[10px] text-stone-500 mt-2 block">Premium Invitation Websites Crafted</span>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-stone-150 shadow-sm text-left">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Visits Accumulated</span>
            <Eye className="h-5 w-5 text-indigo-500" />
          </div>
          <span className="text-3xl font-black block leading-none">{aggregateVisits}</span>
          <span className="text-[10px] text-stone-500 mt-2 block">Total page views by invite link recipients</span>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-stone-150 shadow-sm text-left">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Guest RSVPs List</span>
            <Users className="h-5 w-5 text-emerald-500" />
          </div>
          <span className="text-3xl font-black block leading-none">{rsvps.length}</span>
          <span className="text-[10px] text-stone-500 mt-2 block">Total submitted attendance forms</span>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-stone-150 shadow-sm text-left">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Total Headcount</span>
            <span className="p-1 px-2.5 rounded-full bg-emerald-50 text-[9px] font-bold text-emerald-700">Live tally</span>
          </div>
          <span className="text-3xl font-black block leading-none">{aggregateAttendees}</span>
          <span className="text-[10px] text-stone-500 mt-2 block">Sum total expected attendees</span>
        </div>
      </div>

      {/* 3. CORE PERSONAL INVITATIONS PORTFOLIO */}
      <div>
        <div className="text-left mb-6">
          <h2 className="text-xl font-black font-sans">Active Event Websites Portfolio</h2>
          <p className="text-xs text-stone-500 mt-1">Manage themes live configurations, monitor click rates, and export offline web files packages.</p>
        </div>

        {invitations.length === 0 ? (
          <div className="p-14 text-center rounded-3xl bg-white border border-stone-150 shadow-sm">
            <Calendar className="h-10 w-10 text-stone-300 mx-auto mb-4" />
            <h3 className="text-base font-bold text-stone-900">No Invitations Crafted</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">Browse our breathtaking catalog of 24 unique wedding, anniversary and party themes and launch your first editor draft free!</p>
            <button 
              id="dash-btn-empty-portfolio"
              onClick={onBrowseTemplates}
              className="mt-5 px-6 py-2.5 bg-stone-950 hover:bg-stone-850 text-xs font-bold uppercase tracking-wider text-white rounded-xl shadow"
            >
              Examine Free Templates
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {invitations.map(item => (
              <div 
                key={item.id} 
                id={`user-invite-card-${item.id}`}
                className="p-6 rounded-3xl bg-white border border-stone-200/50 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-[9px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border ${
                      item.published 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                        : 'bg-stone-50 border-stone-100 text-stone-500'
                    }`}>
                      {item.published ? 'Live Website Shared' : 'Draft mode'}
                    </span>
                    
                    <span className="text-[10px] font-mono text-stone-400 font-bold">
                      👀 {item.visitCount || 0} clicks
                    </span>
                  </div>

                  <h3 className="text-lg font-black tracking-tight text-stone-950 leading-snug">{item.title}</h3>
                  <p className="text-xs text-stone-500 italic mt-1">{item.content.dateText}</p>

                  <div className="mt-4 p-3 rounded-xl bg-stone-50 border border-stone-100 text-xs flex flex-col gap-1">
                    <span className="font-semibold text-stone-800 uppercase text-[9px] tracking-wider font-mono">Published Link:</span>
                    <a 
                      href={`/invite/${item.slug}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-stone-900 hover:underline font-bold truncate flex items-center gap-1 text-[11px]"
                    >
                      {window.location.origin}/invite/{item.slug}
                      <ExternalLink className="h-3 w-3 stroke-[2.5]" />
                    </a>
                  </div>
                </div>

                 <div className="mt-6 border-t border-gray-100 pt-5 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button 
                      id={`dash-btn-edit-${item.id}`}
                      onClick={() => onEditInvitation(item.id)}
                      className="px-3 py-2 border border-stone-150 hover:bg-stone-100 text-stone-900 rounded-xl text-xs font-bold mr-1"
                    >
                      Edit Customizer
                    </button>
                    
                    <button 
                      onClick={() => handlePDFDownload(item)}
                      className="px-2 py-2 border border-stone-150 hover:bg-stone-50 text-stone-700 rounded-xl flex items-center gap-1"
                      title="Download Beautiful Readable PDF"
                    >
                      <FileText className="h-3.5 w-3.5 text-rose-500" />
                      <span className="text-[9px] font-extrabold uppercase tracking-wide">PDF</span>
                    </button>

                    <button 
                      onClick={() => handleHTMLDownload(item.id)}
                      className="px-2 py-2 border border-stone-150 hover:bg-stone-50 text-stone-700 rounded-xl flex items-center gap-1"
                      title="Download Portable HTML (Opens in Browser)"
                    >
                      <Code className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-[9px] font-extrabold uppercase tracking-wide">HTML</span>
                    </button>

                    <button 
                      id={`dash-btn-export-${item.id}`}
                      onClick={() => handleOfflineZIPDownload(item.id)}
                      className="px-2 py-2 border border-stone-150 hover:bg-stone-50 text-stone-700 rounded-xl flex items-center gap-1"
                      title="Download Offline Asset ZIP Package"
                    >
                      <Archive className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-[9px] font-extrabold uppercase tracking-wide">ZIP</span>
                    </button>
                  </div>

                  <button 
                    id={`dash-btn-delete-${item.id}`}
                    onClick={() => deleteInvitation(item.id)}
                    className="p-2 hover:bg-red-50 text-stone-400 hover:text-red-600 rounded-xl transition-colors focus:outline-none"
                    title="Delete permanently"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-[1px] bg-stone-150"></div>

      {/* 4. REAL GUEST RSVP TRACKING DATABASE TABLE */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-6">
          <div className="text-left">
            <h2 className="text-xl font-black font-sans">Guest RSVPs List &amp; Responses Database</h2>
            <p className="text-xs text-stone-500 mt-1">Review guest check-ins, personal greeting messages and dietary requirements below.</p>
          </div>

          <div className="flex items-center flex-wrap gap-3">
            {/* Filter RSVPs by invitation ID */}
            <select
              id="rsvp-invite-id-select-filter"
              value={selectedInviteRSVP}
              onChange={(e) => setSelectedInviteRSVP(e.target.value)}
              className="px-3 py-2 border rounded-xl text-xs bg-white text-stone-700 focus:outline-none"
            >
              <option value="all">Compare All RSVP Lists</option>
              {invitations.map(i => (
                <option key={i.id} value={i.id}>{i.title}</option>
              ))}
            </select>

            <button 
              id="dash-btn-export-csv"
              onClick={handleExportCSV}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-stone-150 bg-white hover:bg-stone-50 px-4 text-xs font-bold text-stone-750"
            >
              <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-600" /> Export CSV Spreadsheet
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-stone-150 shadow-sm overflow-hidden text-left">
          
          {/* SEARCH INPUT BAR */}
          <div className="p-4 border-b border-stone-150 bg-stone-50/50 flex items-center">
            <div className="relative w-full md:max-w-xs">
              <span className="absolute inset-y-0 left-3.5 flex items-center font-bold text-stone-400 pointer-events-none">
                <Search className="h-4.5 w-4.5 text-stone-400" />
              </span>
              <input 
                id="rsvp-search-field"
                type="text" 
                placeholder="Search guests by name or email..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-stone-250 bg-white rounded-xl focus:outline-none text-xs"
              />
            </div>
          </div>

          {filteredRSVPs.length === 0 ? (
            <div className="p-14 text-center">
              <Users className="h-8 w-8 text-stone-350 mx-auto mb-2" />
              <p className="text-xs text-stone-500 font-bold uppercase tracking-wider font-mono">No guest RSVPs match current selections</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-stone-800">
                <thead className="bg-stone-50/80 font-bold uppercase tracking-wider text-stone-500 border-b">
                  <tr>
                    <th className="p-4 pl-6 text-left">Guest Name</th>
                    <th className="p-4 text-left">Contact Information</th>
                    <th className="p-4 text-center">Expected Attendees</th>
                    <th className="p-4 text-left">Warm Message / Request</th>
                    <th className="p-4 text-left">Timestamp</th>
                    <th className="p-4 text-center pr-6">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-sans">
                  {filteredRSVPs.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50/40">
                      <td className="p-4 pl-6 font-bold text-stone-900">{row.name}</td>
                      <td className="p-4 font-medium">
                        <p>{row.email}</p>
                        <p className="text-gray-400 text-[10px] mt-0.5">{row.phone || 'No phone provided'}</p>
                      </td>
                      <td className="p-4 text-center font-bold text-indigo-600">
                        <span className="py-1 px-3 rounded-full bg-indigo-50 border border-indigo-100/50">
                          {row.attendees} {row.attendees === 1 ? 'Guest' : 'Guests'}
                        </span>
                      </td>
                      <td className="p-4 max-w-xs truncate text-[11px] leading-relaxed text-stone-500" title={row.message}>
                        {row.message || <span className="italic text-gray-300">No message</span>}
                      </td>
                      <td className="p-4 text-gray-400 text-[10px] font-mono">
                        {new Date(row.createdAt).toLocaleDateString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4 text-center pr-6">
                        <button 
                          onClick={() => deleteRSVPResponse(row.id)}
                          className="p-1.5 hover:bg-red-50 text-stone-300 hover:text-red-650 rounded-lg focus:outline-none transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>

      {/* RENDER THE REAL-TIME CUSTOM DELETION CONFIRMATION MODAL (Requirements: Show confirmation modal, confirms deletion) */}
      {deletingId && (() => {
        const targetToPurge = invitations.find(i => i.id === deletingId);
        return (
          <div 
            id="delete-confirmation-modal" 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in text-stone-900"
          >
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-stone-150 animate-scale-up space-y-6 text-left">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-red-50 text-red-600 shrink-0">
                  <Trash2 className="h-6 w-6 stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight font-sans">Delete Website & Purge Assets?</h3>
                  <p className="text-xs text-stone-500 mt-1">
                    You are preparing to permanently erase the invitation website:
                  </p>
                  <p className="text-sm font-black text-stone-900 mt-2 bg-stone-50 p-2.5 rounded-xl border border-stone-100 italic">
                    "{targetToPurge?.title || 'Draft Invitation'}"
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/75 border border-amber-200/50 text-[11px] text-amber-850 leading-relaxed font-sans space-y-2">
                <p className="font-bold">⚠️ CRITICAL RECOVERY NOTICE:</p>
                <p>This operation is fully authoritative and cannot be undone. Confirming this action will automatically execute the following purges:</p>
                <ul className="list-disc pl-5 space-y-1 mt-1 font-medium text-stone-700">
                  <li>Purge dynamic draft & live publishing configurations from the server.</li>
                  <li>Scrub physical system file storage for all uploaded custom background music tracks.</li>
                  <li>Recursively delete all custom memory gallery photos and background video file streams.</li>
                  <li>Permanently drop all linked guest RSVPs and attendee headcount tallies.</li>
                </ul>
              </div>

              {deleteErrorMessage && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-150 text-red-800 text-xs font-bold font-sans">
                  🚨 Deletion Failed Detail: {deleteErrorMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  id="cancel-delete-button"
                  type="button"
                  disabled={deleteInProgress}
                  onClick={() => setDeletingId(null)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-all select-none"
                >
                  Cancel
                </button>
                <button
                  id="confirm-delete-button"
                  type="button"
                  disabled={deleteInProgress}
                  onClick={handleConfirmPurge}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-red-200 active:scale-[0.98] disabled:opacity-75 transition-all select-none"
                >
                  {deleteInProgress ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                      Purging...
                    </>
                  ) : (
                    'Confirms Deletion'
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
