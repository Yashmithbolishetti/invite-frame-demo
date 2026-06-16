/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  passwordHash?: string; // only stored server-side
}

export interface ThemeConfig {
  colors: {
    primary: string;     // e.g., Gold, Indigo, Rose
    secondary: string;
    accent: string;
    text: string;
    background: string;
    button: string;
    buttonText: string;
    border: string;
    card: string;
  };
  fonts: {
    heading: string;     // Google font name (e.g. 'Playfair Display')
    body: string;        // e.g. 'Inter'
    button: string;
  };
  layout: {
    spacing: 'compact' | 'normal' | 'relaxed';
    width: 'narrow' | 'medium' | 'wide';
    borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
    shadows: 'none' | 'sm' | 'md' | 'lg';
    alignment: 'left' | 'center' | 'right';
  };
}

export interface SectionConfig {
  id: string;
  title: string;
  enabled: boolean;
  order: number;
  customBg?: {
    type: 'color' | 'gradient' | 'image' | 'video';
    value: string;
    textColor?: string;
    overlayColor?: string;
    overlayOpacity?: number;
    blur?: number;
    parallax?: boolean;
    glassmorphism?: boolean;
  };
}

export interface TimelineItem {
  id: string;
  time: string;
  title: string;
  description: string;
}

export interface ScheduleItem {
  id: string;
  title: string;
  time: string;
  date: string;
  venue: string;
  address: string;
  mapsUrl: string;
}

export interface MediaAsset {
  id: string;
  url: string;
  type: 'image' | 'video' | 'audio';
  name: string;
  size?: number;
}

export interface RSVPData {
  id: string;
  invitationId: string;
  name: string;
  email: string;
  phone: string;
  attendees: number;
  message: string;
  createdAt: string;
}

export interface GalleryItem {
  id: string;
  url: string;
  caption: string;
  order: number;
}

export interface Album {
  id: string;
  name: string;
  items: GalleryItem[];
}

export interface MusicTrack {
  id: string;
  title: string;
  url: string;
  builtIn?: boolean;
}

export interface InvitationContent {
  eventTitle: string;
  dateText: string;
  // Specific roles depend on template (Wedding has bride/groom, birthday has honoree, etc.)
  brideName?: string;
  groomName?: string;
  birthdayPersonName?: string;
  eventDescription: string;
  storyHeading?: string;
  storyContent?: string;
  contactDetails?: string;
  familyInfo?: string;
  giftInfo?: string;
  dressCode?: string;
  customSections: { id: string; title: string; content: string }[];
  
  // Schedule & Venue details
  schedule: ScheduleItem[];
  timeline: TimelineItem[];
  vimeoUrl?: string;
  youtubeUrl?: string;
  trailerVideoUrl?: string; // URL to hosted video file
  
  // System configurations
  rsvpHeading: string;
  rsvpSubheading: string;
  
  // BG system
  backgroundType: 'color' | 'gradient' | 'image' | 'video';
  backgroundValue: string;
  bgOverlayOpacity: number;
  bgBlur: number;
  parallaxEnabled: boolean;
  glassmorphismEnabled: boolean;
}

export interface Invitation {
  id: string;
  templateId: string;
  userId: string;
  title: string;
  slug: string;
  published: boolean;
  visitCount: number;
  createdAt: string;
  
  theme: ThemeConfig;
  sections: SectionConfig[];
  content: InvitationContent;
  
  music: {
    tracks: MusicTrack[];
    defaultTrackId: string;
    autoplay: boolean;
    loop: boolean;
    controlsEnabled: boolean;
    volume: number;
  };
  
  gallery: {
    albums: Album[];
  };
  
  countdown: {
    enabled: boolean;
    targetDate: string; // ISO or date string
    style: 'classic' | 'digital' | 'bento' | 'cinematic';
  };
  darkModeMode?: 'light' | 'dark' | 'both';
}

export interface Template {
  id: string;
  name: string;
  slug: string;
  category: string; // Wedding, Birthday, Engagement, Baby Shower, Housewarming, Corporate, Festival, Anniversary, Graduation, Custom
  thumbnailUrl: string;
  description: string;
  
  // Base configuration
  theme: ThemeConfig;
  sections: SectionConfig[];
  content: InvitationContent;
  music: Invitation['music'];
  gallery: Invitation['gallery'];
  countdown: Invitation['countdown'];
  darkModeMode?: 'light' | 'dark' | 'both';
}

export interface SiteStats {
  totalUsers: number;
  totalTemplates: number;
  totalInvitations: number;
  totalRSVPsCount: number;
  totalVisits: number;
}
