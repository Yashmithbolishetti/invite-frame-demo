/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Search, Sparkles, SlidersHorizontal, ArrowUpRight, Check, Heart, Play, Monitor, Tablet, Phone, Star, ShieldCheck, Zap, Mail, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Template, User } from '../types.ts';

interface LandingPageProps {
  user: User | null;
  onSelectTemplate: (tmpl: Template) => void;
  triggerAuthModal: () => void;
  setActiveTab: (tab: string) => void;
  setSelectedInvitationId: (id: string) => void;
}

export default function LandingPage({ user, onSelectTemplate, triggerAuthModal, setActiveTab, setSelectedInvitationId }: LandingPageProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('mobile');
  const [faqOpen, setFaqOpen] = useState<{ [key: number]: boolean }>({ 0: true });

  const categories = [
    'All', 'Wedding', 'Birthday', 'Engagement', 'Baby Shower', 'Housewarming', 'Corporate', 'Festival', 'Anniversary', 'Graduation'
  ];

  useEffect(() => {
    fetchTemplates();
  }, [categoryFilter, searchQuery]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const url = `/api/templates?category=${categoryFilter === 'All' ? '' : categoryFilter}&search=${searchQuery}`;
      const res = await fetch(url);
      const data = await res.json();
      setTemplates(data || []);
    } catch (err) {
      console.error('Failed to get templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = async (tmpl: Template) => {
    if (!user) {
      alert('Please Sign In or Register to build invitations under your account!');
      triggerAuthModal();
      return;
    }

    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify({
          templateId: tmpl.id,
          title: `My ${tmpl.name}`
        })
      });

      if (!res.ok) throw new Error('Failed to clone');
      
      const newInvite = await res.json();
      setSelectedInvitationId(newInvite.id);
      setActiveTab('editor');
    } catch (err) {
      console.error('Error selecting template:', err);
      alert('Failed to duplicate template. Please try signing in again.');
    }
  };

  const toggleFaq = (idx: number) => {
    setFaqOpen(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Mock-up links using high resolution templates
  const mockScreens = {
    desktop: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&auto=format&fit=crop',
    tablet: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1000&auto=format&fit=crop',
    mobile: 'https://images.unsplash.com/photo-1519225495810-7512c696505a?w=600&auto=format&fit=crop'
  };

  return (
    <div className="bg-white min-h-screen text-stone-900 relative">
      
      {/* 1. HERO MAIN SECTION */}
      <section className="relative overflow-hidden bg-radial from-stone-50 via-white to-white pt-20 pb-24 md:pt-28 md:pb-36 border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-7 flex flex-col text-left">
              <div className="inline-flex items-center gap-2 bg-stone-100/80 backdrop-blur rounded-full px-3.5 py-1.5 text-xs text-stone-850 font-semibold tracking-wider uppercase mb-6 self-start border border-stone-200/40">
                <Sparkles className="h-4.5 w-4.5 text-amber-500 fill-amber-500" />
                No credit cards. Completely free.
              </div>
              
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.08] text-stone-950 font-sans">
                Create Stunning <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-stone-900 via-stone-750 to-purple-650">Digital Invitations</span><br />
                in Minutes
              </h1>
              
              <p className="mt-6 text-stone-600 text-base sm:text-lg leading-relaxed max-w-lg font-normal">
                Choose from beautifully designed invitation websites and templates for weddings, birthdays, engagements, baby showers, housewarmings, corporate events, festivals, and more.
              </p>

              <div className="mt-8 flex flex-wrap gap-4 items-center">
                <a 
                  href="#templates-catalog"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-stone-950 px-6 text-xs font-bold uppercase tracking-widest text-white shadow-xl transition-all hover:bg-stone-850 hover:translate-y-[-1px]"
                >
                  Browse Free Templates
                </a>
                <button 
                  onClick={() => alert(`Sign in or select "Use Template" on any thumbnail inside our catalog below to explore live editing!`)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-stone-200 px-6 text-xs font-bold uppercase tracking-widest text-stone-750 hover:bg-stone-50 transition-colors"
                >
                  <Play className="h-4 w-4 text-stone-400 fill-stone-400" />
                  View Live Demo
                </button>
              </div>

              {/* Trust Micro Indicators */}
              <div className="mt-12 flex flex-wrap gap-8 items-center border-t border-gray-100 pt-8">
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-stone-950">24+</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Epic Core Themes</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-slate-800">100%</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Offline Zipped Exports</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-slate-800">Unlimited</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Guest RSVP Submissions</span>
                </div>
              </div>

            </div>

            {/* Device Frame Animation Mockup Grid */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full max-w-sm flex items-center justify-center gap-2 bg-stone-100/80 p-1.5 rounded-full mb-4.5 border border-stone-200/50">
                <button 
                  onClick={() => setPreviewDevice('desktop')}
                  className={`flex h-8 items-center gap-1.5 rounded-full px-4 text-[10px] font-bold uppercase tracking-widest transition-colors ${previewDevice === 'desktop' ? 'bg-white shadow-sm text-stone-950' : 'text-stone-500'}`}
                >
                  <Monitor className="h-3.5 w-3.5" /> Desktop
                </button>
                <button 
                  onClick={() => setPreviewDevice('tablet')}
                  className={`flex h-8 items-center gap-1.5 rounded-full px-4 text-[10px] font-bold uppercase tracking-widest transition-colors ${previewDevice === 'tablet' ? 'bg-white shadow-sm text-stone-950' : 'text-stone-500'}`}
                >
                  <Tablet className="h-3.5 w-3.5" /> Tablet
                </button>
                <button 
                  onClick={() => setPreviewDevice('mobile')}
                  className={`flex h-8 items-center gap-1.5 rounded-full px-4 text-[10px] font-bold uppercase tracking-widest transition-colors ${previewDevice === 'mobile' ? 'bg-white shadow-sm text-stone-950' : 'text-stone-500'}`}
                >
                  <Phone className="h-3.5 w-3.5" /> Mobile
                </button>
              </div>

              {/* Interactive simulated hardware bezel wrapper */}
              <div className="relative w-full aspect-[4/5] bg-stone-100 rounded-[2.5rem] p-3 border border-stone-200 shadow-2xl flex items-center justify-center overflow-hidden transition-all duration-300 md:max-w-md">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5.5 bg-stone-950 rounded-full z-20 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-stone-850"></div>
                </div>

                <div className="w-full h-full rounded-[2rem] overflow-hidden bg-stone-50 relative z-10 border border-stone-200/50">
                  <img 
                    src={mockScreens[previewDevice]} 
                    alt="Simulated Wedding Invitation Demo"
                    className="w-full h-full object-cover select-none transition-all duration-500" 
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent p-6 text-white text-left flex flex-col">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-amber-400">Live Custom Premium Site</span>
                    <h4 className="text-xl font-bold font-serif leading-tight">Arthur &amp; Eleanor Married</h4>
                    <p className="text-xs text-stone-300 leading-normal mt-1 p-0 font-sans">Saturday Sept 26, 2026 | Grand Alchemist Hall</p>
                    <div className="mt-3 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-[10px] text-emerald-400 font-mono">Accepting live RSVP forms</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* 2. TRUST SECTION */}
      <section className="bg-stone-50/50 py-12 border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-center text-[10px] uppercase font-bold tracking-widest text-stone-400 mb-6">TRUSTED BY OVER 15,000+ COUPLES WORLDWIDE</p>
          <div className="flex flex-wrap items-center justify-center gap-x-16 gap-y-8 grayscale opacity-55">
            <span className="text-xl font-black font-sans tracking-tighter">VOGUE MARRIAGES</span>
            <span className="text-xl font-black font-sans tracking-tight">KNOT PLATINUM</span>
            <span className="text-xl font-bold font-serif tracking-tight">BRIDES &amp; GOWNS</span>
            <span className="text-xl font-black font-mono">LUX婚礼</span>
            <span className="text-xl font-sans tracking-widest font-black">EMERALD STU</span>
          </div>
        </div>
      </section>

      {/* 3. CORE FEATURES LIST */}
      <section className="py-24 border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <span className="text-xs font-bold tracking-widest uppercase py-1 px-4 mb-3 rounded-full bg-stone-100 text-stone-900 inline-block">
              PLATFORM ENGINE
            </span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-stone-950 font-sans mt-3">
              Features Built for Perfection
            </h2>
            <p className="text-stone-500 font-normal leading-relaxed mt-4">
              Everything you need to compile, customize, publish, and distribute luxury digital wedding and events materials with zero hosting fees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl border border-stone-100 hover:border-stone-200/80 bg-white shadow-sm transition-all hover:scale-[1.01]">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-stone-950 text-white mb-6">
                <Heart className="h-6 w-6 stroke-[1.8]" />
              </div>
              <h3 className="text-lg font-black tracking-tight font-sans">Wedding &amp; Event Builders</h3>
              <p className="text-sm text-stone-500 leading-relaxed mt-3">
                Pre-configured template collections tailored exactly for Weddings, Birthdays, Corporate Galas, and Housewarmings. Just swap text and go!
              </p>
            </div>

            <div className="p-8 rounded-3xl border border-stone-100 hover:border-stone-200/80 bg-white shadow-sm transition-all hover:scale-[1.01]">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-emerald-500 text-white mb-6">
                <Check className="h-6 w-6 stroke-[2.5]" />
              </div>
              <h3 className="text-lg font-black tracking-tight font-sans">Working RSVP Collections</h3>
              <p className="text-sm text-stone-500 leading-relaxed mt-3">
                Let guests RSVP immediately. Your dashboard lists attendees list with emails, phone tallies, custom greetings, and 1-click CSV exports.
              </p>
            </div>

            <div className="p-8 rounded-3xl border border-stone-100 hover:border-stone-200/80 bg-white shadow-sm transition-all hover:scale-[1.01]">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-indigo-500 text-white mb-6">
                <Zap className="h-6 w-6 stroke-[2]" />
              </div>
              <h3 className="text-lg font-black tracking-tight font-sans">Offline Independent ZIP Export</h3>
              <p className="text-sm text-stone-500 leading-relaxed mt-3">
                Download a fully self-contained offline ZIP. Contains code index, loaded style frameworks, target directories, custom MP3 background tracks, and MP4 loops!
              </p>
            </div>

            <div className="p-8 rounded-3xl border border-stone-100 hover:border-stone-200/80 bg-white shadow-sm transition-all hover:scale-[1.01]">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-amber-500 text-white mb-6">
                <Sparkles className="h-6 w-6 stroke-[1.8]" />
              </div>
              <h3 className="text-lg font-black tracking-tight font-sans">Universal Media Integration</h3>
              <p className="text-sm text-stone-500 leading-relaxed mt-3">
                Upload custom MP3 audio or loop MP4 video backdrops for stunning cinematic section styling. Fully supported on all published designs.
              </p>
            </div>

            <div className="p-8 rounded-3xl border border-stone-100 hover:border-stone-200/80 bg-white shadow-sm transition-all hover:scale-[1.01]">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-stone-900 text-white mb-6">
                <Mail className="h-6 w-6 stroke-[1.8]" />
              </div>
              <h3 className="text-lg font-black tracking-tight font-sans">Luxury Live Maps &amp; Countdown Clocks</h3>
              <p className="text-sm text-stone-500 leading-relaxed mt-3">
                Simply paste standard Google Maps directions link for immediate embedded venue access, alongside beautiful bento countdown clocks!
              </p>
            </div>

            <div className="p-8 rounded-3xl border border-stone-100 hover:border-stone-200/80 bg-white shadow-sm transition-all hover:scale-[1.01]">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-rose-500 text-white mb-6">
                <SlidersHorizontal className="h-6 w-6 stroke-[1.8]" />
              </div>
              <h3 className="text-lg font-black tracking-tight font-sans">Advanced Theme Controls</h3>
              <p className="text-sm text-stone-500 leading-relaxed mt-3">
                Take precise command of colors (backgrounds, cards, button borders), typography (serif, display, sans-serif), grids, line-heights, and spacing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. TEMPLATE CATEGORIES & DYNAMIC CATALOG AND SEARCH */}
      <section id="templates-catalog" className="py-24 bg-stone-50/50 border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="text-left">
              <span className="text-xs font-bold tracking-widest uppercase px-3 py-1 bg-stone-100 text-stone-900 rounded-full inline-block">
                CHOOSE DESIGN
              </span>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight font-sans mt-3">
                Our Curated Template Collection
              </h2>
              <p className="text-xs text-stone-500 mt-1 max-w-md">
                Every single template below fully supports photo galleries, custom YouTube trailer embedded layouts, and interactive MP3 loops.
              </p>
            </div>

            {/* SEARCH PANEL */}
            <div className="relative w-full md:max-w-xs">
              <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                <Search className="h-4.5 w-4.5 text-stone-400" />
              </div>
              <input 
                id="search-input-field"
                type="text" 
                placeholder="Search templates (e.g., Royal)..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-stone-200/80 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 text-xs"
              />
            </div>
          </div>

          {/* DYNAMIC CATEGORY FILTER TABS */}
          <div className="flex flex-wrap items-center gap-2 mb-10 overflow-x-auto pb-2 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                id={`cat-filter-${cat}`}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-full transition-all whitespace-nowrap ${
                  categoryFilter === cat 
                    ? 'bg-stone-950 text-white shadow-md' 
                    : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* TEMPLATE CONTAINER */}
          {loading ? (
            <div className="py-24 text-center">
              <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-stone-950 border-t-transparent"></span>
              <p className="text-xs text-stone-500 uppercase tracking-widest mt-4 font-bold font-mono">Seeding premium designs...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-stone-100 p-8 shadow-sm">
              <HelpCircle className="h-10 w-10 text-stone-350 mx-auto mb-3" />
              <h3 className="text-base font-bold text-stone-950">No Templates Found</h3>
              <p className="text-xs text-stone-500 mt-1">Try resetting your search filter or keying in alternative phrases.</p>
              <button 
                id="reset-filter-btn"
                onClick={() => { setCategoryFilter('All'); setSearchQuery(''); }}
                className="mt-4 px-4 py-2 bg-stone-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-stone-850"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {templates.map(tmpl => (
                <div 
                  key={tmpl.id} 
                  id={`tmpl-card-${tmpl.id}`}
                  className="group flex flex-col bg-white rounded-3xl border border-stone-200/40 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:translate-y-[-2px]"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-stone-100 relative">
                    <img 
                      src={tmpl.thumbnailUrl} 
                      alt={tmpl.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Visual Badge Category overlay */}
                    <div className="absolute top-4 left-4 z-10">
                      <span className="text-[9px] uppercase font-bold tracking-widest bg-stone-950/80 backdrop-blur text-white px-3 py-1 rounded-full border border-white/20">
                        {tmpl.category}
                      </span>
                    </div>

                    {/* Dark gradient overlay hover use template launch trigger */}
                    <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button 
                        id={`btn-use-tmpl-${tmpl.id}`}
                        onClick={() => handleUseTemplate(tmpl)}
                        className="p-3 bg-white rounded-full text-stone-950 text-xs font-bold uppercase tracking-widest px-6 shadow-xl transform scale-95 duration-200 group-hover:scale-100"
                      >
                        Use Template &rarr;
                      </button>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col text-left flex-1">
                    <h3 className="text-lg font-black tracking-tight text-stone-950 font-sans">{tmpl.name}</h3>
                    <p className="text-xs text-stone-500 font-normal leading-relaxed mt-2 flex-1">
                      {tmpl.description}
                    </p>
                    
                    <div className="mt-5 border-t border-gray-100 pt-4 flex items-center justify-between">
                      <span className="text-[10px] text-stone-400 font-semibold font-mono uppercase">
                        Theme Heading: {tmpl.theme.fonts.heading}
                      </span>
                      <button 
                        id={`btn-text-init-${tmpl.id}`}
                        onClick={() => handleUseTemplate(tmpl)}
                        className="text-xs font-bold text-stone-950 underline flex items-center gap-0.5"
                      >
                        Launch
                        <ArrowUpRight className="h-3.5 w-3.5 stroke-[2]" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </section>

      {/* 5. USER TESTIMONIALS */}
      <section className="py-24 bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold tracking-widest uppercase px-4 py-1 rounded-full bg-stone-100 text-stone-900 inline-block">
              REVIEWS
            </span>
            <h2 className="text-3xl md:text-4xl font-black font-sans mt-3">What Our Users Are Saying</h2>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">Read of real luxury marriages coordinated perfectly using InviteFrame.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-stone-50 border border-stone-100 text-left">
              <div className="flex items-center gap-1.5 text-amber-500 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-4.5 w-4.5 fill-amber-500 text-amber-500" />)}
              </div>
              <p className="text-xs text-stone-600 italic leading-relaxed">
                "We loved the Minimal Luxury theme for our Seattle wedding project. Swapping fonts, pasting direct Google direction URLs, and inserting our cinematic proposal trailer took less than five minutes. Our guests loved clicking play on our violin waltz track while submitting RSVPs!"
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-stone-300 font-bold flex items-center justify-center text-xs text-stone-700">SR</div>
                <div>
                  <h4 className="text-xs font-bold">Sophia &amp; Richard</h4>
                  <span className="text-[10px] text-stone-400">Wedding Couple</span>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-stone-50 border border-stone-100 text-left">
              <div className="flex items-center gap-1.5 text-amber-500 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-4.5 w-4.5 fill-amber-500 text-amber-500" />)}
              </div>
              <p className="text-xs text-stone-600 italic leading-relaxed">
                "Our marketing team prepared a highly aesthetic tech invite for a major Carbon Zero product disclosure using the Neon product layout. The offline export compiled inside a single fully localized folder. Unbelievably high standard of generation structure!"
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-stone-300 font-bold flex items-center justify-center text-xs text-stone-700">JH</div>
                <div>
                  <h4 className="text-xs font-bold">Julia Henderson</h4>
                  <span className="text-[10px] text-stone-400">Marketing Director</span>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-stone-50 border border-stone-100 text-left">
              <div className="flex items-center gap-1.5 text-amber-500 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-4.5 w-4.5 fill-amber-500 text-amber-500" />)}
              </div>
              <p className="text-xs text-stone-600 italic leading-relaxed">
                "Completely free, absolutely premium luxury wedding layouts. The RSVP tracking is immediate, the countdown clocks animate smoothly, and offline download capabilities meant we kept backups on local tablets! Competing builders should be nervous."
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-stone-300 font-bold flex items-center justify-center text-xs text-stone-700">MK</div>
                <div>
                  <h4 className="text-xs font-bold">Meera &amp; Karthik</h4>
                  <span className="text-[10px] text-stone-400">Traditional Indian Couple</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ TOGGLES ACCORDION */}
      <section className="py-24 bg-stone-50/50 border-b border-gray-100">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold tracking-widest uppercase px-4 py-1 rounded-full bg-stone-100 text-stone-900 inline-block">
              QUESTIONS
            </span>
            <h2 className="text-3xl font-black font-sans mt-3">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {[
              { q: "Is the platform genuinely 100% free?", a: "Yes, InviteFrame is completely and genuinely free. There are no payment paywalls, no watermark additions on template designs, and no hosting subscription charges." },
              { q: "How do I download the invitation as an offline website?", a: "Once you create your invitation inside our editor screen, you have access to a single-click 'Download Standalone ZIP' button in the publishing menu. This grabs the page, inline styles, loaded icons, and copies your custom audio mp3 and video mp4 background tracks inside a portable offline zip folder package." },
              { q: "Will the music play automatically on modern browsers?", a: "Major web browsers prevent sound files from autoplaying unless the user makes a physical gesture on the invitation page first. InviteFrame overcomes this standard sandbox security restrictions gracefully by triggering a floating music player drawer equipped with custom mute, loop, volume, and manual play/pause components." },
              { q: "Can I use external links for trailers and backdrops?", a: "Yes! You can choose to upload MP4 movies or paste standard YouTube video link parameters directly inside our video customs panels; the templates will automatically adapt to size dynamically." },
              { q: "How do guests confirm attendance and RSVP?", a: "Each template renders a classic RSVP card with inputs for Full Name, Email, phone number, guest volume selector, and custom requests. When submitted, responses post instantly to secure database structures." }
            ].map((faq, idx) => (
              <div key={idx} className="border border-stone-200/60 bg-white rounded-2xl overflow-hidden transition-all duration-200">
                <button 
                  id={`faq-btn-${idx}`}
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                >
                  <span className="text-sm font-bold text-stone-900">{faq.q}</span>
                  {faqOpen[idx] ? <ChevronUp className="h-4 w-4 text-stone-500" /> : <ChevronDown className="h-4 w-4 text-stone-500" />}
                </button>
                
                <AnimatePresence>
                  {faqOpen[idx] && (
                    <motion.div 
                      id={`faq-answer-${idx}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-stone-150 px-6 py-4 bg-stone-50/50"
                    >
                      <p className="text-xs text-stone-500 leading-relaxed font-normal">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. CALL TO ACTION CTA PANEL */}
      <section className="py-20 bg-stone-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-radial from-stone-900 to-black z-0"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.15)_1px,transparent_1px)] bg-[size:32px_32px] opacity-25 z-0"></div>
        
        <div className="mx-auto max-w-4xl px-4 sm:px-6 relative z-10 text-center">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-none mb-4 font-sans">
            Ready to Design Your Beautiful Website?
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto leading-relaxed mb-8">
            Join thousands of couples creating immersive, luxury storytelling wedding invitations with zero subscription and hosting fees.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href="#templates-catalog"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-stone-950 font-bold uppercase tracking-widest text-xs shadow-2xl transition-all hover:bg-stone-100 hover:scale-[1.02]"
            >
              Get Started Free Now
            </a>
            <button 
              onClick={triggerAuthModal}
              className="w-full sm:w-auto px-8 py-4 rounded-xl border border-stone-800 text-white font-bold uppercase tracking-widest text-xs hover:bg-stone-900 transition-colors"
            >
              Access Admin dashboard
            </button>
          </div>
        </div>
      </section>

      {/* 8. LANDING FOOTER */}
      <footer className="bg-stone-950 border-t border-stone-900 text-stone-500 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 text-left mb-12">
            <div className="flex flex-col">
              <span className="text-white font-serif font-black text-lg tracking-tight mb-4 flex items-center gap-1.5">
                <div className="h-8 w-8 bg-white text-stone-950 rounded-lg flex items-center justify-center text-sm">I</div>
                INVITEFRAME
              </span>
              <p className="text-[11px] leading-relaxed max-w-xs font-normal">
                Beautiful Digital Invitations. Completely Free. Fully featuring standalone zip files downloader and RSVPs confirmations list.
              </p>
            </div>
            
            <div>
              <h4 className="text-[10px] uppercase font-bold tracking-widest text-white mb-4">Core Templates</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#templates-catalog" onClick={() => setCategoryFilter('Wedding')} className="hover:text-white">Royal Luxury Weddings</a></li>
                <li><a href="#templates-catalog" onClick={() => setCategoryFilter('Wedding')} className="hover:text-white">Traditional South Indian</a></li>
                <li><a href="#templates-catalog" onClick={() => setCategoryFilter('Birthday')} className="hover:text-white">Milestone Birthdays</a></li>
                <li><a href="#templates-catalog" onClick={() => setCategoryFilter('Corporate')} className="hover:text-white">Neon Product Launches</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] uppercase font-bold tracking-widest text-white mb-4">Company Pages</h4>
              <ul className="space-y-2 text-xs">
                <li><button onClick={() => alert("Help documentation is built-in inside each customizable option!")} className="hover:text-white text-left focus:outline-none">Platform Help Docs</button></li>
                <li><button onClick={() => alert("Terms of service are completely unrestricted. Copy, download and redistribute as you wish.")} className="hover:text-white text-left focus:outline-none font-sans">Open Licenses</button></li>
                <li><button onClick={() => alert("Privacy matters! All RSVP listings are kept strictly inside private local database records.")} className="hover:text-white text-left focus:outline-none">Privacy policies</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] uppercase font-bold tracking-widest text-white mb-4">Contacts &amp; Support</h4>
              <p className="text-xs leading-relaxed">
                Need specialized customized packages? Reach out to support@inviteframe.com or coordinate via slack.
              </p>
            </div>
          </div>

          <div className="border-t border-stone-900 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[10px] uppercase font-bold tracking-widest font-mono">
              &copy; 2026 INVITEFRAME SYSTEMS. ALL RIGHTS RESERVED.
            </p>
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider">
              <span className="text-stone-400">STATUS: ACTIVE</span>
              <span className="text-indigo-400">UTC: 2026-06-10</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
