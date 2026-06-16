/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Navigation from './components/Navigation.tsx';
import LandingPage from './components/LandingPage.tsx';
import UserDashboard from './components/UserDashboard.tsx';
import InvitationEditor from './components/InvitationEditor.tsx';
import AdminConsole from './components/AdminConsole.tsx';
import { User, Template } from './types.ts';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedInvitationId, setSelectedInvitationId] = useState<string | null>(null);
  const [authTriggerFlag, setAuthTriggerFlag] = useState<number>(0);

  // Restore user session on startup
  useEffect(() => {
    const cached = localStorage.getItem('inviteframe_user');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id) {
          setUser(parsed);
          // Redirect admins to admin workspace by default
          if (parsed.role === 'admin') {
            setActiveTab('admin');
          } else {
            setActiveTab('dashboard');
          }
        }
      } catch (err) {
        console.error('Failed to parse cached user session:', err);
        localStorage.removeItem('inviteframe_user');
      }
    }
  }, []);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('inviteframe_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('inviteframe_user');
    setActiveTab('home');
    setSelectedInvitationId(null);
  };

  const triggerAuthModal = () => {
    // Select login button on navigation and click it to open
    const loginButton = document.getElementById('btn-trigger-login-modal');
    if (loginButton) {
      loginButton.click();
    } else {
      setAuthTriggerFlag(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans">
      
      {/* GLOBAL NAVIGATION HEADER */}
      <Navigation 
        user={user} 
        onLogin={handleLogin} 
        onLogout={handleLogout} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />

      {/* REACTIVE TAB-ROUTING STAGE PAGE VIEWS */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <LandingPage 
            user={user}
            onSelectTemplate={(tmpl) => console.log('Selected Template:', tmpl)}
            triggerAuthModal={triggerAuthModal}
            setActiveTab={setActiveTab}
            setSelectedInvitationId={setSelectedInvitationId}
          />
        )}

        {/* Dynamic User portfolio dashboard */}
        {(activeTab === 'dashboard' || activeTab === 'rsvps') && user && (
          <UserDashboard 
            user={user}
            onEditInvitation={(id) => {
              setSelectedInvitationId(id);
              setActiveTab('editor');
            }}
            onBrowseTemplates={() => setActiveTab('home')}
          />
        )}

        {/* Dynamic Studio builder editor */}
        {activeTab === 'editor' && user && selectedInvitationId && (
          <InvitationEditor 
            user={user}
            invitationId={selectedInvitationId}
            onBack={() => setActiveTab('dashboard')}
          />
        )}

        {/* Administrative system stats logs console */}
        {activeTab === 'admin' && user && user.role === 'admin' && (
          <AdminConsole user={user} />
        )}
      </main>

    </div>
  );
}
