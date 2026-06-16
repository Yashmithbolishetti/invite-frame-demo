/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User as UserIcon, LogIn, LogOut, UserPlus, Sliders, LayoutDashboard, Database, HelpCircle, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types.ts';

interface NavigationProps {
  user: User | null;
  onLogin: (u: User) => void;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Navigation({ user, onLogin, onLogout, activeTab, setActiveTab }: NavigationProps) {
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const url = isRegistering ? '/api/auth/register' : '/api/auth/login';
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onLogin(data.user);
      setShowAuthModal(false);
      setFormData({ name: '', email: '', password: '' });
      
      // Auto routing based on role
      if (data.user.role === 'admin') {
        setActiveTab('admin');
      } else {
        setActiveTab('dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Connection lost');
    } finally {
      setLoading(false);
    }
  };

  const logoutUser = () => {
    onLogout();
    setActiveTab('home');
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-gray-100/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          
          <div className="flex items-center gap-6">
            <button 
              id="nav-logo-btn"
              onClick={() => setActiveTab('home')} 
              className="flex items-center gap-2 text-stone-900 focus:outline-none transition-transform hover:scale-[1.02]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-950 text-white font-serif font-black shadow-md">
                I
              </div>
              <span className="font-sans font-black text-lg tracking-tight">
                INVITE<span className="font-light text-stone-500">FRAME</span>
              </span>
            </button>

            <nav className="hidden md:flex items-center gap-1">
              <button 
                id="menu-browse-templates"
                onClick={() => setActiveTab('home')}
                className={`px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-colors rounded-full ${
                  activeTab === 'home' 
                    ? 'bg-stone-100 text-stone-950 shadow-sm' 
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Browse Templates
              </button>
              
              {user && (
                <>
                  <button 
                    id="menu-my-invitations"
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-colors rounded-full ${
                      activeTab === 'dashboard' || activeTab === 'editor'
                        ? 'bg-stone-100 text-stone-950 shadow-sm' 
                        : 'text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    My Invitations
                  </button>
                  <button 
                    id="menu-rsvp-dashboard"
                    onClick={() => setActiveTab('rsvps')}
                    className={`px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-colors rounded-full ${
                      activeTab === 'rsvps' 
                        ? 'bg-stone-100 text-stone-950' 
                        : 'text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    Guest RSVPs
                  </button>
                </>
              )}

              {user?.role === 'admin' && (
                <button 
                  id="menu-admin-console"
                  onClick={() => setActiveTab('admin')}
                  className={`px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-colors rounded-full ${
                    activeTab === 'admin' 
                      ? 'bg-rose-50 text-rose-750' 
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  Admin Console
                </button>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-flex text-xs font-medium text-stone-500 bg-stone-50 px-3 py-1.5 rounded-full border border-stone-100 uppercase tracking-widest font-mono">
                  {user.name.split(' ')[0]}
                </span>
                
                <button 
                  id="btn-sign-out"
                  onClick={logoutUser}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-red-100 text-xs font-bold uppercase tracking-wider text-red-600 hover:bg-red-50 focus:outline-none px-4 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <button 
                id="btn-trigger-login-modal"
                onClick={() => { setIsRegistering(false); setShowAuthModal(true); }}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-stone-950 text-xs font-bold uppercase tracking-wider text-white hover:bg-stone-850 px-5 shadow-sm transition-all hover:translate-y-[-0.5px]"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </button>
            )}
          </div>

        </div>
      </header>

      {/* MODAL SYSTEM FOR BACKEND AUTHENTICATION */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div 
              id="auth-modal-panel"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-2xl relative"
            >
              <button 
                id="auth-modal-close"
                onClick={() => { setShowAuthModal(false); setErrorMsg(''); }}
                className="absolute right-5 top-5 text-gray-400 hover:text-gray-900 p-2 text-lg focus:outline-none"
              >
                &times;
              </button>

              <div className="text-center mb-8">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-900 mb-3 font-serif font-black text-xl">
                  I
                </div>
                <h3 className="text-xl font-bold tracking-tight text-gray-900">
                  {isRegistering ? 'Create Your Account' : 'Welcome Back'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {isRegistering ? 'Build and export free beautiful invitations' : 'Sign in to access your wedding & party dashboards'}
                </p>
              </div>

              {errorMsg && (
                <div id="auth-error-msg" className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-100">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {isRegistering && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Your Full Name</label>
                    <input 
                      id="auth-name-input"
                      type="text" 
                      required
                      placeholder="e.g. Yashmith Bolishetti" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Email Address</label>
                  <input 
                    id="auth-email-input"
                    type="email" 
                    required
                    placeholder="name@example.com" 
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Account Password</label>
                  <input 
                    id="auth-pass-input"
                    type="password" 
                    required
                    placeholder="Enter 6+ characters" 
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm"
                  />
                </div>

                <button 
                  id="auth-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-stone-950 text-white text-xs font-bold uppercase tracking-widest shadow-md transition-all hover:bg-stone-850 active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? 'Processing...' : isRegistering ? 'Sign Up Free' : 'Sign In'}
                </button>
              </form>

              <div className="mt-6 text-center border-t border-gray-100 pt-6">
                <button 
                  id="auth-toggle-mode-btn"
                  onClick={() => { setIsRegistering(!isRegistering); setErrorMsg(''); }}
                  className="text-xs text-stone-500 hover:text-stone-950 hover:underline"
                >
                  {isRegistering ? 'Already have an account? Sign In' : 'New to InviteFrame? Register Now'}
                </button>
              </div>

              {/* Display sandbox demo credentials for direct working access */}
              {!isRegistering && (
                <div className="mt-4 p-3 bg-stone-50 rounded-xl border border-stone-100 text-[10px] text-gray-500 font-mono text-center">
                  <p className="font-bold mb-1">🔑 Demo Accounts Available:</p>
                  <p>yashmithbolishetti01@gmail.com &rarr; pass: <span className="font-bold">user123</span></p>
                  <p>user@inviteframe.com (Client) &rarr; pass: <span className="font-bold">user123</span></p>
                  <p>admin@inviteframe.com (Admin) &rarr; pass: <span className="font-bold">admin123</span></p>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
