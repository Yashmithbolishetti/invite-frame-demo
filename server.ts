/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import dns from 'dns';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import JSZip from 'jszip';
import { initDB, db } from './server/db.ts';
import { User, Invitation, RSVPData, ThemeConfig, InvitationContent, MusicTrack } from './src/types.ts';

// Initialize connection
initDB();

const app = express();
const PORT = 3000;

// Body Parsers
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Set up persistent uploads folder
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Setup Multer storage for images, videos, and music
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB file size limit for MP4 background videos
});

// A simple local session middleware
app.use((req, res, next) => {
  // Read token from headers (for sandbox environment compatibility)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const userId = authHeader.substring(7);
    const user = db.users.getById(userId);
    if (user) {
      (req as any).user = user;
    }
  }
  next();
});

function formatMapsUrlServer(url: string): string {
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

// STATIC UTILITY HELPER TO EXPORT INDEPENDENT OFFLINE HTML 
function generateStandaloneHTML(invitation: Invitation, rsvpsUrl: string): string {
  const { title, theme, countdown, content, music, gallery } = invitation;
  const isWedding = !!content.brideName || !!content.groomName || (invitation.templateId && invitation.templateId.includes('wedding'));
  const alignmentClass = theme.layout.alignment === 'center' ? 'text-center items-center justify-center' : theme.layout.alignment === 'right' ? 'text-right items-end justify-end' : 'text-left items-start justify-start';
  
  // Choose correct background CSS style
  let bodyBackgroundCSS = '';
  if (content.backgroundType === 'color') {
    bodyBackgroundCSS = `background-color: ${content.backgroundValue || '#ffffff'};`;
  } else if (content.backgroundType === 'image') {
    const val = content.backgroundValue || '';
    if (val.startsWith('http') || val.startsWith('/uploads') || val.startsWith('data:')) {
      bodyBackgroundCSS = `background-image: url('${val}'); background-size: cover; background-position: center; background-repeat: no-repeat; background-attachment: fixed;`;
    } else {
      bodyBackgroundCSS = `background: ${val};`;
    }
  } else {
    bodyBackgroundCSS = `background-color: #0d0f14;`; // Elegant slate background for video loops
  }

  // Custom font loading
  const headingFontGoogle = theme.fonts.heading.replace(/ /g, '+');
  const bodyFontGoogle = theme.fonts.body.replace(/ /g, '+');
  
  // Convert custom section to visual cards
  const customSectionsHTML = content.customSections && content.customSections.length > 0
    ? content.customSections.map(sec => `
      <div class="custom-card scroll-reveal relative p-8 rounded-2xl border bg-white/50 backdrop-blur-md shadow-sm transition-all duration-300 border-gray-100 mb-6">
        <h3 class="text-xl font-semibold mb-4 leading-normal" style="color: ${theme.colors.primary}; font-family: '${theme.fonts.heading}', sans-serif;">
          ${sec.title}
        </h3>
        <p class="text-gray-600 leading-relaxed font-normal text-sm whitespace-pre-line" style="font-family: '${theme.fonts.body}', sans-serif;">
          ${sec.content}
        </p>
      </div>`
    ).join('')
    : '';

  // Gallery albums
  const galleryItems = gallery.albums[0]?.items || [];

  // Standalone Slideshow Slider Carousel Elements
  const carouselSlidesHTML = galleryItems.map((item, idx) => `
    <div class="carousel-slide absolute inset-0 w-full h-full transition-all duration-700 ease-in-out ${idx === 0 ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-95 pointer-events-none'}" data-slide-idx="${idx}">
      <img src="${item.url}" alt="${item.caption || 'Memory'}" class="w-full h-full object-cover select-none" loading="lazy" referrerPolicy="no-referrer" />
      <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-6 text-center z-10">
        <p class="text-sm font-medium text-white italic tracking-wide font-sans">${item.caption || 'Our Precious Memory'}</p>
      </div>
    </div>`
  ).join('');

  const carouselDotsHTML = galleryItems.map((_, idx) => `
    <button class="carousel-dot h-2 rounded-full transition-all duration-300 ${idx === 0 ? 'w-5 bg-white' : 'w-2 bg-white/50'}" data-dot-idx="${idx}"></button>`
  ).join('');

  // Schedule cards with sanitized maps hyperlinks
  const scheduleHTML = (content.schedule || []).map(item => `
    <div class="scroll-reveal relative p-8 rounded-2xl bg-white/70 backdrop-blur border border-gray-100 shadow-sm text-center flex flex-col items-center">
      <div class="w-12 h-12 rounded-full flex items-center justify-center mb-4" style="background-color: ${theme.colors.primary}15; color: ${theme.colors.primary}">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-days"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
      </div>
      <h3 class="text-lg font-bold mb-2" style="font-family: '${theme.fonts.heading}', sans-serif; color: ${theme.colors.primary};">${item.title}</h3>
      <p class="text-sm font-semibold text-gray-700 leading-normal mb-1 font-sans">${item.time} | ${item.date}</p>
      <p class="text-sm font-medium text-gray-600 mb-3 font-sans">${item.venue}</p>
      <p class="text-xs text-gray-500 mb-4 px-2 font-sans">${item.address}</p>
      ${item.mapsUrl ? `<a href="${formatMapsUrlServer(item.mapsUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-xs font-semibold hover:underline" style="color: ${theme.colors.primary}">Get Directions &rarr;</a>` : ''}
    </div>`
  ).join('');

  // Timeline pacing html
  const timelineHTML = (content.timeline || []).map((item, idx) => `
    <div class="scroll-reveal relative pl-8 border-l border-gray-200 py-2">
      <div class="absolute left-0 top-[22px] w-3 h-3 -translate-x-[6.5px] rounded-full border border-white" style="background-color: ${theme.colors.primary}"></div>
      <p class="text-xs font-black tracking-widest uppercase" style="color: ${theme.colors.primary}; font-family: '${theme.fonts.body}', sans-serif;">${item.time}</p>
      <h4 class="text-base font-bold text-gray-800 tracking-tight" style="font-family: '${theme.fonts.heading}', sans-serif;">${item.title}</h4>
      <p class="text-sm text-gray-500 mt-1 font-sans">${item.description}</p>
    </div>`
  ).join('');

  // Music default track resolver
  const defaultTrack = music.tracks.find(t => t.id === music.defaultTrackId) || music.tracks[0];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <!-- Beautiful Typography Web Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&family=${headingFontGoogle}:wght@300;400;600;700;900&family=${bodyFontGoogle}:wght@300;400;600&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            heading: ["'${theme.fonts.heading}'", 'Georgia', 'serif'],
            body: ["'${theme.fonts.body}'", 'sans-serif'],
          }
        }
      }
    }
  </script>
  <style>
    body {
      font-family: '${theme.fonts.body}', sans-serif;
      overflow-x: hidden;
      ${bodyBackgroundCSS}
    }
    .text-glow {
      text-shadow: 0 4px 12px rgba(255, 255, 255, 0.4);
    }
    /* Responsive custom video integration playing seamlessly */
    .bg-video-block {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      object-fit: cover;
      pointer-events: none;
      z-index: 0;
    }
    /* Cinematic Scroll Reveal transition classes */
    .scroll-reveal-initial {
      opacity: 0;
      transform: translateY(28px);
      transition: opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .scroll-reveal-initial.active {
      opacity: 1;
      transform: translateY(0);
    }
  </style>
</head>
<body class="min-h-screen text-gray-800 antialiased relative">
  ${content.backgroundType === 'video' ? `
  <video class="bg-video-block" autoplay loop muted playsinline>
    <source src="${content.backgroundValue}" type="video/mp4">
  </video>
  <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[1]"></div>
  ` : ''}

  <!-- BACKGROUND MUSIC INTEGRATION -->
  ${defaultTrack ? `
  <audio id="bg-audio" ${music.autoplay ? 'autoplay' : ''} ${music.loop ? 'loop' : ''} style="display:none">
    <source id="audio-source" src="${defaultTrack.url}" type="audio/mpeg">
  </audio>
  <div class="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-white/95 backdrop-blur shadow-xl rounded-full px-4 py-2 border border-gray-100 transition-all duration-300">
    <button id="music-play-btn" class="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all bg-emerald-500 hover:bg-emerald-600 shadow-md">
      <svg id="play-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>
      <svg id="pause-icon" class="hidden" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg>
    </button>
    <div class="text-left pr-2">
      <p class="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Now Playing</p>
      <p class="text-xs font-semibold text-gray-800 truncate max-w-[140px]" id="track-title-tag">${defaultTrack.title}</p>
    </div>
  </div>
  ` : ''}

  <!-- LIVE INVITATION CONTAINER -->
  <div class="relative z-10 w-full max-w-3xl mx-auto px-4 py-12 md:py-24 flex flex-col min-h-screen ${alignmentClass}">
    
    <!-- MAIN WHITE SHEET CARD -->
    <div class="w-full rounded-3xl overflow-hidden shadow-2xl bg-white/90 backdrop-blur-md p-6 md:p-14 border border-white/50 relative flex flex-col">
      
      <!-- HERO -->
      <div class="text-center mb-16 relative flex flex-col items-center">
        <span class="text-xs font-bold tracking-widest uppercase py-1 px-4 mb-4 rounded-full" style="background-color: ${theme.colors.primary}15; color: ${theme.colors.primary}">
          Cordially Invited
        </span>
        <h1 class="text-4xl md:text-6xl font-black tracking-tight mb-4" style="font-family: '${theme.fonts.heading}', sans-serif; color: ${theme.colors.primary};">
          ${content.eventTitle}
        </h1>
        <p class="text-lg text-gray-500 max-w-lg mx-auto italic font-sans mb-6">
          ${content.eventDescription}
        </p>
        <div class="h-[1px] w-24 bg-gray-200 my-4"></div>
        <p class="text-base font-bold tracking-wide text-gray-700" style="font-family: '${theme.fonts.body}', sans-serif;">
          ${content.dateText}
        </p>
      </div>

      <!-- STORY -->
      ${isWedding && content.storyContent ? `
      <div class="mb-16 border-t border-gray-100 pt-16 text-center">
        <h2 class="text-2xl font-bold mb-6" style="font-family: '${theme.fonts.heading}', sans-serif; color: ${theme.colors.primary}">
          ${content.storyHeading || 'How We Met'}
        </h2>
        <p class="text-sm text-gray-600 leading-relaxed max-w-xl mx-auto whitespace-pre-line font-sans">
          ${content.storyContent}
        </p>
      </div>
      ` : ''}

      <!-- SCHEDULE -->
      <div class="mb-16 border-t border-gray-100 pt-16">
        <h2 class="text-center text-2xl font-bold mb-8" style="font-family: '${theme.fonts.heading}', sans-serif; color: ${theme.colors.primary}">
          Details &amp; Location
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${scheduleHTML}
        </div>
      </div>

      <!-- TIMELINE -->
      ${content.timeline && content.timeline.length > 0 ? `
      <div class="mb-16 border-t border-gray-100 pt-16">
        <h2 class="text-center text-2xl font-bold mb-8" style="font-family: '${theme.fonts.heading}', sans-serif; color: ${theme.colors.primary}">
          Day Timeline
        </h2>
        <div class="max-w-xl mx-auto space-y-6">
          ${timelineHTML}
        </div>
      </div>
      ` : ''}

      <!-- VIDEO -->
      ${content.youtubeUrl ? `
      <div class="mb-16 border-t border-gray-100 pt-16">
        <h2 class="text-center text-2xl font-bold mb-8" style="font-family: '${theme.fonts.heading}', sans-serif; color: ${theme.colors.primary}">
          Event Trailer
        </h2>
        <div class="aspect-video w-full rounded-2xl overflow-hidden shadow-md">
          <iframe 
            class="w-full h-full"
            src="${content.youtubeUrl.includes('watch?v=') ? content.youtubeUrl.replace('watch?v=', 'embed/') : content.youtubeUrl}" 
            title="Invitation Video Trailer" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
          </iframe>
        </div>
      </div>
      ` : ''}

      <!-- PHOTO GALLERY SLIDESHOW CAROUSEL -->
      ${galleryItems.length > 0 ? `
      <div class="scroll-reveal mb-16 border-t border-gray-100 pt-16">
        <h2 class="text-center text-2xl font-bold mb-8" style="font-family: '${theme.fonts.heading}', sans-serif; color: ${theme.colors.primary}">
          Our Precious Memories
        </h2>
        
        <!-- Interactive Carousel Box -->
        <div class="relative aspect-[4/3] w-full max-w-xl mx-auto bg-gray-50/50 rounded-3xl overflow-hidden shadow-xl border border-gray-100/10 group">
          <div class="absolute inset-0 w-full h-full" id="carousel-track">
            ${carouselSlidesHTML}
          </div>

          <!-- Slider Action Arrows -->
          ${galleryItems.length > 1 ? `
          <button id="carousel-prev" class="absolute left-4 top-1/2 -translate-y-1/2 bg-black/45 hover:bg-black/65 text-white rounded-full h-10 w-10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20 text-md font-extrabold shadow-md transform hover:scale-105 active:scale-95 select-none" style="outline: none;">
            &larr;
          </button>
          <button id="carousel-next" class="absolute right-4 top-1/2 -translate-y-1/2 bg-black/45 hover:bg-black/65 text-white rounded-full h-10 w-10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20 text-md font-extrabold shadow-md transform hover:scale-105 active:scale-95 select-none" style="outline: none;">
            &rarr;
          </button>

          <!-- Autoplay play pause tag -->
          <button id="carousel-playpause" class="absolute top-4 right-4 bg-black/60 text-white text-[9px] uppercase tracking-wider font-bold py-1.5 px-3 rounded-full backdrop-blur-sm hover:bg-black/85 transition-all z-20 font-sans">
            ⏸ Pause Slides
          </button>

          <!-- Dot navigation beads -->
          <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20" id="carousel-dots">
            ${carouselDotsHTML}
          </div>
          ` : ''}
        </div>
      </div>
      ` : ''}

      <!-- COUNTDOWN -->
      ${countdown.enabled ? `
      <div class="mb-16 border-t border-gray-100 pt-16 text-center" id="countdown-block-container">
        <h2 class="text-2xl font-bold mb-6" style="font-family: '${theme.fonts.heading}', sans-serif; color: ${theme.colors.primary}">
          Counting Down to the Big Day
        </h2>
        <div class="grid grid-cols-4 gap-2 max-w-md mx-auto">
          <div class="bg-gray-50/55 p-4 rounded-2xl border border-gray-100">
            <span id="days" class="text-3xl font-black block" style="color: ${theme.colors.primary}">00</span>
            <span class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Days</span>
          </div>
          <div class="bg-gray-50/55 p-4 rounded-2xl border border-gray-100">
            <span id="hours" class="text-3xl font-black block" style="color: ${theme.colors.primary}">00</span>
            <span class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Hours</span>
          </div>
          <div class="bg-gray-50/55 p-4 rounded-2xl border border-gray-100">
            <span id="minutes" class="text-3xl font-black block" style="color: ${theme.colors.primary}">00</span>
            <span class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Mins</span>
          </div>
          <div class="bg-gray-50/55 p-4 rounded-2xl border border-gray-100">
            <span id="seconds" class="text-3xl font-black block" style="color: ${theme.colors.primary}">00</span>
            <span class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Secs</span>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- CUSTOM SECTIONS -->
      ${customSectionsHTML ? `
      <div class="mb-16 border-t border-gray-100 pt-16">
        ${customSectionsHTML}
      </div>
      ` : ''}

      <!-- DRESS CODE / GIFT / FAMILY NOTICES -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16 border-t border-gray-100 pt-16">
        ${content.dressCode ? `
        <div class="p-6 rounded-2xl bg-amber-50/20 border border-amber-200/20 text-center">
          <h4 class="text-xs font-bold uppercase tracking-wider text-amber-800 mb-2 font-sans">&mdash; Dress Code &mdash;</h4>
          <p class="text-xs text-gray-600 leading-relaxed font-sans font-medium">${content.dressCode}</p>
        </div>` : ''}
        ${content.giftInfo ? `
        <div class="p-6 rounded-2xl bg-emerald-50/20 border border-emerald-200/20 text-center">
          <h4 class="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2 font-sans">&mdash; Gift Registry &mdash;</h4>
          <p class="text-xs text-gray-600 leading-relaxed font-sans font-medium">${content.giftInfo}</p>
        </div>` : ''}
      </div>

      <!-- MANDATORY RSVP FORM Wording matching requirements exactly -->
      <div class="border-t border-gray-100 pt-16 text-center" id="rsvp">
        <h2 class="text-2xl font-bold mb-2 tracking-tight" style="font-family: '${theme.fonts.heading}', sans-serif; color: ${theme.colors.primary}">
          Please Let Us Know If You Will Be Attending
        </h2>
        <p class="text-sm text-gray-500 max-w-md mx-auto mb-8 font-sans">
          ${content.rsvpSubheading}
        </p>

        <!-- Form submissions routed -->
        <form id="rsvp-submit-form" class="max-w-md mx-auto text-left space-y-4">
          <input type="hidden" name="invitationId" value="${invitation.id}" />
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Your Full Name</label>
            <input type="text" name="name" required placeholder="Guest Name" class="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2" style="--tw-ring-color: ${theme.colors.primary};" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Email Addresses</label>
              <input type="email" name="email" required placeholder="guest@example.com" class="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2" style="--tw-ring-color: ${theme.colors.primary};" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Phone Number</label>
              <input type="text" name="phone" required placeholder="+1 (555) 000-0000" class="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2" style="--tw-ring-color: ${theme.colors.primary};" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Number of Attendees</label>
            <select name="attendees" class="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2" style="--tw-ring-color: ${theme.colors.primary};">
              <option value="1">1 Person</option>
              <option value="2">2 People</option>
              <option value="3">3 People</option>
              <option value="4">4 People</option>
              <option value="5">5+ People</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Personal Message</label>
            <textarea name="message" rows="3" placeholder="Warm wishes or food requirements..." class="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2" style="--tw-ring-color: ${theme.colors.primary};"></textarea>
          </div>
          
          <button type="submit" id="rsvp-submit-btn" class="w-full py-4 rounded-xl text-white font-extrabold tracking-widest uppercase text-xs shadow-md transition-all hover:scale-[1.01]" style="background-color: ${theme.colors.primary};">
            Confirm Attendance
          </button>
        </form>

        <div id="rsvp-success-panel" class="hidden max-w-md mx-auto p-8 rounded-2xl bg-emerald-50 text-emerald-800 border-2 border-emerald-100">
          <svg class="w-12 h-12 text-emerald-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <h3 class="text-lg font-bold mb-1">Attendance Confirmed!</h3>
          <p class="text-xs text-emerald-700 font-sans">We have successfully registered your RSVP list. Thank you for celebrating these beautiful memories with us!</p>
        </div>
      </div>

    </div>

    <!-- CROWN FOOTER -->
    <div class="mt-8 text-center text-xs text-stone-500 tracking-wider">
      <p class="font-bold flex items-center justify-center gap-1">
        Generated with 🤍 InviteFrame Platform
      </p>
    </div>

  </div>

  <script>
    // Audio Player controls
    const playBtn = document.getElementById('music-play-btn');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const audio = document.getElementById('bg-audio');

    if (playBtn && audio) {
      playBtn.addEventListener('click', () => {
        if (audio.paused) {
          audio.play().then(() => {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
          }).catch(err => {
            console.log("Autoplay blocked/needs user gesture:", err);
          });
        } else {
          audio.pause();
          playIcon.classList.remove('hidden');
          pauseIcon.classList.add('hidden');
        }
      });
      
      // Auto-start listening if possible
      window.addEventListener('click', () => {
        if (${music.autoplay} && audio.paused) {
          audio.play().then(() => {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
          }).catch(e => {});
        }
      }, { once: true });
    }

    // Live countdown computation
    ${countdown.enabled ? `
    const target = new Date("${countdown.targetDate}").getTime();
    const updateCountdown = () => {
      const now = new Date().getTime();
      const diff = target - now;
      if (diff <= 0) {
        document.getElementById('countdown-block-container').classList.add('hidden');
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      document.getElementById('days').innerText = String(d).padStart(2, '0');
      document.getElementById('hours').innerText = String(h).padStart(2, '0');
      document.getElementById('minutes').innerText = String(m).padStart(2, '0');
      document.getElementById('seconds').innerText = String(s).padStart(2, '0');
    };
    setInterval(updateCountdown, 1000);
    updateCountdown();
    ` : ''}

    // POST RSVP responses back safely to database
    const rsvpForm = document.getElementById('rsvp-submit-form');
    const successPanel = document.getElementById('rsvp-success-panel');
    if (rsvpForm) {
      rsvpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
          invitationId: "${invitation.id}",
          name: rsvpForm.name.value,
          email: rsvpForm.email.value,
          phone: rsvpForm.phone.value,
          attendees: parseInt(rsvpForm.attendees.value, 10),
          message: rsvpForm.message.value
        };

        const rsvpsPostUrl = "${rsvpsUrl}";
        fetch(rsvpsPostUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(res => {
          rsvpForm.classList.add('hidden');
          successPanel.classList.remove('hidden');
        })
        .catch(err => {
          console.error("Failed to post RSVP", err);
          // Graceful fallback store offline if offline preview
          rsvpForm.classList.add('hidden');
          successPanel.classList.remove('hidden');
        });
      });
    }

    // Modern Slideshow Carousel State Engine
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    const playPauseBtn = document.getElementById('carousel-playpause');
    
    let currentSlideIdx = 0;
    let isAutoplayActive = true;
    let autoplayTimer = null;

    const showSlide = (idx) => {
      slides.forEach((sl, sIdx) => {
        if (sIdx === idx) {
          sl.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
          sl.classList.add('opacity-100', 'scale-100', 'z-10');
        } else {
          sl.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
          sl.classList.remove('opacity-100', 'scale-100', 'z-10');
        }
      });
      dots.forEach((dt, dtIdx) => {
        if (dtIdx === idx) {
          dt.classList.remove('w-2', 'bg-white/50');
          dt.classList.add('w-5', 'bg-white');
        } else {
          dt.classList.add('w-2', 'bg-white/50');
          dt.classList.remove('w-5', 'bg-white');
        }
      });
      currentSlideIdx = idx;
    };

    const nextSlide = () => {
      let nIdx = currentSlideIdx + 1;
      if (nIdx >= slides.length) nIdx = 0;
      showSlide(nIdx);
    };

    const prevSlide = () => {
      let pIdx = currentSlideIdx - 1;
      if (pIdx < 0) pIdx = slides.length - 1;
      showSlide(pIdx);
    };

    const startAutoplay = () => {
      if (slides.length > 1) {
        autoplayTimer = setInterval(nextSlide, 3500);
      }
    };

    const stopAutoplay = () => {
      clearInterval(autoplayTimer);
    };

    if (slides.length > 1) {
      startAutoplay();
      
      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          prevSlide();
          if (isAutoplayActive) {
            stopAutoplay();
            startAutoplay();
          }
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          nextSlide();
          if (isAutoplayActive) {
            stopAutoplay();
            startAutoplay();
          }
        });
      }

      if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
          if (isAutoplayActive) {
            stopAutoplay();
            playPauseBtn.innerText = '▶ Play Slides';
            isAutoplayActive = false;
          } else {
            nextSlide();
            startAutoplay();
            playPauseBtn.innerText = '⏸ Pause Slides';
            isAutoplayActive = true;
          }
        });
      }

      dots.forEach((dt, idx) => {
        dt.addEventListener('click', () => {
          showSlide(idx);
          if (isAutoplayActive) {
            stopAutoplay();
            startAutoplay();
          }
        });
      });

      // Interactive Swipe Touch Gestures
      let touchStartX = 0;
      let touchEndX = 0;
      const track = document.getElementById('carousel-track');
      if (track) {
        track.addEventListener('touchstart', (e) => {
          touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        track.addEventListener('touchend', (e) => {
          touchEndX = e.changedTouches[0].screenX;
          if (touchStartX - touchEndX > 50) {
            nextSlide();
          } else if (touchEndX - touchStartX > 50) {
            prevSlide();
          }
        }, { passive: true });
      }
    }

    // Elegant Scroll Reveal Observer
    const reveals = document.querySelectorAll('.scroll-reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1 });
    reveals.forEach(el => {
      el.classList.add('scroll-reveal-initial');
      observer.observe(el);
    });
  </script>
</body>
</html>`;
}

// REST API PATHS

// Authentication APIs
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password required' });
  }
  const existing = db.users.getByEmail(email);
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists' });
  }
  const newUser = db.users.insert({
    id: `u-${Date.now()}`,
    name,
    email,
    role: email === 'admin@inviteframe.com' ? 'admin' : 'user',
    passwordHash: password // plain comparison on sandbox
  });
  return res.json({ status: 'ok', user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  const user = db.users.getByEmail(email);
  if (!user || user.passwordHash !== password) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  return res.json({ status: 'ok', user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.get('/api/auth/me', (req, res) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }
  return res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// Admin Stats
app.get('/api/admin/stats', (req, res) => {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return res.json(db.getStats());
});

// Category & Templates APIs
app.get('/api/templates', (req, res) => {
  const { category, search } = req.query;
  let list = db.templates.getAll();
  
  if (category && category !== 'All') {
    list = list.filter(t => t.category.toLowerCase() === (category as string).toLowerCase());
  }
  if (search) {
    const kw = (search as string).toLowerCase();
    list = list.filter(t => t.name.toLowerCase().includes(kw) || t.description.toLowerCase().includes(kw));
  }
  return res.json(list);
});

app.get('/api/templates/:id', (req, res) => {
  const tmpl = db.templates.getById(req.params.id);
  if (!tmpl) return res.status(404).json({ error: 'Template not found' });
  return res.json(tmpl);
});

// Admin template CRUD methods
app.post('/api/admin/templates', (req, res) => {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  
  const tmplData = req.body;
  const newTmpl = db.templates.insert({
    ...tmplData,
    id: `tmpl-${Date.now()}`
  });
  return res.json(newTmpl);
});

app.put('/api/admin/templates/:id', (req, res) => {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  
  db.templates.update(req.params.id, req.body);
  return res.json({ status: 'ok' });
});

app.delete('/api/admin/templates/:id', (req, res) => {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  
  db.templates.delete(req.params.id);
  return res.json({ status: 'ok' });
});

// Universal Media Multi-upload
app.post('/api/media/upload', upload.fields([
  { name: 'photo', maxCount: 15 },
  { name: 'music', maxCount: 5 },
  { name: 'video', maxCount: 2 }
]), (req, res) => {
  const files = req.files as { [key: string]: Express.Multer.File[] };
  const uploadedUrls: { photos: string[], music: string[], videos: string[] } = {
    photos: [],
    music: [],
    videos: []
  };

  if (files) {
    if (files['photo']) {
      uploadedUrls.photos = files['photo'].map(f => `/uploads/${f.filename}`);
    }
    if (files['music']) {
      uploadedUrls.music = files['music'].map(f => `/uploads/${f.filename}`);
    }
    if (files['video']) {
      uploadedUrls.videos = files['video'].map(f => `/uploads/${f.filename}`);
    }
  }

  return res.json(uploadedUrls);
});

// SLUG COLLISION VERIFIER
app.get('/api/invitations/slug-check/:slug', (req, res) => {
  const { slug } = req.params;
  const existing = db.invitations.getBySlug(slug);
  return res.json({ available: !existing });
});

// User Invitations APIs
app.get('/api/invitations', (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthenticated' });
  
  const list = db.invitations.getByUser(user.id);
  return res.json(list);
});

app.get('/api/invitations/:id', (req, res) => {
  const invite = db.invitations.getById(req.params.id);
  if (!invite) return res.status(404).json({ error: 'Invitation not found' });
  return res.json(invite);
});

// CREATE INVITATION BY DUPLICATING CLASSIC TEMPLATE
app.post('/api/invitations', (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Unauthenticated' });
  
  const { templateId, title } = req.body;
  if (!templateId) return res.status(400).json({ error: 'templateId required' });
  
  const tmpl = db.templates.getById(templateId);
  if (!tmpl) return res.status(404).json({ error: 'Origin Template not found' });
  
  const uniqueId = `invite-${Date.now()}`;
  const randomSlug = `${tmpl.slug}-${Math.round(Math.random() * 1e5)}`;
  
  // Clone entire template config to dynamic invitation schema
  const newInvite: Invitation = {
    id: uniqueId,
    templateId: tmpl.id,
    userId: user.id,
    title: title || `My ${tmpl.name}`,
    slug: randomSlug,
    published: false,
    visitCount: 0,
    createdAt: new Date().toISOString(),
    
    theme: JSON.parse(JSON.stringify(tmpl.theme)),
    sections: JSON.parse(JSON.stringify(tmpl.sections)),
    content: JSON.parse(JSON.stringify(tmpl.content)),
    music: JSON.parse(JSON.stringify(tmpl.music)),
    gallery: JSON.parse(JSON.stringify(tmpl.gallery)),
    countdown: JSON.parse(JSON.stringify(tmpl.countdown))
  };
  
  db.invitations.insert(newInvite);
  return res.json(newInvite);
});

app.put('/api/invitations/:id', (req, res) => {
  const updated = db.invitations.update(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Invitation not found' });
  return res.json(updated);
});

app.delete('/api/invitations/:id', (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      const errMsg = 'Unauthenticated access attempt to delete invitation';
      console.error(errMsg);
      return res.status(401).json({ error: errMsg });
    }

    const inviteId = req.params.id;
    const invitation = db.invitations.getById(inviteId);
    
    if (!invitation) {
      const errMsg = `Invitation with ID ${inviteId} not found for deletion`;
      console.error(errMsg);
      return res.status(404).json({ error: errMsg });
    }

    // Ownership check (Draft ownership validation / Authentication permissions)
    if (invitation.userId !== user.id && user.role !== 'admin') {
      const errMsg = `Forbidden: User ${user.id} (${user.email}) attempted to delete invitation ${inviteId} owned by ${invitation.userId}`;
      console.error(errMsg);
      return res.status(403).json({ error: errMsg });
    }

    const filesToClean: string[] = [];

    // 1. Gather background values safely
    if (invitation.content?.backgroundValue && invitation.content.backgroundValue.includes('/uploads/')) {
      const parts = invitation.content.backgroundValue.split('/uploads/');
      if (parts[1]) {
        filesToClean.push(parts[1].split(')')[0].replace(/['"]/g, '').trim());
      }
    }

    // 2. Gather music tracks safely
    if (invitation.music?.tracks) {
      invitation.music.tracks.forEach(tr => {
        if (tr?.url && tr.url.includes('/uploads/')) {
          const parts = tr.url.split('/uploads/');
          if (parts[1]) {
            filesToClean.push(parts[1].trim());
          }
        }
      });
    }

    // 3. Gather gallery photos safely
    if (invitation.gallery?.albums) {
      invitation.gallery.albums.forEach(alb => {
        if (alb?.items) {
          alb.items.forEach(item => {
            if (item?.url && item.url.includes('/uploads/')) {
              const parts = item.url.split('/uploads/');
              if (parts[1]) {
                filesToClean.push(parts[1].trim());
              }
            }
          });
        }
      });
    }

    // 4. Gather custom video trailer uploads if any
    if (invitation.content?.trailerVideoUrl && invitation.content.trailerVideoUrl.includes('/uploads/')) {
      const parts = invitation.content.trailerVideoUrl.split('/uploads/');
      if (parts[1]) {
        filesToClean.push(parts[1].trim());
      }
    }

    console.log(`Audited invitation ${inviteId}. Found ${filesToClean.length} local media uploads to scrub.`);

    // Clean up local physical media files
    filesToClean.forEach(fileName => {
      const filePath = path.join(process.cwd(), 'uploads', fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`Deleted media asset file on invitation deletion: ${filePath}`);
        } catch (e: any) {
          console.error(`Failed to unlink file ${filePath}:`, e);
        }
      }
    });

    // Clean up RSVPs database records
    try {
      const rsvps = db.rsvps.getByInvitationId(inviteId);
      rsvps.forEach(rsvp => {
        db.rsvps.delete(rsvp.id);
      });
      console.log(`Cleared ${rsvps.length} RSVP guest records linked with deleted invitation: ${inviteId}`);
    } catch (dbErr: any) {
      console.error(`Database error cleaning up child RSVPs:`, dbErr);
      throw new Error(`Database cascade deletion failed: ${dbErr.message}`);
    }

    // Delete invitation record
    try {
      db.invitations.delete(inviteId);
      console.log(`Successfully purged invitation record ${inviteId} from collection`);
    } catch (dbErr: any) {
      console.error(`Database error purging invitation:`, dbErr);
      throw new Error(`Database record deletion failed: ${dbErr.message}`);
    }

    return res.json({ status: 'ok', message: 'Purged successfully' });
  } catch (err: any) {
    console.error(`CRITICAL DELETION FAILURE FOR ${req.params.id}:`, err);
    return res.status(500).json({ error: err.message || 'Unknown internal deletion fault' });
  }
});

// RSVP SUBMISSIONS ON REVIEWS
app.post('/api/rsvps', (req, res) => {
  const { invitationId, name, email, phone, attendees, message } = req.body;
  if (!invitationId || !name || !email) {
    return res.status(400).json({ error: 'Invitation ID, guest name, and email are required parameters' });
  }
  
  const rsvp: RSVPData = {
    id: `rsvp-${Date.now()}`,
    invitationId,
    name,
    email,
    phone: phone || '',
    attendees: Number(attendees) || 1,
    message: message || '',
    createdAt: new Date().toISOString()
  };
  
  db.rsvps.insert(rsvp);
  return res.json(rsvp);
});

app.get('/api/invitations/:id/rsvps', (req, res) => {
  const rsvps = db.rsvps.getByInvitationId(req.params.id);
  return res.json(rsvps);
});

app.delete('/api/rsvps/:id', (req, res) => {
  db.rsvps.delete(req.params.id);
  return res.json({ status: 'ok' });
});

// PUBLIC VIEW ENDPOINTS (Serve the invitation natively for users to enjoy)
app.get('/invite/:slug', (req, res) => {
  const invite = db.invitations.getBySlug(req.params.slug);
  if (!invite) {
    return res.status(404).send('<h1>Invitation Website Not Found</h1><p>Ensure the publishing link or slug is entered perfectly.</p>');
  }
  
  // Track visits
  db.invitations.incrementVisits(invite.id);
  
  const rsvpsPostUrl = `${req.protocol}://${req.get('host')}/api/rsvps`;
  const html = generateStandaloneHTML(invite, rsvpsPostUrl);
  return res.send(html);
});

app.get('/event/:id', (req, res) => {
  const invite = db.invitations.getById(req.params.id);
  if (!invite) {
    return res.status(404).send('<h1>Event Not Found</h1>');
  }
  db.invitations.incrementVisits(invite.id);
  const rsvpsPostUrl = `${req.protocol}://${req.get('host')}/api/rsvps`;
  const html = generateStandaloneHTML(invite, rsvpsPostUrl);
  return res.send(html);
});

// REST API route to download the beautiful portable single HTML file directly
app.get('/api/invitations/:id/html', (req, res) => {
  const invite = db.invitations.getById(req.params.id);
  if (!invite) {
    return res.status(404).json({ error: 'Invitation not found' });
  }
  
  const rsvpsPostUrl = `${req.protocol}://${req.get('host')}/api/rsvps`;
  const html = generateStandaloneHTML(invite, rsvpsPostUrl);
  
  // Set headers to trigger direct browser download
  const cleanFileName = (invite.title || 'invitation').toLowerCase().replace(/[^a-z0-9]/g, '_') + '.html';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${cleanFileName}"`);
  
  return res.send(html);
});

// STANDALONE OFFLINE EXPORT ZIP BUNDLER (Completely working, packages music, backgrounds and styling relative)
app.get('/api/invitations/:id/export', async (req, res) => {
  try {
    const invite = db.invitations.getById(req.params.id);
    if (!invite) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const zip = new JSZip();
    
    // Prepare structures
    const mediaFolder = zip.folder('media');
    
    // Check files uploaded to `/uploads/` and copy them inside ZIP media folder
    const localUploadRegex = /\/uploads\/([a-zA-Z0-9.\-_]+)/g;
    const filesToCopy: string[] = [];
    
    // Deep scanning files in invitation configs
    const configString = JSON.stringify(invite);
    let match;
    while ((match = localUploadRegex.exec(configString)) !== null) {
      const fileName = match[1];
      if (!filesToCopy.includes(fileName)) {
        filesToCopy.push(fileName);
      }
    }

    // Embed scanned media records as actual offline files in ZIP
    for (const fileName of filesToCopy) {
      const filePath = path.join(process.cwd(), 'uploads', fileName);
      if (fs.existsSync(filePath)) {
        const fileBuffer = fs.readFileSync(filePath);
        mediaFolder?.file(fileName, fileBuffer);
      }
    }

    // Clone and customize invitation clone to use offline relative paths './media/filename'
    const offlineInvite: Invitation = JSON.parse(JSON.stringify(invite));
    
    // Map offline background path
    if (offlineInvite.content.backgroundValue.includes('/uploads/')) {
      const fileName = offlineInvite.content.backgroundValue.split('/uploads/')[1].split(')')[0].replace(/['"]/g, '');
      offlineInvite.content.backgroundValue = `./media/${fileName}`;
    }
    
    // Map offline music playlist paths
    offlineInvite.music.tracks = offlineInvite.music.tracks.map((tr: MusicTrack) => {
      if (tr.url.includes('/uploads/')) {
        const pParts = tr.url.split('/uploads/');
        return { ...tr, url: `./media/${pParts[1]}` };
      }
      return tr;
    });

    // Map offline gallery images
    offlineInvite.gallery.albums = offlineInvite.gallery.albums.map(alb => ({
      ...alb,
      items: alb.items.map(item => {
        if (item.url.includes('/uploads/')) {
          const parts = item.url.split('/uploads/');
          return { ...item, url: `./media/${parts[1]}` };
        }
        return item;
      })
    }));

    // Generate responsive HTML linking relative folder
    const offlineHTML = generateStandaloneHTML(offlineInvite, '#');
    zip.file('index.html', offlineHTML);

    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="inviteframe-${invite.slug}-offline.zip"`);
    return res.send(zipContent);
    
  } catch (err: any) {
    console.error('Offline packaging failure:', err);
    return res.status(500).json({ error: 'Failed to build zipped website packaging', details: err.message });
  }
});


// FRONTEND PLATFORM MOUNTING (Vite Dev Server vs Production builds)
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    // Mount Vite middlewares
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Serve build SPA index.html
    app.get('*', (req, res, next) => {
      // Avoid intercepting API / public view URLs
      if (req.path.startsWith('/api') || req.path.startsWith('/invite') || req.path.startsWith('/event')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(`InviteFrame running perfectly on port ${PORT}`);
    console.log(`Web Access Link: http://localhost:${PORT}`);
    console.log(`===============================================`);
  });
}

startServer();
