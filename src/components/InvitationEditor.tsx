/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Palette, Music, Video, Image as ImageIcon, Sparkles, Check, 
  MapPin, Clock, Calendar, Download, Trash2, Plus, ArrowUp, ArrowDown,
  Monitor, Tablet, Phone, Eye, Play, Pause, Volume2, Save, FileVideo, CheckSquare, Settings,
  FileText, Code, Archive
} from 'lucide-react';
import { Invitation, Template, ThemeConfig, InvitationContent, MusicTrack, GalleryItem, ScheduleItem, TimelineItem, SectionConfig } from '../types.ts';
import { downloadInvitationPDF } from '../lib/pdfHelper.ts';

export function formatMapsUrl(url: string) {
  if (!url) return '';
  let cleaned = url.trim();
  if (cleaned.startsWith('<iframe')) {
    const match = cleaned.match(/src="([^"]+)"/);
    if (match && match[1]) {
      cleaned = match[1];
    }
  }
  if (!/^https?:\/\//i.test(cleaned)) {
    return 'https://' + cleaned;
  }
  return cleaned;
}

interface InvitationEditorProps {
  user: any;
  invitationId: string | null;
  onBack: () => void;
}

export default function InvitationEditor({ user, invitationId, onBack }: InvitationEditorProps) {
  const [invite, setInvite] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'info' | 'design' | 'media' | 'gallery' | 'schedule' | 'publish'>('info');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('mobile');
  const [uploading, setUploading] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [audioPlaying, setAudioPlaying] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [previewSlug, setPreviewSlug] = useState<string>('');
  const [slugStatus, setSlugStatus] = useState<'idle' | 'free' | 'taken'>('idle');

  // Interactive Live Countdown state
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0, hours: 0, minutes: 0, seconds: 0
  });

  // Interactive Slideshow states
  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);
  const [slideshowPlaying, setSlideshowPlaying] = useState<boolean>(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (invitationId) {
      fetchInvitation();
    }
  }, [invitationId]);

  // Sync music track if default changes
  useEffect(() => {
    if (invite && audioPlaying) {
      playActiveTrack();
    }
  }, [invite?.music.defaultTrackId]);

  // Live real-time Countdown Timer effect
  useEffect(() => {
    if (!invite?.countdown?.enabled) return;

    const runCountdownCalculation = () => {
      const difference = +new Date(invite.countdown.targetDate) - +new Date();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      });
    };

    runCountdownCalculation();
    const intervalId = setInterval(runCountdownCalculation, 1000);
    return () => clearInterval(intervalId);
  }, [invite?.countdown?.targetDate, invite?.countdown?.enabled]);

  // Live Photo Album Slideshow rotation effect
  useEffect(() => {
    const records = invite?.gallery?.albums[0]?.items || [];
    if (records.length <= 1 || !slideshowPlaying) return;

    const intervalId = setInterval(() => {
      setActiveSlideIdx(prev => (prev + 1) % records.length);
    }, 4500);

    return () => clearInterval(intervalId);
  }, [invite?.gallery?.albums, slideshowPlaying]);

  const fetchInvitation = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invitations/${invitationId}`);
      if (!res.ok) throw new Error('Failed to load invitation');
      const data = await res.json();
      setInvite(data);
      setPreviewSlug(data.slug);
    } catch (err) {
      console.error(err);
      alert('Error fetching invitation records.');
    } finally {
      setLoading(false);
    }
  };

  const saveInvitation = async (updatedInvite?: Invitation) => {
    const dataToSave = updatedInvite || invite;
    if (!dataToSave) return;

    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/invitations/${dataToSave.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id}`
        },
        body: JSON.stringify(dataToSave)
      });
      if (!res.ok) throw new Error('Save error');
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setSaveStatus('error');
    }
  };

  const updateContentField = (field: keyof InvitationContent, value: any) => {
    if (!invite) return;
    const newInvite = {
      ...invite,
      content: {
        ...invite.content,
        [field]: value
      }
    };
    setInvite(newInvite);
    // Debounce or save immediately
    saveInvitation(newInvite);
  };

  const updateThemeField = (field: keyof ThemeConfig['colors'] | keyof ThemeConfig['fonts'] | keyof ThemeConfig['layout'], value: any, category: 'colors' | 'fonts' | 'layout') => {
    if (!invite) return;
    const newInvite = {
      ...invite,
      theme: {
        ...invite.theme,
        [category]: {
          ...invite.theme[category],
          [field]: value
        }
      }
    };
    setInvite(newInvite);
    saveInvitation(newInvite);
  };

  const updateThemeMultipleFields = (
    colors?: Partial<ThemeConfig['colors']>,
    fonts?: Partial<ThemeConfig['fonts']>,
    layout?: Partial<ThemeConfig['layout']>
  ) => {
    if (!invite) return;
    const newInvite = {
      ...invite,
      theme: {
        ...invite.theme,
        colors: colors ? { ...invite.theme.colors, ...colors } : invite.theme.colors,
        fonts: fonts ? { ...invite.theme.fonts, ...fonts } : invite.theme.fonts,
        layout: layout ? { ...invite.theme.layout, ...layout } : invite.theme.layout,
      }
    };
    setInvite(newInvite);
    saveInvitation(newInvite);
  };

  const updateSectionBg = (
    sectionId: string, 
    fields: Partial<NonNullable<SectionConfig['customBg']>>
  ) => {
    if (!invite) return;
    const updatedSections = invite.sections.map(sec => {
      if (sec.id === sectionId) {
        const currentBg = sec.customBg || { type: 'color', value: '' };
        return {
          ...sec,
          customBg: {
            ...currentBg,
            ...fields
          }
        } as SectionConfig;
      }
      return sec;
    });
    
    const newInvite = { ...invite, sections: updatedSections };
    setInvite(newInvite);
    saveInvitation(newInvite);
  };

  const getSectionStyle = (sectionId: string) => {
    if (!invite) return {};
    const sec = invite.sections.find(s => s.id === sectionId);
    if (!sec || !sec.customBg || sec.customBg.type === 'none') return {};
    
    const bg = sec.customBg;
    const styles: React.CSSProperties = { position: 'relative' as const, overflow: 'hidden' as const };
    
    if (bg.textColor) {
      styles.color = bg.textColor;
    }
    
    if (bg.type === 'color') {
      styles.backgroundColor = bg.value;
    } else if (bg.type === 'gradient') {
      styles.backgroundImage = bg.value;
    } else if (bg.type === 'image') {
      styles.backgroundImage = `url(${bg.value})`;
      styles.backgroundSize = 'cover';
      styles.backgroundPosition = 'center';
    }
    
    return styles;
  };

  const getSectionOverlay = (sectionId: string) => {
    if (!invite) return null;
    const sec = invite.sections.find(s => s.id === sectionId);
    if (!sec || !sec.customBg || sec.customBg.type !== 'image') return null;
    
    const bg = sec.customBg;
    const overlayColor = bg.overlayColor || '#000000';
    const overlayOpacity = bg.overlayOpacity !== undefined ? bg.overlayOpacity : 0.4;
    
    return (
      <div 
        className="absolute inset-0 z-0 pointer-events-none rounded-2xl"
        style={{ 
          backgroundColor: overlayColor, 
          opacity: overlayOpacity 
        }} 
      />
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'photo' | 'music' | 'video') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validate type and size in the client first
    const file = files[0];
    const maxBytes = 50 * 1024 * 1024; // 50MB limit

    if (file.size > maxBytes) {
      alert(`The selected file "${file.name}" is too large! Maximum limit is 50MB.`);
      return;
    }

    if (fileType === 'video' && !file.type.includes('mp4') && !file.name.toLowerCase().endsWith('.mp4')) {
      alert("Invalid file format! Please upload an MP4 video (.mp4).");
      return;
    }

    if (fileType === 'music' && !file.type.includes('audio') && !file.type.includes('mp3') && !file.name.toLowerCase().endsWith('.mp3')) {
      alert("Invalid file format! Please upload an MP3 audio track (.mp3).");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append(fileType, files[i]);
    }

    try {
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (invite) {
        let updatedInvite = { ...invite };

        if (fileType === 'photo' && data.photos && data.photos.length > 0) {
          // Push returned files to first gallery album
          const startingItems = updatedInvite.gallery.albums[0]?.items || [];
          const newItems: GalleryItem[] = data.photos.map((url: string, index: number) => ({
            id: `g-uploaded-${Date.now()}-${index}`,
            url,
            caption: 'Our Memories',
            order: startingItems.length + index
          }));

          updatedInvite.gallery.albums[0] = {
            ...updatedInvite.gallery.albums[0],
            items: [...startingItems, ...newItems]
          };
        } else if (fileType === 'music' && data.music && data.music.length > 0) {
          // Push returned track to custom music
          const newTracks: MusicTrack[] = data.music.map((url: string, index: number) => ({
            id: `music-uploaded-${Date.now()}-${index}`,
            title: files[0].name.replace('.mp3', ''),
            url
          }));

          updatedInvite.music.tracks = [...updatedInvite.music.tracks, ...newTracks];
          updatedInvite.music.defaultTrackId = newTracks[0].id;
        } else if (fileType === 'video' && data.videos && data.videos.length > 0) {
          // Set as video backdrop
          updatedInvite.content.backgroundType = 'video';
          updatedInvite.content.backgroundValue = data.videos[0];
        }

        setInvite(updatedInvite);
        saveInvitation(updatedInvite);
        alert(`${fileType.toUpperCase()} file uploaded and integrated!`);
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed. Keep file sizes safe (under 50MB).');
    } finally {
      setUploading(false);
    }
  };

  // Check Slug and Save
  const handleCheckSlug = async () => {
    if (!invite || !previewSlug) return;
    try {
      const res = await fetch(`/api/invitations/slug-check/${previewSlug}`);
      const data = await res.json();
      if (data.available || previewSlug === invite.slug) {
        setSlugStatus('free');
        const newInvite = { ...invite, slug: previewSlug };
        setInvite(newInvite);
        saveInvitation(newInvite);
      } else {
        setSlugStatus('taken');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Music Play/Pause Audio Previewer
  const playActiveTrack = () => {
    if (!invite) return;
    const defaultTrack = invite.music.tracks.find(t => t.id === invite.music.defaultTrackId) || invite.music.tracks[0];
    if (!defaultTrack) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    audioRef.current = new Audio(defaultTrack.url);
    audioRef.current.volume = invite.music.volume || 0.5;
    audioRef.current.loop = invite.music.loop;
    audioRef.current.play()
      .then(() => setAudioPlaying(true))
      .catch(() => {
        setAudioPlaying(false);
        alert('Autoplay blocked. Press play manually!');
      });
  };

  const toggleAudio = () => {
    if (!audioRef.current) {
      playActiveTrack();
      return;
    }
    if (audioPlaying) {
      audioRef.current.pause();
      setAudioPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setAudioPlaying(true))
        .catch(() => setAudioPlaying(false));
    }
  };

  // CRUD Submanagers (Schedules & Timelines)
  const addScheduleCard = () => {
    if (!invite) return;
    const newItem: ScheduleItem = {
      id: `sched-${Date.now()}`,
      title: 'Reception, Cocktails & Banquet Dinner',
      time: '6:30 PM',
      date: 'September 26, 2026',
      venue: 'Lux Manor Estate Hall',
      address: '228 Bel Air Rd, Los Angeles, CA 90077',
      mapsUrl: 'https://maps.apple.com/?q=Bel+Air+Estate'
    };
    const updated = {
      ...invite,
      content: {
        ...invite.content,
        schedule: [...(invite.content.schedule || []), newItem]
      }
    };
    setInvite(updated);
    saveInvitation(updated);
  };

  const removeScheduleCard = (id: string) => {
    if (!invite) return;
    const updated = {
      ...invite,
      content: {
        ...invite.content,
        schedule: (invite.content.schedule || []).filter(item => item.id !== id)
      }
    };
    setInvite(updated);
    saveInvitation(updated);
  };

  const addTimelineCard = () => {
    if (!invite) return;
    const newItem: TimelineItem = {
      id: `tl-${Date.now()}`,
      time: '5:00 PM',
      title: 'Toast Ceremonials',
      description: 'Exchange toasts with fine champagne and release white doves.'
    };
    const updated = {
      ...invite,
      content: {
        ...invite.content,
        timeline: [...(invite.content.timeline || []), newItem]
      }
    };
    setInvite(updated);
    saveInvitation(updated);
  };

  const removeTimelineCard = (id: string) => {
    if (!invite) return;
    const updated = {
      ...invite,
      content: {
        ...invite.content,
        timeline: (invite.content.timeline || []).filter(item => item.id !== id)
      }
    };
    setInvite(updated);
    saveInvitation(updated);
  };

  const addCustomSection = () => {
    if (!invite) return;
    const newItem = {
      id: `custom-${Date.now()}`,
      title: 'Dress Code & Palette Guidelines',
      content: 'Please arrive clad in pastel gold, champagne silks, or rich forest greens.'
    };
    const updated = {
      ...invite,
      content: {
        ...invite.content,
        customSections: [...(invite.content.customSections || []), newItem]
      }
    };
    setInvite(updated);
    saveInvitation(updated);
  };

  const updateCustomSection = (id: string, key: 'title' | 'content', val: string) => {
    if (!invite) return;
    const updatedSections = (invite.content.customSections || []).map(sec => {
      if (sec.id === id) {
        return { ...sec, [key]: val };
      }
      return sec;
    });
    const updated = {
      ...invite,
      content: {
        ...invite.content,
        customSections: updatedSections
      }
    };
    setInvite(updated);
    saveInvitation(updated);
  };

  const removeCustomSection = (id: string) => {
    if (!invite) return;
    const updated = {
      ...invite,
      content: {
        ...invite.content,
        customSections: (invite.content.customSections || []).filter(sec => sec.id !== id)
      }
    };
    setInvite(updated);
    saveInvitation(updated);
  };

  const handlePublishToggle = () => {
    if (!invite) return;
    const newInvite = { ...invite, published: !invite.published };
    setInvite(newInvite);
    saveInvitation(newInvite);
  };

  // Standalone offline downloader
  const handleZIPExport = () => {
    if (!invite) return;
    window.location.href = `/api/invitations/${invite.id}/export`;
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-stone-950 border-t-transparent"></span>
        <p className="text-xs uppercase font-bold tracking-widest text-stone-500 font-mono mt-4">Bundling customization canvas...</p>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="p-8 text-center bg-red-50 text-red-800 border border-red-150 rounded-2xl">
        <p>This invitation cannot be located in the relational database catalog.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-stone-950 text-white rounded-xl text-xs">Return Dashboard</button>
      </div>
    );
  }

  const defaultTrack = invite.music.tracks.find(t => t.id === invite.music.defaultTrackId) || invite.music.tracks[0];
  const galleryItems = invite.gallery.albums[0]?.items || [];

  return (
    <div className="bg-stone-50 flex flex-col min-h-[calc(100vh-4rem)]">
      
      {/* 1. TOP STUDIO NAVBAR HEADLINE */}
      <div className="bg-white border-b border-stone-150 flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <button 
            id="editor-btn-back"
            onClick={onBack} 
            className="p-2 hover:bg-stone-100 rounded-xl transition-colors focus:outline-none"
          >
            <ArrowLeft className="h-5 w-5 text-stone-700" />
          </button>
          <div className="text-left">
            <span className="text-[9px] uppercase font-bold tracking-widest text-stone-400">DESIGN CANVAS STUDIO</span>
            <h2 className="text-base font-black text-stone-950 leading-tight">{invite.title}</h2>
          </div>
        </div>

        {/* Sync Indicator */}
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-semibold font-mono uppercase text-stone-400">
            {saveStatus === 'saving' && '☁️ Saving updates...'}
            {saveStatus === 'saved' && '✅ All changes saved'}
            {saveStatus === 'idle' && '⭐ Connected'}
            {saveStatus === 'error' && '❌ Cloud sync error'}
          </span>
          
          <button 
            id="editor-btn-direct-save"
            onClick={() => saveInvitation()}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-stone-950 px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-stone-850"
          >
            <Save className="h-4 w-4" /> Save Now
          </button>
        </div>
      </div>

      {/* 2. THREE-PANEL CORE CONTAINER: LEFT TABS, MIDDLE FIELDS, RIGHT PREVIEW */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 overflow-hidden h-[calc(100vh-7.5rem)]">
        
        {/* PANEL A: CUSTOMIZER INPUT CONTROLS (XS TO L) */}
        <div className="xl:col-span-5 border-r border-stone-150 bg-white flex flex-col overflow-y-auto">
          
          {/* Tabs bar selector */}
          <div className="flex items-center border-b border-stone-100 overflow-x-auto scrollbar-none px-4 bg-stone-50">
            {[
              { id: 'info', icon: CheckSquare, label: 'Metadata' },
              { id: 'design', icon: Palette, label: 'Theme & Typography' },
              { id: 'media', icon: Music, label: 'Audio & Video' },
              { id: 'gallery', icon: ImageIcon, label: 'Photo Gallery' },
              { id: 'schedule', icon: Calendar, label: 'Schedule' },
              { id: 'publish', icon: Download, label: 'Publish & Export' }
            ].map(tab => (
              <button
                key={tab.id}
                id={`editor-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3.5 px-4 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap focus:outline-none transition-colors ${
                  activeTab === tab.id 
                    ? 'border-stone-950 text-stone-950 bg-white' 
                    : 'border-transparent text-stone-400 hover:text-stone-900 bg-transparent'
                }`}
              >
                <tab.icon className="h-4.5 w-4.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Subpanel variables form renderer */}
          <div className="p-8 text-left space-y-6 flex-1">
            
            {/* TAB A: GENERAL METADATA FIELDS */}
            {activeTab === 'info' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black text-stone-950 mb-1">General Details</h3>
                  <p className="text-xs text-stone-500">Provide the names and statements that formulate the main invitation landing card.</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Invitation Title</label>
                    <input 
                      id="input-title"
                      type="text" 
                      value={invite.title}
                      onChange={(e) => setInvite({ ...invite, title: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white text-xs text-stone-850"
                      placeholder="My Wedding Day"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Core Event Title Header</label>
                    <input 
                      id="input-eventTitle"
                      type="text" 
                      value={invite.content.eventTitle}
                      onChange={(e) => updateContentField('eventTitle', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white text-xs text-stone-850"
                      placeholder="Eleanor & Arthur Wedding"
                    />
                  </div>

                  {invite.content.brideName !== undefined && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Bride Wording</label>
                        <input 
                          type="text" 
                          value={invite.content.brideName}
                          onChange={(e) => updateContentField('brideName', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white text-xs text-stone-850"
                          placeholder="Eleanor"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Groom Wording</label>
                        <input 
                          type="text" 
                          value={invite.content.groomName}
                          onChange={(e) => updateContentField('groomName', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white text-xs text-stone-850"
                          placeholder="Arthur"
                        />
                      </div>
                    </div>
                  )}

                  {invite.content.birthdayPersonName !== undefined && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Celebrating Person / Organization</label>
                      <input 
                        type="text" 
                        value={invite.content.birthdayPersonName}
                        onChange={(e) => updateContentField('birthdayPersonName', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white text-xs text-stone-850"
                        placeholder="Alexander"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Event Date Subheading</label>
                    <input 
                      type="text" 
                      value={invite.content.dateText}
                      onChange={(e) => updateContentField('dateText', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white text-xs text-stone-850"
                      placeholder="Saturday September 26, 2026"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Short Welcome Text</label>
                    <textarea 
                      rows={3}
                      value={invite.content.eventDescription}
                      onChange={(e) => updateContentField('eventDescription', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white text-xs text-stone-850"
                      placeholder="Join us for cocktails and dancing as we tie the knot..."
                    ></textarea>
                  </div>

                  <div className="h-[1px] bg-stone-100 my-4"></div>

                  <div>
                    <h4 className="text-xs font-black uppercase text-stone-800 mb-3">Custom Subsections &amp; Guidelines</h4>
                    <div className="space-y-4">
                      {(invite.content.customSections || []).map((sec) => (
                        <div key={sec.id} className="p-4 rounded-xl border border-stone-200 bg-stone-50 relative">
                          <button 
                            onClick={() => removeCustomSection(sec.id)}
                            className="absolute top-2 right-2 p-1.5 hover:bg-stone-200 text-stone-400 hover:text-red-600 rounded-lg transition-colors focus:outline-none"
                            title="Delete custom card"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                          
                          <input 
                            type="text"
                            value={sec.title}
                            onChange={(e) => updateCustomSection(sec.id, 'title', e.target.value)}
                            className="font-bold text-stone-900 border-b border-transparent focus:border-stone-950 bg-transparent text-xs w-5/6 focus:outline-none mb-2"
                            placeholder="Section Title"
                          />
                          <textarea
                            rows={2}
                            value={sec.content}
                            onChange={(e) => updateCustomSection(sec.id, 'content', e.target.value)}
                            className="w-full p-2 rounded-lg bg-white border border-stone-100 focus:outline-none text-xs"
                            placeholder="Custom paragraphs..."
                          ></textarea>
                        </div>
                      ))}

                      <button 
                        onClick={addCustomSection}
                        className="w-full py-3 border-2 border-dashed border-stone-200 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-stone-500 hover:text-stone-950 transition-colors"
                      >
                        <Plus className="h-4 w-4" /> Add Custom Card
                      </button>
                    </div>
                  </div>

                  <div className="h-[1px] bg-stone-100 my-4"></div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Dress Code Note</label>
                      <input 
                        type="text" 
                        value={invite.content.dressCode || ''}
                        onChange={(e) => updateContentField('dressCode', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white text-xs"
                        placeholder="Smart Formal Wedding Attire"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Gift Registry Venmo/Details</label>
                      <input 
                        type="text" 
                        value={invite.content.giftInfo || ''}
                        onChange={(e) => updateContentField('giftInfo', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white text-xs"
                        placeholder="Honeymoon contributions: @venmo"
                      />
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB B: COLOR PALETTE & TYPOGRAPHY SPECS */}
            {activeTab === 'design' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black text-stone-950 mb-1">Theme &amp; Typography Designer</h3>
                  <p className="text-xs text-stone-500">Pick stunning color presets, matching luxury fonts, and control margin spacing pacing.</p>
                </div>

                <div className="space-y-4">
                  {/* Presets Grid */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Preset Mood Palettes</label>
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {[
                        { name: 'Royal Gold 👑', pri: '#C5A85A', bg: '#111625', txt: '#F4EFE6', bdr: '#C5A85A33', btn: '#C5A85A', btnTxt: '#111625', card: '#1B2234' },
                        { name: 'Champagne Luxury 🥂', pri: '#D4AF37', bg: '#FCFBF7', txt: '#1C1917', bdr: '#D4AF3744', btn: '#D4AF37', btnTxt: '#FFFFFF', card: '#FFFFFF' },
                        { name: 'Rose Gold 🌸', pri: '#B76E79', bg: '#FFF8F8', txt: '#2C2525', bdr: '#B76E7944', btn: '#B76E79', btnTxt: '#FFFFFF', card: '#FFFFFF' },
                        { name: 'Emerald Elegance 🌿', pri: '#097969', bg: '#F0F7F4', txt: '#1A2D23', bdr: '#09796944', btn: '#097969', btnTxt: '#FFFFFF', card: '#FFFFFF' },
                        { name: 'Midnight Black 🖤', pri: '#FFFFFF', bg: '#09090B', txt: '#FAFAFA', bdr: '#27272A', btn: '#FAFAFA', btnTxt: '#09090B', card: '#18181B' },
                        { name: 'Ivory Wedding ✉️', pri: '#8C7853', bg: '#FAF9F6', txt: '#2B2A27', bdr: '#D4CFC5', btn: '#8C7853', btnTxt: '#FAF9F6', card: '#FFFFFF' },
                        { name: 'Traditional Indian 📿', pri: '#D2143A', bg: '#FFFDF5', txt: '#30030A', bdr: '#EBB31A55', btn: '#D2143A', btnTxt: '#FFFDF5', card: '#FFFDF8' },
                        { name: 'South Indian Temple 🛕', pri: '#A22B00', bg: '#FCF6E8', txt: '#3D1405', bdr: '#D4AF3755', btn: '#A22B00', btnTxt: '#FCF6E8', card: '#FCFAF2' },
                        { name: 'Modern Purple 💜', pri: '#7C3AED', bg: '#FAFAF9', txt: '#1C1917', bdr: '#E9D5FF', btn: '#7C3AED', btnTxt: '#FFFFFF', card: '#FFFFFF' },
                        { name: 'Luxury White ✨', pri: '#18181B', bg: '#FFFFFF', txt: '#18181B', bdr: '#E4E4E7', btn: '#18181B', btnTxt: '#FFFFFF', card: '#FAFAFA' },
                      ].map((preset, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            updateThemeMultipleFields({
                              primary: preset.pri,
                              background: preset.bg,
                              text: preset.txt,
                              border: preset.bdr,
                              button: preset.btn,
                              buttonText: preset.btnTxt,
                              card: preset.card
                            });
                          }}
                          className={`p-3 rounded-xl border hover:bg-stone-50 text-left flex flex-col justify-between transition-all duration-300 ${
                            invite.theme.colors.background === preset.bg && invite.theme.colors.primary === preset.pri
                              ? 'border-stone-950 bg-stone-50/50 ring-2 ring-stone-950/10'
                              : 'border-stone-200'
                          }`}
                        >
                          <span className="text-[10px] font-black line-clamp-1 leading-snug">{preset.name}</span>
                          <div className="flex gap-1.5 mt-2">
                            <span className="h-4 w-4 rounded-full border border-stone-200 shadow-sm" style={{ backgroundColor: preset.pri }} title="Primary"></span>
                            <span className="h-4 w-4 rounded-full border border-stone-200 shadow-sm" style={{ backgroundColor: preset.bg }} title="Background"></span>
                            <span className="h-4 w-4 rounded-full border border-stone-200 shadow-sm" style={{ backgroundColor: preset.txt }} title="Text"></span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Manual Theme colors selectors */}
                  <div className="bg-stone-50/50 p-4 rounded-2xl border border-stone-150 space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-800">Advanced Custom Colors</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Theme Primary Accent</label>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={invite.theme.colors.primary}
                            onChange={(e) => {
                              updateThemeMultipleFields({
                                primary: e.target.value,
                                button: e.target.value
                              });
                            }}
                            className="h-9 w-9 rounded-md cursor-pointer border border-stone-150"
                          />
                          <input 
                            type="text" 
                            value={invite.theme.colors.primary}
                            onChange={(e) => {
                              updateThemeMultipleFields({
                                primary: e.target.value,
                                button: e.target.value
                              });
                            }}
                            className="w-full px-2 py-1.5 rounded-lg border border-stone-200 bg-white text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Sheet Background Backing</label>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={invite.theme.colors.background}
                            onChange={(e) => updateThemeField('background', e.target.value, 'colors')}
                            className="h-9 w-9 rounded-md cursor-pointer border border-stone-150"
                          />
                          <input 
                            type="text" 
                            value={invite.theme.colors.background}
                            onChange={(e) => updateThemeField('background', e.target.value, 'colors')}
                            className="w-full px-2 py-1.5 rounded-lg border border-stone-200 bg-white text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Primary Text Color</label>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={invite.theme.colors.text || '#1f2937'}
                            onChange={(e) => updateThemeField('text', e.target.value, 'colors')}
                            className="h-9 w-9 rounded-md cursor-pointer border border-stone-150"
                          />
                          <input 
                            type="text" 
                            value={invite.theme.colors.text || '#1f2937'}
                            onChange={(e) => updateThemeField('text', e.target.value, 'colors')}
                            className="w-full px-2 py-1.5 rounded-lg border border-stone-200 bg-white text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Border Tint</label>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={invite.theme.colors.border ? invite.theme.colors.border.substring(0, 7) : '#e7e5e4'}
                            onChange={(e) => updateThemeField('border', e.target.value, 'colors')}
                            className="h-9 w-9 rounded-md cursor-pointer border border-stone-150"
                          />
                          <input 
                            type="text" 
                            value={invite.theme.colors.border || ''}
                            onChange={(e) => updateThemeField('border', e.target.value, 'colors')}
                            className="w-full px-2 py-1.5 rounded-lg border border-stone-200 bg-white text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-[1px] bg-stone-100 my-4"></div>

                  {/* Fonts Pairing option selectors */}
                  <div>
                    <h4 className="text-xs font-black uppercase text-stone-800 mb-3 font-sans">Google Typography presets &amp; pairing</h4>
                    
                    {/* Typography presets buttons */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {[
                        { name: 'Luxury Serif 🔱', heading: 'Playfair Display', body: 'Inter' },
                        { name: 'Classic Roman 🏛️', heading: 'Cinzel', body: 'Outfit' },
                        { name: 'Modern Tech 📡', heading: 'Space Grotesk', body: 'Space Grotesk' },
                        { name: 'Sleek Geometric 📐', heading: 'Outfit', body: 'Outfit' },
                      ].map((preset, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            updateThemeMultipleFields(undefined, {
                              heading: preset.heading,
                              body: preset.body,
                              button: 'Inter'
                            });
                          }}
                          className={`p-2.5 rounded-xl border hover:bg-stone-50 text-left flex flex-col transition-all ${
                            invite.theme.fonts.heading === preset.heading && invite.theme.fonts.body === preset.body
                              ? 'border-stone-950 bg-stone-50 ring-2 ring-stone-950/5'
                              : 'border-stone-200'
                          }`}
                        >
                          <span className="text-[10px] font-black text-stone-900">{preset.name}</span>
                          <span className="text-[8px] text-stone-400 mt-0.5 mt-1 font-mono">{preset.heading} + {preset.body}</span>
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Display Heading Font</label>
                        <select 
                          value={invite.theme.fonts.heading}
                          onChange={(e) => updateThemeField('heading', e.target.value, 'fonts')}
                          className="w-full px-3 py-2 border border-stone-150 bg-white rounded-xl text-xs focus:outline-none"
                        >
                          <option value="Playfair Display">Playfair Display (Luxury Serif)</option>
                          <option value="Cinzel">Cinzel (Traditional Roman)</option>
                          <option value="Space Grotesk">Space Grotesk (Tech Mono)</option>
                          <option value="Outfit">Outfit (Clean Elegant)</option>
                          <option value="Inter">Inter (Swiss Sans)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Body Material Font</label>
                        <select 
                          value={invite.theme.fonts.body}
                          onChange={(e) => updateThemeField('body', e.target.value, 'fonts')}
                          className="w-full px-3 py-2 border border-stone-150 bg-white rounded-xl text-xs focus:outline-none"
                        >
                          <option value="Inter">Inter (Clean Legible)</option>
                          <option value="Outfit">Outfit (Sleek Geometric)</option>
                          <option value="Space Grotesk">Space Grotesk (Modern Tech)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="h-[1px] bg-stone-100 my-4"></div>

                  {/* Custom backgrounds options */}
                  <div>
                    <h4 className="text-xs font-black uppercase text-stone-800 mb-3">Advanced Cinematic Backdrops</h4>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[
                        { id: 'gradient', label: 'Gradient Blend' },
                        { id: 'image', label: 'Photo Layer' },
                        { id: 'video', label: 'Looping Movie' }
                      ].map(type => (
                        <button
                          key={type.id}
                          onClick={() => updateContentField('backgroundType', type.id)}
                          className={`py-3.5 border rounded-xl text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${
                            invite.content.backgroundType === type.id
                              ? 'bg-stone-950 text-white'
                              : 'bg-white text-stone-500 border-stone-150'
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>

                    {invite.content.backgroundType === 'gradient' && (
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Gradient Value CSS</label>
                        <input 
                          type="text" 
                          value={invite.content.backgroundValue}
                          onChange={(e) => updateContentField('backgroundValue', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-stone-150 text-xs"
                          placeholder="linear-gradient(135deg, #111 0%, #222 100%)"
                        />
                      </div>
                    )}

                    {invite.content.backgroundType === 'image' && (
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Backdrop Image URL</label>
                        <input 
                          type="text" 
                          value={invite.content.backgroundValue}
                          onChange={(e) => updateContentField('backgroundValue', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-stone-150 text-xs mb-2"
                        />
                        <button 
                          onClick={() => alert(`To upload custom backdrop photos, use 'Upload photos' under Photo Gallery tab, then copy that file link here!`)}
                          className="px-4 py-2 bg-stone-100 p-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-stone-500"
                        >
                          Manual link instructions
                        </button>
                      </div>
                    )}

                    {invite.content.backgroundType === 'video' && (
                      <div className="space-y-4">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Upload MP4 Video Backdrop</label>
                        <div className="p-4 border-2 border-dashed border-stone-200 rounded-xl bg-stone-50/50 flex flex-col items-center justify-center">
                          <FileVideo className="h-8 w-8 text-stone-400 mb-2" />
                          <input 
                            type="file" 
                            accept="video/mp4" 
                            onChange={(e) => handleFileUpload(e, 'video')} 
                            className="hidden" 
                            id="video-uploader-input-f" 
                          />
                          <label htmlFor="video-uploader-input-f" className="cursor-pointer px-4 py-2 bg-stone-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-stone-850">
                            {uploading ? 'Processing Video...' : 'Select MP4 Loop File'}
                          </label>
                          <p className="text-[9px] text-gray-400 mt-2 font-sans">Ideal specs: <span className="font-bold">10-15s mp4 loop</span> under 15MB</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Independent Section Backgrounds Customizer */}
                  <div className="h-[1px] bg-stone-100 my-4"></div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-stone-800 mb-2">Independent Section Backdrops</h4>
                    <p className="text-[10px] text-stone-500 mb-4">Independently customize the background, gradients, overlays, and text contrast of each individual website section.</p>
                    
                    <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                      {[
                        { id: 'hero', name: 'Hero Greeting Section' },
                        { id: 'story', name: 'Our Story Section' },
                        { id: 'schedule', name: 'Event Details & Venue Section' },
                        { id: 'timeline', name: 'Timeline Section' },
                        { id: 'gallery', name: 'Photo Gallery Section' },
                        { id: 'video', name: 'Video Trailer Section' },
                        { id: 'countdown', name: 'Countdown Clock Section' },
                        { id: 'rsvp', name: 'RSVP Form Section' }
                      ].map(sec => {
                        const config = invite.sections.find(s => s.id === sec.id);
                        if (!config) return null;
                        const bg = config.customBg || { type: 'none', value: '', overlayColor: '#000000', overlayOpacity: 0.4, textColor: '' };
                        
                        return (
                          <div key={sec.id} className="p-4 bg-stone-50/50 rounded-2xl border border-stone-150 space-y-3 text-left">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black text-stone-900">{sec.name}</span>
                              <span className={`text-[8px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${config.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-150 text-stone-500'}`}>
                                {config.enabled ? 'Active' : 'Hidden'}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[8px] uppercase font-bold tracking-widest text-stone-400 mb-1">Bg Style</label>
                                <select 
                                  value={bg.type || 'none'}
                                  onChange={(e: any) => updateSectionBg(sec.id, { type: e.target.value })}
                                  className="w-full text-xs px-2 py-1.5 rounded-lg border bg-white border-stone-200"
                                >
                                  <option value="none">Default (Theme Backing)</option>
                                  <option value="color">Solid Background</option>
                                  <option value="gradient">Gradient Overlay</option>
                                  <option value="image">Custom Photo Background</option>
                                </select>
                              </div>
                              
                              {bg.type !== 'none' && bg.type !== undefined && (
                                <div>
                                  <label className="block text-[8px] uppercase font-bold tracking-widest text-stone-400 mb-1">Text Color Contrast</label>
                                  <select
                                    value={bg.textColor || ''}
                                    onChange={(e) => updateSectionBg(sec.id, { textColor: e.target.value })}
                                    className="w-full text-xs px-2 py-1.5 rounded-lg border bg-white border-stone-200"
                                  >
                                    <option value="">Default (Auto)</option>
                                    <option value="#ffffff font-bold">Light Text / White (#FFF)</option>
                                    <option value="#1c1917">Deep Dark Text (#1C1917)</option>
                                    <option value="#C5A85A">Royal Gold Accent (#C5A85A)</option>
                                  </select>
                                </div>
                              )}
                            </div>

                            {bg.type === 'color' && (
                              <div className="grid grid-cols-6 gap-2 items-center">
                                <div className="col-span-2">
                                  <label className="block text-[8px] uppercase font-bold tracking-widest text-stone-400 mb-1">Color Palette</label>
                                  <input 
                                    type="color" 
                                    value={bg.value || '#ffffff'}
                                    onChange={(e) => updateSectionBg(sec.id, { value: e.target.value })}
                                    className="h-8 w-full rounded cursor-pointer border border-stone-200"
                                  />
                                </div>
                                <div className="col-span-4">
                                  <label className="block text-[8px] uppercase font-bold tracking-widest text-stone-400 mb-1">Hex Color</label>
                                  <input 
                                    type="text" 
                                    value={bg.value || ''}
                                    onChange={(e) => updateSectionBg(sec.id, { value: e.target.value })}
                                    className="w-full text-xs px-2 py-1 border rounded bg-white text-stone-800"
                                    placeholder="#FFFFFF"
                                  />
                                </div>
                              </div>
                            )}

                            {bg.type === 'gradient' && (
                              <div>
                                <label className="block text-[8px] uppercase font-bold tracking-widest text-stone-400 mb-1">CSS Gradient Pattern</label>
                                <input 
                                  type="text" 
                                  value={bg.value || ''}
                                  onChange={(e) => updateSectionBg(sec.id, { value: e.target.value })}
                                  className="w-full text-xs px-2 py-1.5 border rounded-lg bg-white"
                                  placeholder="linear-gradient(135deg, #111, #333)"
                                />
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {[
                                    { name: 'Onyx Dark', val: 'linear-gradient(135deg, #09090b 0%, #1e1b4b 100%)' },
                                    { name: 'Champagne Gold', val: 'linear-gradient(135deg, #fafaf9 0%, #fef3c7 100%)' },
                                    { name: 'Ruby Sunset', val: 'linear-gradient(135deg, #881337 0%, #4c0519 100%)' },
                                    { name: 'Emerald Velvet', val: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)' },
                                    { name: 'Royal Gold Scheme', val: 'linear-gradient(135deg, #111827 0%, #b45309 100%)' }
                                  ].map(recipe => (
                                    <button 
                                      type="button" 
                                      key={recipe.name} 
                                      onClick={() => updateSectionBg(sec.id, { value: recipe.val })}
                                      className="text-[7.5px] px-1.5 py-0.5 bg-stone-200 text-stone-700 hover:bg-stone-300 rounded font-semibold"
                                    >
                                      {recipe.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {bg.type === 'image' && (
                              <div className="space-y-2">
                                <div>
                                  <label className="block text-[8px] uppercase font-bold tracking-widest text-stone-400 mb-1">Background Image Url / Blob</label>
                                  <input 
                                    type="text" 
                                    value={bg.value || ''}
                                    placeholder="https://images.unsplash.com/photo-example..."
                                    onChange={(e) => updateSectionBg(sec.id, { value: e.target.value })}
                                    className="w-full text-xs px-2 py-1.5 border rounded-lg bg-white"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[8px] uppercase font-bold tracking-widest text-stone-400 mb-1">Overlay Color</label>
                                    <input 
                                      type="color" 
                                      value={bg.overlayColor || '#000000'}
                                      onChange={(e) => updateSectionBg(sec.id, { overlayColor: e.target.value })}
                                      className="h-8 w-full rounded cursor-pointer border border-stone-200"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[8px] uppercase font-bold tracking-widest text-stone-400 mb-1">Overlay Density</label>
                                    <input 
                                      type="range" 
                                      min="0" 
                                      max="1" 
                                      step="0.1" 
                                      value={bg.overlayOpacity !== undefined ? bg.overlayOpacity : 0.4}
                                      onChange={(e) => updateSectionBg(sec.id, { overlayOpacity: parseFloat(e.target.value) })}
                                      className="h-8 w-full cursor-pointer"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB C: AUDIO MUSIC LIBRARY & CINEMATIC VIDEO EMBEDS */}
            {activeTab === 'media' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black text-stone-950 mb-1">Universal Music &amp; Video</h3>
                  <p className="text-xs text-stone-500">Pick premium orchestral accompaniments, upload custom MP3 recordings, and embed YouTube event teasers.</p>
                </div>

                <div className="space-y-4">
                  {/* Music system */}
                  <div>
                    <h4 className="text-xs font-black uppercase text-stone-800 mb-3">MP3 Autoplay Music Playlist</h4>
                    
                    {/* Live player drawer */}
                    {defaultTrack && (
                      <div className="p-4 rounded-xl border bg-emerald-50 text-emerald-800 border-emerald-100 flex items-center justify-between mb-4">
                        <div className="text-left">
                          <span className="text-[8px] uppercase tracking-wider block font-bold text-emerald-600">Active Live Track</span>
                          <span className="text-xs font-black">{defaultTrack.title}</span>
                        </div>
                        <button 
                          onClick={toggleAudio}
                          className="h-10 w-10 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white rounded-full focus:outline-none transition-all shadow-md"
                        >
                          {audioPlaying ? <Pause className="h-4.5 w-4.5 text-white" /> : <Play className="h-4.5 w-4.5 text-white fill-white ml-0.5" />}
                        </button>
                      </div>
                    )}

                    {/* Choose active track list */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400">Track Selector</label>
                      {invite.music.tracks.map((tr) => (
                        <button
                          key={tr.id}
                          onClick={() => {
                            const newM = { ...invite.music, defaultTrackId: tr.id };
                            setInvite({ ...invite, music: newM });
                            saveInvitation({ ...invite, music: newM });
                          }}
                          className={`w-full p-3 border rounded-xl flex items-center justify-between text-left transition-all ${
                            invite.music.defaultTrackId === tr.id 
                              ? 'border-stone-900 bg-stone-50' 
                              : 'border-stone-150 hover:bg-stone-50'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold text-stone-900">{tr.title}</p>
                            <span className="text-[9px] text-stone-400 italic">{tr.builtIn ? '⚡ Preloaded Studio track' : '📂 Personalized upload'}</span>
                          </div>
                          {invite.music.defaultTrackId === tr.id && <Check className="h-4 w-4 text-stone-950" />}
                        </button>
                      ))}
                    </div>

                    <div className="h-[1px] bg-stone-100 my-4"></div>

                    {/* Upload MP3 box */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Upload Custom MP3 File</label>
                      <div className="p-4 border-2 border-dashed border-stone-200 rounded-xl bg-stone-50/50 flex flex-col items-center justify-center">
                        <input 
                          type="file" 
                          accept="audio/mp3" 
                          onChange={(e) => handleFileUpload(e, 'music')} 
                          className="hidden" 
                          id="music-uploader-input-f" 
                        />
                        <label htmlFor="music-uploader-input-f" className="cursor-pointer px-4 py-2 bg-stone-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-stone-850">
                          {uploading ? 'Processing Track...' : 'Select MP3 File'}
                        </label>
                        <p className="text-[9px] text-gray-400 mt-2">Compatible with offline compiled ZIP bundles</p>
                      </div>
                    </div>
                  </div>

                  <div className="h-[1px] bg-stone-100 my-4"></div>

                  {/* Video embed */}
                  <div>
                    <h4 className="text-xs font-black uppercase text-stone-800 mb-3">Cinema / YouTube Trailer Embed</h4>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">YouTube Link Parameter</label>
                      <input 
                        type="text" 
                        value={invite.content.youtubeUrl || ''}
                        onChange={(e) => updateContentField('youtubeUrl', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-stone-150 text-xs text-stone-850"
                        placeholder="https://www.youtube.com/watch?v=xxxxxxxx"
                      />
                      <p className="text-[9px] text-stone-400 mt-1 font-sans">Enter copyable browser links; system automatically adapts preview embeds.</p>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB D: MASONRY/SLIDER GALLERY CHANNELS */}
            {activeTab === 'gallery' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black text-stone-950 mb-1">Memories &amp; Photos Album</h3>
                  <p className="text-xs text-stone-500">Create gorgeous grid stories, add high contrast memories, and drag upload unlimited files.</p>
                </div>

                <div className="space-y-4">
                  {/* Upload photo boxes */}
                  <div className="p-4 border-2 border-dashed border-stone-200 rounded-xl bg-stone-50/50 flex flex-col items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-stone-400 mb-2" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple
                      onChange={(e) => handleFileUpload(e, 'photo')} 
                      className="hidden" 
                      id="photo-uploader-input-f" 
                    />
                    <label htmlFor="photo-uploader-input-f" className="cursor-pointer px-4 py-2 bg-stone-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-stone-850">
                      {uploading ? 'Processing Image...' : 'Select Photos'}
                    </label>
                  </div>

                  {/* Album list items with CRUD editing */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400">Current Album Listing ({galleryItems.length})</label>
                    
                    {galleryItems.length === 0 ? (
                      <p className="text-xs italic text-stone-400">Album is currently empty. Upload photos above to seed the grid!</p>
                    ) : (
                      <div className="space-y-3">
                        {galleryItems.map((item, idx) => (
                          <div key={item.id} className="p-3 bg-stone-50 border rounded-xl flex items-center gap-3">
                            <img src={item.url} alt={item.caption} className="h-10 w-10 object-cover rounded-lg border" referrerPolicy="no-referrer" />
                            
                            <div className="flex-1 text-left">
                              <input 
                                type="text" 
                                value={item.caption}
                                onChange={(e) => {
                                  if (!invite) return;
                                  const updatedItems = [...galleryItems];
                                  updatedItems[idx].caption = e.target.value;
                                  const cloned = { ...invite };
                                  cloned.gallery.albums[0].items = updatedItems;
                                  setInvite(cloned);
                                  saveInvitation(cloned);
                                }}
                                className="font-bold text-stone-950 border-b border-transparent focus:border-stone-900 bg-transparent focus:outline-none text-xs w-full"
                                placeholder="Caption memory..."
                              />
                            </div>

                            <button 
                              onClick={() => {
                                if (!invite) return;
                                const updatedItems = galleryItems.filter(i => i.id !== item.id);
                                const cloned = { ...invite };
                                cloned.gallery.albums[0].items = updatedItems;
                                setInvite(cloned);
                                saveInvitation(cloned);
                              }}
                              className="p-1 hover:bg-stone-200 text-stone-400 hover:text-red-650 rounded-lg focus:outline-none"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB E: EVENTS SCHEDULE MAPS VENUES */}
            {activeTab === 'schedule' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black text-stone-950 mb-1">Event Timetable &amp; Schedule</h3>
                  <p className="text-xs text-stone-500">Coordinate multi-event locations, map coordinates, day flow pacing, and target bento countdown clocks.</p>
                </div>

                <div className="space-y-6">
                  {/* Multi-Schedule Details creator */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-black uppercase text-stone-800">Card Locations Schedules</h4>
                      <button 
                        onClick={addScheduleCard}
                        className="text-xs font-bold text-stone-950 flex items-center gap-0.5"
                      >
                        <Plus className="h-3.5 w-3.5" /> New Card
                      </button>
                    </div>

                    <div className="space-y-4">
                      {(invite.content.schedule || []).map((item, idx) => (
                        <div key={item.id} className="p-4 rounded-xl border bg-stone-50 relative space-y-2">
                          <button 
                            onClick={() => removeScheduleCard(item.id)}
                            className="absolute top-2 right-2 p-1 text-stone-400 hover:text-red-600 focus:outline-none hover:bg-stone-100 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                          <div className="w-5/6">
                            <label className="text-[8px] uppercase font-bold text-stone-400">Card Heading Tag</label>
                            <input 
                              type="text" 
                              value={item.title}
                              onChange={(e) => {
                                const list = [...invite.content.schedule];
                                list[idx].title = e.target.value;
                                updateContentField('schedule', list);
                              }}
                              className="w-full bg-transparent border-b border-stone-200 focus:border-stone-900 font-bold text-stone-900 text-xs focus:outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[8px] uppercase font-bold text-stone-400">Hours Span</label>
                              <input 
                                type="text" 
                                value={item.time}
                                onChange={(e) => {
                                  const list = [...invite.content.schedule];
                                  list[idx].time = e.target.value;
                                  updateContentField('schedule', list);
                                }}
                                className="w-full bg-white border border-stone-100 rounded p-1.5 text-[10px]"
                                placeholder="3:00 - 4:00 PM"
                              />
                            </div>
                            <div>
                              <label className="text-[8px] uppercase font-bold text-stone-400">Venue Hall Name</label>
                              <input 
                                type="text" 
                                value={item.venue}
                                onChange={(e) => {
                                  const list = [...invite.content.schedule];
                                  list[idx].venue = e.target.value;
                                  updateContentField('schedule', list);
                                }}
                                className="w-full bg-white border border-stone-100 rounded p-1.5 text-[10px]"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[8px] uppercase font-bold text-stone-400">Actual Address</label>
                            <input 
                              type="text" 
                              value={item.address}
                              onChange={(e) => {
                                const list = [...invite.content.schedule];
                                list[idx].address = e.target.value;
                                updateContentField('schedule', list);
                              }}
                              className="w-full bg-white border border-stone-100 rounded p-1.5 text-[10px]"
                            />
                          </div>

                          <div>
                            <label className="text-[8px] uppercase font-bold text-stone-400">Google Maps Navigation iFrame / URL Link</label>
                            <input 
                              type="text" 
                              value={item.mapsUrl}
                              onChange={(e) => {
                                const list = [...invite.content.schedule];
                                list[idx].mapsUrl = e.target.value;
                                updateContentField('schedule', list);
                              }}
                              className="w-full bg-white border border-stone-100 rounded p-1.5 text-[10px] text-stone-500"
                              placeholder="https://maps.google.com/..."
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="h-[1px] bg-stone-100 my-4"></div>

                  {/* Day pacing timeline builder */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-black uppercase text-stone-800">Timeline Pacing Flow</h4>
                      <button 
                        onClick={addTimelineCard}
                        className="text-xs font-bold text-stone-950 flex items-center gap-0.5"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Timeline Point
                      </button>
                    </div>

                    <div className="space-y-4">
                      {(invite.content.timeline || []).map((pt, idx) => (
                        <div key={pt.id} className="p-3 bg-stone-50 rounded-xl relative space-y-1 text-left">
                          <button 
                            onClick={() => removeTimelineCard(pt.id)}
                            className="absolute top-1 right-1 text-stone-400 hover:text-red-500"
                          >
                            &times;
                          </button>
                          
                          <input 
                            type="text" 
                            value={pt.time}
                            onChange={(e) => {
                              const list = [...invite.content.timeline];
                              list[idx].time = e.target.value;
                              updateContentField('timeline', list);
                            }}
                            className="font-bold border-b border-transparent focus:border-stone-900 bg-transparent text-xs w-4/5 focus:outline-none text-stone-800 uppercase"
                            placeholder="6:00 PM"
                          />
                          <input 
                            type="text" 
                            value={pt.title}
                            onChange={(e) => {
                              const list = [...invite.content.timeline];
                              list[idx].title = e.target.value;
                              updateContentField('timeline', list);
                            }}
                            className="block font-black text-xs text-stone-900 w-full focus:outline-none bg-transparent border-b border-transparent focus:border-stone-100"
                            placeholder="Grand Arrivals"
                          />
                          <input 
                            type="text" 
                            value={pt.description}
                            onChange={(e) => {
                              const list = [...invite.content.timeline];
                              list[idx].description = e.target.value;
                              updateContentField('timeline', list);
                            }}
                            className="block text-[11px] text-stone-500 w-full focus:outline-none bg-transparent border-b border-transparent focus:border-stone-100"
                            placeholder="Welcome drinks Served"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="h-[1px] bg-stone-100 my-4"></div>

                  {/* Countdown configurations TargetDate */}
                  <div>
                    <h4 className="text-xs font-black uppercase text-stone-800 mb-3">Bento Countdown Clocks</h4>
                    
                    <div className="flex items-center justify-between mb-3 bg-stone-50 p-3 rounded-xl border border-stone-100">
                      <div>
                        <span className="block text-xs font-bold text-stone-900">Show Countdown Clock</span>
                        <span className="block text-[9px] text-stone-400">Display Live days/hours guest countdown</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          const newCd = { ...invite.countdown, enabled: !invite.countdown.enabled };
                          setInvite({ ...invite, countdown: newCd });
                          saveInvitation({ ...invite, countdown: newCd });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                          invite.countdown.enabled 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {invite.countdown.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Target Date &amp; Hours</label>
                        <input 
                          type="datetime-local" 
                          value={invite.countdown.targetDate.substring(0, 16)} 
                          onChange={(e) => {
                            const newCd = { ...invite.countdown, targetDate: new Date(e.target.value).toISOString() };
                            setInvite({ ...invite, countdown: newCd });
                            saveInvitation({ ...invite, countdown: newCd });
                          }}
                          className="w-full px-4 py-3 border border-stone-100 bg-gray-50 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Display Styles</label>
                        <select
                          value={invite.countdown.style}
                          onChange={(e) => {
                            const newCd = { ...invite.countdown, style: e.target.value as any };
                            setInvite({ ...invite, countdown: newCd });
                            saveInvitation({ ...invite, countdown: newCd });
                          }}
                          className="w-full px-3 py-3 border border-stone-100 bg-gray-50 rounded-xl text-xs"
                        >
                          <option value="classic">Classic Minimal</option>
                          <option value="digital">Digital Clock</option>
                        </select>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB F: PUBLISHING SLUGS & Standalone OFFLINE DOWNAOLDS */}
            {activeTab === 'publish' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black text-stone-950 mb-1">Publish &amp; Independent Exports</h3>
                  <p className="text-xs text-stone-500">Acquire unique dynamic hosting slugs or download 100% self-contained zip websites package offline.</p>
                </div>

                <div className="space-y-6">
                  {/* Slug adjuster */}
                  <div className="p-5 border border-stone-150 bg-stone-50 rounded-2xl relative space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-stone-800">Dynamic Live URL Link</h4>
                    
                    <div className="flex gap-2">
                      <span className="inline-flex items-center px-3 rounded-xl border border-r-0 border-stone-200 bg-stone-100 text-stone-500 font-mono text-[10px]">
                        /invite/
                      </span>
                      <input 
                        type="text" 
                        value={previewSlug}
                        onChange={(e) => { setPreviewSlug(e.target.value); setSlugStatus('idle'); }}
                        className="w-full px-4 py-2 border border-stone-200 bg-white rounded-xl text-xs text-stone-900 font-bold focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] text-stone-500">
                        {slugStatus === 'idle' && 'Check link availability...'}
                        {slugStatus === 'free' && '✅ Slug is valid & locked!'}
                        {slugStatus === 'taken' && '❌ Slug collision! Pick another.'}
                      </p>
                      
                      <button 
                        onClick={handleCheckSlug}
                        className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest"
                      >
                        Lock Slug
                      </button>
                    </div>
                  </div>

                  <div className="h-[1px] bg-stone-100 my-4"></div>

                  {/* Publish Status Toggle */}
                  <div className="flex items-center justify-between p-4 border border-stone-100 rounded-xl">
                    <div className="text-left">
                      <h4 className="text-xs font-black text-stone-950">Publish Active Status</h4>
                      <p className="text-[10px] text-stone-500 mt-0.5">Toggle live guest links visibility anytime.</p>
                    </div>

                    <button
                      onClick={handlePublishToggle}
                      className={`h-9 items-center justify-center rounded-xl px-6 text-xs font-bold uppercase tracking-wider transition-all text-white ${
                        invite.published 
                          ? 'bg-emerald-500 hover:bg-emerald-600' 
                          : 'bg-stone-500 hover:bg-stone-600'
                      }`}
                    >
                      {invite.published ? 'Published (Live)' : 'Draft (Offline)'}
                    </button>
                  </div>

                  {invite.published && (
                    <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-800 flex items-center justify-between text-left gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-bold uppercase block text-indigo-500">Live Website URL</span>
                        <a 
                          href={`/invite/${invite.slug}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs font-black hover:underline truncate block"
                        >
                          {window.location.origin}/invite/{invite.slug}
                        </a>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const fullUrl = `${window.location.origin}/invite/${invite.slug}`;
                            navigator.clipboard.writeText(fullUrl);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                        >
                          {copied ? 'Copied! ✓' : 'Copy Link'}
                        </button>
                        <a 
                          href={`/invite/${invite.slug}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-all"
                          title="Open Live Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="h-[1px] bg-stone-100 my-4"></div>

                  {/* Independent Multi-format export options */}
                  <div className="p-6 border border-stone-200 bg-white shadow-sm rounded-3xl text-center space-y-6">
                    <div className="flex justify-center gap-4">
                      <FileText className="h-8 w-8 text-rose-500" />
                      <Code className="h-8 w-8 text-emerald-500" />
                      <Archive className="h-8 w-8 text-blue-500" />
                    </div>
                    <div className="text-center">
                      <h4 className="text-sm font-black text-stone-950">Download Invitation Options</h4>
                      <p className="text-xs text-stone-300 mt-1 leading-relaxed font-sans text-stone-500">
                        Export your premium digital invitation layout in any of the three formats below.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {/* Option 1: PDF */}
                      <button 
                        type="button"
                        onClick={() => downloadInvitationPDF(invite)}
                        className="flex items-center justify-between w-full px-4 py-3 border border-stone-150 hover:bg-stone-50 rounded-xl transition-all"
                      >
                        <div className="flex items-center gap-2.5 text-left">
                          <FileText className="h-5 w-5 text-rose-500" />
                          <div>
                            <span className="block text-xs font-bold text-stone-900">Standard Readable PDF</span>
                            <span className="block text-[10px] text-stone-400">Perfect for physical print &amp; records</span>
                          </div>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-stone-400 font-mono">Download &darr;</span>
                      </button>

                      {/* Option 2: HTML */}
                      <button 
                        type="button"
                        onClick={() => window.location.href = `/api/invitations/${invite.id}/html`}
                        className="flex items-center justify-between w-full px-4 py-3 border border-stone-150 hover:bg-stone-50 rounded-xl transition-all"
                      >
                        <div className="flex items-center gap-2.5 text-left">
                          <Code className="h-5 w-5 text-emerald-500" />
                          <div>
                            <span className="block text-xs font-bold text-stone-900">Portable Single HTML</span>
                            <span className="block text-[10px] text-stone-400">Opens directly in any browser offline</span>
                          </div>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-stone-400 font-mono">Download &darr;</span>
                      </button>

                      {/* Option 3: ZIP */}
                      <button 
                        type="button"
                        onClick={handleZIPExport}
                        className="flex items-center justify-between w-full px-4 py-3 border border-stone-150 hover:bg-stone-50 rounded-xl transition-all"
                      >
                        <div className="flex items-center gap-2.5 text-left">
                          <Archive className="h-5 w-5 text-blue-500" />
                          <div>
                            <span className="block text-xs font-bold text-stone-900">Standalone Asset ZIP Bundle</span>
                            <span className="block text-[10px] text-stone-400">Includes background videos &amp; music</span>
                          </div>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-stone-400 font-mono">Download &darr;</span>
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>
        </div>

        {/* PANEL B: MIDDLE/RIGHT SIMULATED LIVE PREVIEW HARDWARE INTERFACE */}
        <div className="xl:col-span-7 bg-stone-100 flex flex-col items-center justify-center p-6 relative select-none">
          
          {/* Viewport resizing toggles */}
          <div className="absolute top-4 z-20 flex gap-2 bg-white/95 shadow-md border px-1.5 py-1.5 rounded-full backdrop-blur-md">
            <button 
              onClick={() => setDeviceMode('desktop')}
              className={`p-2.5 rounded-full transition-colors ${deviceMode === 'desktop' ? 'bg-stone-950 text-white shadow-sm' : 'text-stone-400 hover:text-stone-900'}`}
              title="Desktop View"
            >
              <Monitor className="h-4.5 w-4.5" />
            </button>
            <button 
              onClick={() => setDeviceMode('tablet')}
              className={`p-2.5 rounded-full transition-colors ${deviceMode === 'tablet' ? 'bg-stone-950 text-white shadow-sm' : 'text-stone-400 hover:text-stone-900'}`}
              title="Tablet View"
            >
              <Tablet className="h-4.5 w-4.5" />
            </button>
            <button 
              onClick={() => setDeviceMode('mobile')}
              className={`p-2.5 rounded-full transition-colors ${deviceMode === 'mobile' ? 'bg-stone-950 text-white shadow-sm' : 'text-stone-400 hover:text-stone-900'}`}
              title="Mobile View"
            >
              <Phone className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Virtual Simulated Bezel Device Framing */}
          <div className={`transition-all duration-300 w-full relative h-[calc(100vh-14rem)] bg-white shadow-2xl overflow-hidden border border-stone-300 ${
            deviceMode === 'desktop' 
              ? 'max-w-full rounded-2xl' 
              : deviceMode === 'tablet' 
              ? 'max-w-2xl rounded-3xl p-2' 
              : 'max-w-xs md:max-w-sm rounded-[3rem] p-3'
          }`}>
            {/* Top sensor notch if mobile or tablet view */}
            {deviceMode !== 'desktop' && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-5 bg-stone-950 rounded-full z-30 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-stone-850"></div>
              </div>
            )}

            {/* Live Reactive Renderer Container */}
            <div className={`w-full h-full overflow-y-auto scrollbar-none rounded-[2rem] relative bg-stone-50 text-stone-800 ${
              deviceMode === 'desktop' ? 'rounded-2xl' : ''
            }`} style={{ background: invite.content.backgroundType === 'color' ? invite.theme.colors.background : undefined }}>
              
              {invite.content.backgroundType === 'video' && invite.content.backgroundValue && (
                <video 
                  key={invite.content.backgroundValue} 
                  src={invite.content.backgroundValue}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0" 
                  autoPlay 
                  loop 
                  muted 
                  playsInline 
                />
              )}
              {invite.content.backgroundType === 'video' && <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[1]"></div>}

              {/* FLOATING MUSIC PREVIEW DRAWER */}
              {defaultTrack && (
                <div className="absolute bottom-6 right-6 z-40 bg-white/95 backdrop-blur shadow-2xl rounded-full p-2 border border-gray-100 flex items-center gap-2">
                  <button 
                    onClick={toggleAudio}
                    className="h-10 w-10 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white rounded-full focus:outline-none transition-all shadow-md"
                  >
                    {audioPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white ml-0.5" />}
                  </button>
                  <div className="text-left pr-4 hidden sm:block">
                    <p className="text-[9px] uppercase tracking-wider text-stone-400 font-bold">Now Playing</p>
                    <p className="text-xs font-bold truncate max-w-[120px] text-stone-850">{defaultTrack.title}</p>
                  </div>
                </div>
              )}

              {/* RENDERED INVITATION CONTENT WIRE */}
              <div className="relative z-10 p-6 md:p-12 text-center max-w-2xl mx-auto space-y-12 min-h-full flex flex-col justify-center">
                
                {/* Visual Invitation Sheet */}
                <div 
                  className="rounded-3xl p-6 md:p-10 shadow-xl border text-center flex flex-col transition-all duration-300"
                  style={{ 
                    backgroundColor: invite.theme.colors.background === '#0F172A' ? '#1E293B' : '#FFFFFF',
                    borderColor: invite.theme.colors.border || 'rgba(0,0,0,0.08)',
                    color: invite.theme.colors.text || '#1f2937'
                  }}
                >
                  
                  {/* HERO */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="flex flex-col items-center p-6 md:p-8 rounded-2xl overflow-hidden relative"
                    style={getSectionStyle('hero')}
                  >
                    {getSectionOverlay('hero')}
                    <div className="relative z-10 w-full flex flex-col items-center">
                      <span 
                        className="text-[10px] font-bold tracking-widest uppercase px-3 py-1 mb-4 rounded-full"
                        style={{ 
                          backgroundColor: invite.theme.colors.primary + '15',
                          color: invite.theme.colors.primary 
                        }}
                      >
                        Cordially Invited
                      </span>
                      <h1 
                        className="text-3xl md:text-5xl font-black mb-3 leading-tight tracking-tight text-center" 
                        style={{ 
                          fontFamily: `'${invite.theme.fonts.heading}', sans-serif`, 
                          color: invite.theme.colors.primary 
                        }}
                      >
                        {invite.content.eventTitle}
                      </h1>
                      <p className="text-xs md:text-sm italic max-w-md mx-auto opacity-80 leading-relaxed font-serif text-center">
                        {invite.content.eventDescription}
                      </p>
                      <hr className="w-16 h-[2px] my-6 opacity-30 mx-auto" style={{ backgroundColor: invite.theme.colors.primary }} />
                      <p className="text-xs md:text-sm font-bold uppercase tracking-widest opacity-90 text-center">
                        {invite.content.dateText}
                      </p>
                    </div>
                  </motion.div>
 
                  {/* ABOUT / STORY SECTION */}
                  {invite.content.storyContent && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.1 }}
                      className="mt-12 border-t pt-8 p-6 md:p-8 rounded-2xl overflow-hidden relative"
                      style={{ borderColor: invite.theme.colors.border || 'rgba(0,0,0,0.06)', ...getSectionStyle('story') }}
                    >
                      {getSectionOverlay('story')}
                      <div className="relative z-10 w-full">
                        <h3 
                          className="text-lg md:text-xl font-bold mb-3 text-center" 
                          style={{ 
                            fontFamily: `'${invite.theme.fonts.heading}', sans-serif`, 
                            color: invite.theme.colors.primary 
                          }}
                        >
                          {invite.content.storyHeading || 'Our Story'}
                        </h3>
                        <p className="text-xs leading-relaxed max-w-lg mx-auto opacity-80 text-center" style={{ fontFamily: `'${invite.theme.fonts.body}', sans-serif` }}>
                          {invite.content.storyContent}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* REAL-TIME ACTIVATED COUNTDOWN CLOCK */}
                  {invite.countdown.enabled && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8 }}
                      className="mt-12 border-t pt-8 text-center p-6 md:p-8 rounded-2xl overflow-hidden relative"
                      style={{ borderColor: invite.theme.colors.border || 'rgba(0,0,0,0.06)', ...getSectionStyle('countdown') }}
                    >
                      {getSectionOverlay('countdown')}
                      <div className="relative z-10 w-full text-center">
                        <h3 
                          className="text-lg font-bold mb-6" 
                          style={{ 
                            fontFamily: `'${invite.theme.fonts.heading}', sans-serif`, 
                            color: invite.theme.colors.primary 
                          }}
                        >
                          Counting Down to the Big Day
                        </h3>
                        
                        <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto">
                          <div className="bg-stone-50/70 p-3 rounded-2xl border flex flex-col justify-center items-center shadow-sm" style={{ borderColor: invite.theme.colors.border || 'rgba(0,0,0,0.04)' }}>
                            <span className="text-l md:text-2xl font-black block" style={{ color: invite.theme.colors.primary }}>
                              {String(timeLeft.days).padStart(2, '0')}
                            </span>
                            <span className="text-[8px] text-stone-400 uppercase font-bold tracking-wider">Days</span>
                          </div>
                          <div className="bg-stone-50/70 p-3 rounded-2xl border flex flex-col justify-center items-center shadow-sm" style={{ borderColor: invite.theme.colors.border || 'rgba(0,0,0,0.04)' }}>
                            <span className="text-l md:text-2xl font-black block" style={{ color: invite.theme.colors.primary }}>
                              {String(timeLeft.hours).padStart(2, '0')}
                            </span>
                            <span className="text-[8px] text-stone-400 uppercase font-bold tracking-wider">Hours</span>
                          </div>
                          <div className="bg-stone-50/70 p-3 rounded-2xl border flex flex-col justify-center items-center shadow-sm" style={{ borderColor: invite.theme.colors.border || 'rgba(0,0,0,0.04)' }}>
                            <span className="text-l md:text-2xl font-black block" style={{ color: invite.theme.colors.primary }}>
                              {String(timeLeft.minutes).padStart(2, '0')}
                            </span>
                            <span className="text-[8px] text-stone-400 uppercase font-bold tracking-wider">Mins</span>
                          </div>
                          <div className="bg-stone-50/70 p-3 rounded-2xl border flex flex-col justify-center items-center shadow-sm" style={{ borderColor: invite.theme.colors.border || 'rgba(0,0,0,0.04)' }}>
                            <span className="text-l md:text-2xl font-black block" style={{ color: invite.theme.colors.primary }}>
                              {String(timeLeft.seconds).padStart(2, '0')}
                            </span>
                            <span className="text-[8px] text-stone-400 uppercase font-bold tracking-wider">Secs</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* SCHEDULE & DIRECTIONS */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="mt-12 border-t pt-8 p-6 md:p-8 rounded-2xl overflow-hidden relative"
                    style={{ borderColor: invite.theme.colors.border || 'rgba(0,0,0,0.06)', ...getSectionStyle('schedule') }}
                  >
                    {getSectionOverlay('schedule')}
                    <div className="relative z-10 w-full">
                      <h3 
                        className="text-lg font-bold mb-6 text-center" 
                        style={{ 
                          fontFamily: `'${invite.theme.fonts.heading}', sans-serif`, 
                          color: invite.theme.colors.primary 
                        }}
                      >
                        Event Details &amp; Venue
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {invite.content.schedule.map(sc => (
                          <div 
                            key={sc.id} 
                            className="p-4 bg-stone-50/50 border text-center rounded-2xl flex flex-col items-center justify-between"
                            style={{ borderColor: invite.theme.colors.border || 'rgba(0,0,0,0.04)' }}
                          >
                            <div className="flex flex-col items-center">
                              <MapPin className="h-5 w-5 opacity-60 mb-2" style={{ color: invite.theme.colors.primary }} />
                              <h4 className="text-xs font-black">{sc.title}</h4>
                              <p className="text-[10px] opacity-70 mt-1 font-sans">{sc.time} | {sc.date}</p>
                              <p className="text-[10px] font-bold mt-1 max-w-[160px]">{sc.venue}</p>
                              {sc.address && <p className="text-[9px] opacity-60 mt-0.5 italic max-w-[150px]">{sc.address}</p>}
                            </div>
                            {sc.mapsUrl && (
                              <a 
                                href={formatMapsUrl(sc.mapsUrl)} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-full text-[9px] font-bold text-white shadow-sm hover:opacity-90 hover:scale-105 transition-all uppercase tracking-wider font-sans"
                                style={{ backgroundColor: invite.theme.colors.primary }}
                              >
                                Get Directions &rarr;
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  {/* TIMELINE */}
                  {invite.content.timeline && invite.content.timeline.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8 }}
                      className="mt-12 border-t pt-8 text-left max-w-sm mx-auto w-full p-6 md:p-8 rounded-2xl overflow-hidden relative"
                      style={{ borderColor: invite.theme.colors.border || 'rgba(0,0,0,0.06)', ...getSectionStyle('timeline') }}
                    >
                      {getSectionOverlay('timeline')}
                      <div className="relative z-10 w-full">
                        <h3 
                          className="text-lg font-bold text-center mb-6" 
                          style={{ 
                            fontFamily: `'${invite.theme.fonts.heading}', sans-serif`, 
                            color: invite.theme.colors.primary 
                          }}
                        >
                          Key Celebrations Timeline
                        </h3>
                        <div className="space-y-4">
                          {invite.content.timeline.map((tl, idx) => (
                            <div key={tl.id} className="relative pl-6 border-l py-1" style={{ borderColor: invite.theme.colors.primary + '30' }}>
                              <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full -translate-x-[4.6px]" style={{ backgroundColor: invite.theme.colors.primary }}></span>
                              <span className="text-[10px] font-bold block" style={{ color: invite.theme.colors.primary }}>{tl.time}</span>
                              <h4 className="text-xs font-black mt-0.5">{tl.title}</h4>
                              <p className="text-[10px] opacity-70 leading-relaxed mt-0.5">{tl.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* PHOTO ALBUM PREMIUM SLIDESHOW */}
                  {galleryItems.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8 }}
                      className="mt-12 border-t pt-8 p-6 md:p-8 rounded-2xl overflow-hidden relative"
                      style={{ borderColor: invite.theme.colors.border || 'rgba(0,0,0,0.06)', ...getSectionStyle('gallery') }}
                    >
                      {getSectionOverlay('gallery')}
                      <div className="relative z-10 w-full">
                        <h3 
                          className="text-lg font-bold mb-6 text-center" 
                          style={{ 
                            fontFamily: `'${invite.theme.fonts.heading}', sans-serif`, 
                            color: invite.theme.colors.primary 
                          }}
                        >
                          Our Memories &amp; Photos
                        </h3>
                      
                      {/* Premium Slider Container */}
                      <div className="relative aspect-[4/3] w-full bg-stone-100 rounded-2xl overflow-hidden shadow-lg group border border-stone-150">
                        <AnimatePresence mode="wait">
                          <motion.div 
                            key={activeSlideIdx}
                            initial={{ opacity: 0, scale: 1.02 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.6, ease: "easeInOut" }}
                            className="absolute inset-0 w-full h-full"
                          >
                            <img 
                              src={galleryItems[activeSlideIdx]?.url} 
                              alt={galleryItems[activeSlideIdx]?.caption} 
                              className="w-full h-full object-cover select-none" 
                              referrerPolicy="no-referrer" 
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent p-4 text-center">
                              <p className="text-xs text-white font-serif italic">{galleryItems[activeSlideIdx]?.caption || 'Our Precious Memory'}</p>
                            </div>
                          </motion.div>
                        </AnimatePresence>

                        {/* Chevron controls */}
                        {galleryItems.length > 1 && (
                          <>
                            <button 
                              type="button"
                              onClick={() => {
                                setActiveSlideIdx(prev => (prev - 1 + galleryItems.length) % galleryItems.length);
                                setSlideshowPlaying(false);
                              }}
                              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full h-8 w-8 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20 text-xs font-bold"
                            >
                              &larr;
                            </button>
                            <button 
                              type="button"
                              onClick={() => {
                                setActiveSlideIdx(prev => (prev + 1) % galleryItems.length);
                                setSlideshowPlaying(false);
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full h-8 w-8 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20 text-xs font-bold"
                            >
                              &rarr;
                            </button>

                            {/* Autoplay play pause tag */}
                            <button 
                              type="button"
                              onClick={() => setSlideshowPlaying(!slideshowPlaying)}
                              className="absolute top-3 right-3 bg-black/60 text-white text-[8px] uppercase tracking-wider font-bold py-1 px-2.5 rounded-full backdrop-blur-sm hover:bg-black/80 transition-all font-sans z-20"
                            >
                              {slideshowPlaying ? '⏸ Pause Slides' : '▶ Auto Play'}
                            </button>

                            {/* Dot Indicators */}
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
                              {galleryItems.map((_, idx) => (
                                <button 
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setActiveSlideIdx(idx);
                                    setSlideshowPlaying(false);
                                  }}
                                  className={`h-1 rounded-full transition-all duration-300 ${activeSlideIdx === idx ? 'w-4 bg-white shadow' : 'w-1 bg-white/50'}`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      </div>
                    </motion.div>
                  )}

                  {/* VIDEO EMBED PREVIEW */}
                  {invite.content.youtubeUrl && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8 }}
                      className="mt-12 border-t pt-8 p-6 md:p-8 rounded-2xl overflow-hidden relative"
                      style={{ borderColor: invite.theme.colors.border || 'rgba(0,0,0,0.06)', ...getSectionStyle('video') }}
                    >
                      {getSectionOverlay('video')}
                      <div className="relative z-10 w-full">
                        <h3 
                          className="text-lg font-bold mb-4 text-center" 
                          style={{ 
                            fontFamily: `'${invite.theme.fonts.heading}', sans-serif`, 
                            color: invite.theme.colors.primary 
                          }}
                        >
                          Video Trailer
                        </h3>
                        <div className="aspect-video w-full rounded-xl overflow-hidden bg-stone-100 shadow-sm border border-stone-200">
                          <iframe 
                            className="w-full h-full"
                            src={invite.content.youtubeUrl.includes('watch?v=') ? invite.content.youtubeUrl.replace('watch?v=', 'embed/') : invite.content.youtubeUrl} 
                            title="Custom Youtube Trailer Embed"
                            frameBorder={0}
                          ></iframe>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* PREFABULATED PLACEHOLDER RSVP FORM */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="mt-12 border-t pt-8 text-center bg-stone-50/50 p-4 md:p-6 rounded-2xl overflow-hidden relative"
                    style={{ borderColor: invite.theme.colors.border || 'rgba(0,0,0,0.06)', ...getSectionStyle('rsvp') }}
                  >
                    {getSectionOverlay('rsvp')}
                    <div className="relative z-10 w-full text-center">
                      <h3 
                        className="text-base font-black mb-1 leading-tight text-center" 
                        style={{ 
                          fontFamily: `'${invite.theme.fonts.heading}', sans-serif`, 
                          color: invite.theme.colors.primary 
                        }}
                      >
                        Please Let Us Know If You Will Be Attending
                      </h3>
                      <p className="text-[10px] opacity-70 max-w-xs mx-auto leading-relaxed text-center">
                        We would be delighted to celebrate with you. Kindly confirm your attendance below.
                      </p>

                      <div className="mt-6 space-y-3 max-w-xs mx-auto text-left">
                        <div>
                          <label className="text-[8px] uppercase font-bold tracking-widest text-stone-400">Full Name</label>
                          <input type="text" disabled placeholder="Enter your full name" className="w-full text-xs px-3 py-2.5 rounded-xl border bg-white border-stone-200 cursor-not-allowed opacity-70" />
                        </div>
                        <div>
                          <label className="text-[8px] uppercase font-bold tracking-widest text-stone-400">Email Address</label>
                          <input type="text" disabled placeholder="you@example.com" className="w-full text-xs px-3 py-2.5 rounded-xl border bg-white border-stone-200 cursor-not-allowed opacity-70" />
                        </div>
                        <button 
                          type="button" 
                          disabled 
                          className="w-full text-xs py-3.5 text-center text-white font-extrabold uppercase tracking-widest rounded-xl shadow cursor-not-allowed opacity-80" 
                          style={{ backgroundColor: invite.theme.colors.primary }}
                        >
                          Confirm Attendance (Disabled in Editor)
                        </button>
                      </div>
                    </div>
                  </motion.div>

                </div>

                <p className="text-[9px] uppercase tracking-wider text-stone-400 font-bold block">
                  &copy; Generated Private Canvas Preview &bull; InviteFrame Studio
                </p>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
