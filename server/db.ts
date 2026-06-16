/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { User, Template, Invitation, RSVPData, SiteStats, InvitationContent } from '../src/types.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface Schema {
  users: User[];
  templates: Template[];
  invitations: Invitation[];
  rsvps: RSVPData[];
}

let dbCache: Schema = {
  users: [],
  templates: [],
  invitations: [],
  rsvps: []
};

// Ensure database and folders are initialized
export function initDB() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      dbCache = JSON.parse(data);
    } catch (err) {
      console.error('Failed to parse database file. Re-initializing...', err);
      writeDB();
    }
  } else {
    writeDB();
  }
  
  seedDatabase();
}

function writeDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbCache, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to database file:', err);
  }
}

// Relational Operations
export const db = {
  users: {
    getAll: () => dbCache.users,
    getById: (id: string) => dbCache.users.find(u => u.id === id),
    getByEmail: (email: string) => dbCache.users.find(u => u.email.toLowerCase() === email.toLowerCase()),
    insert: (user: User) => {
      dbCache.users.push(user);
      writeDB();
      return user;
    },
    update: (id: string, updates: Partial<User>) => {
      const index = dbCache.users.findIndex(u => u.id === id);
      if (index !== -1) {
        dbCache.users[index] = { ...dbCache.users[index], ...updates };
        writeDB();
      }
    },
    delete: (id: string) => {
      dbCache.users = dbCache.users.filter(u => u.id !== id);
      writeDB();
    }
  },
  
  templates: {
    getAll: () => dbCache.templates,
    getById: (id: string) => dbCache.templates.find(t => t.id === id),
    getBySlug: (slug: string) => dbCache.templates.find(t => t.slug === slug),
    insert: (template: Template) => {
      dbCache.templates.push(template);
      writeDB();
      return template;
    },
    update: (id: string, updates: Partial<Template>) => {
      const index = dbCache.templates.findIndex(t => t.id === id);
      if (index !== -1) {
        dbCache.templates[index] = { ...dbCache.templates[index], ...updates } as Template;
        writeDB();
      }
    },
    delete: (id: string) => {
      dbCache.templates = dbCache.templates.filter(t => t.id !== id);
      writeDB();
    }
  },
  
  invitations: {
    getAll: () => dbCache.invitations,
    getById: (id: string) => dbCache.invitations.find(i => i.id === id),
    getBySlug: (slug: string) => dbCache.invitations.find(i => i.slug === slug),
    getByUser: (userId: string) => dbCache.invitations.filter(i => i.userId === userId),
    insert: (invitation: Invitation) => {
      dbCache.invitations.push(invitation);
      writeDB();
      return invitation;
    },
    update: (id: string, updates: Partial<Invitation>) => {
      const index = dbCache.invitations.findIndex(i => i.id === id);
      if (index !== -1) {
        dbCache.invitations[index] = { ...dbCache.invitations[index], ...updates } as Invitation;
        writeDB();
        return dbCache.invitations[index];
      }
      return null;
    },
    delete: (id: string) => {
      dbCache.invitations = dbCache.invitations.filter(i => i.id !== id);
      // Clean up RSVPs as cascade delete
      dbCache.rsvps = dbCache.rsvps.filter(r => r.invitationId !== id);
      writeDB();
    },
    incrementVisits: (id: string) => {
      const index = dbCache.invitations.findIndex(i => i.id === id);
      if (index !== -1) {
        dbCache.invitations[index].visitCount = (dbCache.invitations[index].visitCount || 0) + 1;
        writeDB();
      }
    }
  },
  
  rsvps: {
    getAll: () => dbCache.rsvps,
    getByInvitationId: (invId: string) => dbCache.rsvps.filter(r => r.invitationId === invId),
    getById: (id: string) => dbCache.rsvps.find(r => r.id === id),
    insert: (rsvp: RSVPData) => {
      dbCache.rsvps.push(rsvp);
      writeDB();
      return rsvp;
    },
    delete: (id: string) => {
      dbCache.rsvps = dbCache.rsvps.filter(r => r.id !== id);
      writeDB();
    }
  },
  
  getStats: (): SiteStats => {
    const totalVisits = dbCache.invitations.reduce((acc, inv) => acc + (inv.visitCount || 0), 0);
    return {
      totalUsers: dbCache.users.length,
      totalTemplates: dbCache.templates.length,
      totalInvitations: dbCache.invitations.length,
      totalRSVPsCount: dbCache.rsvps.length,
      totalVisits
    };
  }
};

// Seed administrative accounts and breathtakingly fully functional templates 
function seedDatabase() {
  let modified = false;
  
  // Seed Users
  if (dbCache.users.length === 0) {
    dbCache.users.push({
      id: 'admin-user',
      name: 'System Admin',
      email: 'admin@inviteframe.com',
      role: 'admin',
      passwordHash: 'admin123' // Simplified plain text comparison for quick fully-functional sandbox reliability
    });
    dbCache.users.push({
      id: 'test-user',
      name: 'Yashmith Bolishetti',
      email: 'user@inviteframe.com',
      role: 'user',
      passwordHash: 'user123'
    });
    modified = true;
  }
  
  // Seed Templates (24 distinct options matching all specified categories)
  if (dbCache.templates.length === 0) {
    const defaultTemplates: Template[] = [
      // 1. ROYAL WEDDING (Wedding)
      createTemplateSeed({
        id: 'tmpl-royal-wedding',
        name: 'Royal Wedding',
        slug: 'royal-wedding',
        category: 'Wedding',
        description: 'Deep burgundy velvet elements paired with ornate golden frames and elegant serif editorial headings. Designed for palatial and traditional royal marriages.',
        primary: '#800020',
        secondary: '#D4AF37',
        accent: '#D4AF37',
        headingFont: 'Playfair Display',
        bride: 'Helena',
        groom: 'Vittorio',
        desc: 'We request the honor of your presence as we unite in holy matrimony in an elegant celebration of trust, companionship, and dynamic legacy.'
      }),
      // 2. LUXURY WEDDING (Wedding)
      createTemplateSeed({
        id: 'tmpl-luxury-wedding',
        name: 'Luxury Wedding',
        slug: 'luxury-wedding',
        category: 'Wedding',
        description: 'Pristine white canvas layered with champagne silk tones, clean horizontal lines, and gorgeous high-contrast gold accents.',
        primary: '#CFB53B',
        secondary: '#1A1A1A',
        accent: '#F9F6F0',
        headingFont: 'Cinzel',
        bride: 'Eleanor',
        groom: 'Arthur',
        desc: 'Join us for a stellar celebration of luxury, laughter, and lifelong devotion. Our reception will be a classic white-glove cocktail evening.'
      }),
      // 3. CINEMATIC WEDDING (Wedding)
      createTemplateSeed({
        id: 'tmpl-cinematic-wedding',
        name: 'Cinematic Wedding',
        slug: 'cinematic-wedding',
        category: 'Wedding',
        description: 'Immersive dark cosmic theme focusing on cinematic storytelling format, large high-dynamic-range cover, and full-screen visual pacing.',
        primary: '#E2E8F0',
        secondary: '#0F172A',
        accent: '#38BDF8',
        headingFont: 'Space Grotesk',
        bride: 'Zara',
        groom: 'Leon',
        desc: 'Two universes colliding into a beautiful story. Observe and celebrate our wedding ceremony under the shooting stars.',
        backgroundType: 'video',
        backgroundValue: 'https://assets.mixkit.co/videos/preview/mixkit-holding-hands-of-a-bride-and-groom-41584-large.mp4'
      }),
      // 4. MODERN ELEGANT WEDDING (Wedding)
      createTemplateSeed({
        id: 'tmpl-modern-wedding',
        name: 'Modern Elegant Wedding',
        slug: 'modern-elegant-wedding',
        category: 'Wedding',
        description: 'A slick contemporary experience using clean margins, rich emerald green colors, and sleek rose accents.',
        primary: '#064E3B',
        secondary: '#FDF2F8',
        accent: '#F472B6',
        headingFont: 'Outfit',
        bride: 'Clara',
        groom: 'Julian',
        desc: 'With love in our hearts and rings in our hands, we invite you to celebrate our contemporary garden ceremony and dinner toast.'
      }),
      // 5. FLORAL WEDDING (Wedding)
      createTemplateSeed({
        id: 'tmpl-floral-wedding',
        name: 'Floral Wedding',
        slug: 'floral-wedding',
        category: 'Wedding',
        description: 'Soft watercolor blush roses, sage branches, and graceful italic scripts creating an enchanting secret cottage botanical garden aura.',
        primary: '#DB2777',
        secondary: '#ECFDF5',
        accent: '#059669',
        headingFont: 'Playfair Display',
        bride: 'Lily',
        groom: 'Oliver',
        desc: 'Under the blossom of cherry trees and roses, we will pledge our lifetime commitments. Please join us in our floral botanical paradise.'
      }),
      // 6. MINIMAL LUXURY WEDDING (Wedding)
      createTemplateSeed({
        id: 'tmpl-minimal-wedding',
        name: 'Minimal Luxury Wedding',
        slug: 'minimal-luxury-wedding',
        category: 'Wedding',
        description: 'Classic high-contrast charcoal typography, massive negative space, thin dividing borders, and beautiful pure editorial layout design.',
        primary: '#111827',
        secondary: '#FFFFFF',
        accent: '#4B5563',
        headingFont: 'Playfair Display',
        bride: 'Sophie',
        groom: 'David',
        desc: 'Less is more. We invite you to an intimate, minimal-inspired wedding ceremony held in the industrial concrete loft halls of New York City.'
      }),
      // 7. DESTINATION WEDDING (Wedding)
      createTemplateSeed({
        id: 'tmpl-destination-wedding',
        name: 'Destination Wedding',
        slug: 'destination-wedding',
        category: 'Wedding',
        description: 'Calming ocean tides, deep sand textures, pristine turquoise typography, and gorgeous travel-log timelines.',
        primary: '#0D9488',
        secondary: '#FFFBEB',
        accent: '#F59E0B',
        headingFont: 'Outfit',
        bride: 'Aria',
        groom: 'Kai',
        desc: 'We are packing our suitcases and flying to the Amalfi Coast! We would be deeply honored for you to join us on the beaches of Positano.'
      }),
      // 8. TRADITIONAL INDIAN WEDDING (Wedding)
      createTemplateSeed({
        id: 'tmpl-traditional-indian',
        name: 'Traditional Indian Wedding',
        slug: 'traditional-indian',
        category: 'Wedding',
        description: 'Rich royal marigolds, festive vermillion reds, beautiful mandap graphics, and gorgeous customized Multi-Day schedule cards.',
        primary: '#DC2626',
        secondary: '#FEF3C7',
        accent: '#D97706',
        headingFont: 'Cinzel',
        bride: 'Priya',
        groom: 'Rahul',
        desc: 'With the blessings of our ancestors and family, we invite you to join our festive, colorful wedding celebrations spanning Haldi, Sangeet, and the Shubh Vivaah.'
      }),
      // 9. SOUTH INDIAN WEDDING (Wedding)
      createTemplateSeed({
        id: 'tmpl-south-indian',
        name: 'South Indian Wedding',
        slug: 'south-indian',
        category: 'Wedding',
        description: 'Golden borders symbolizing traditional Kanjeevaram silk saaris, warm off-white tones, banana leaves decorations, and classic temple pillars style.',
        primary: '#78350F',
        secondary: '#FFFDF0',
        accent: '#D97706',
        headingFont: 'Cinzel',
        bride: 'Meenakshi',
        groom: 'Hari',
        desc: 'We cordially invite you to join our sacred South Indian Muhurtham wedding ceremony, characterized by traditional silk and spiritual temple beats.'
      }),
      // 10. GOLDEN WEDDING (Wedding)
      createTemplateSeed({
        id: 'tmpl-golden-wedding',
        name: 'Golden Wedding',
        slug: 'golden-wedding',
        category: 'Wedding',
        description: 'Metallic rich gold over velvet charcoal canvas celebrating Golden Jubilee, anniversaries, and eternal vows.',
        primary: '#F59E0B',
        secondary: '#18181B',
        accent: '#A1A1AA',
        headingFont: 'Cinzel',
        bride: 'Margaret',
        groom: 'James',
        desc: 'Celebrating 50 years of laughter, trials, children, and beautiful accomplishments. Join us as we renew our marriage commitments under gold rays.'
      }),
      
      // 11. LUXURY BIRTHDAY (Birthday)
      createTemplateSeed({
        id: 'tmpl-luxury-birthday',
        name: 'Luxury Birthday',
        slug: 'luxury-birthday',
        category: 'Birthday',
        description: 'Glow-champagne over cosmic night, premium bento grid styling, and animated countdown clocks for major milestones (30th, 40th, 50th).',
        primary: '#FBBF24',
        secondary: '#09090B',
        accent: '#F3F4F6',
        headingFont: 'Space Grotesk',
        birthdayName: 'Alexander',
        desc: 'You only turn thirty once. Raise a glass of Krug Champagne with me in a black-tie evening filled with dynamic music.'
      }),
      // 12. MODERN BIRTHDAY (Birthday)
      createTemplateSeed({
        id: 'tmpl-modern-birthday',
        name: 'Modern Birthday',
        slug: 'modern-birthday',
        category: 'Birthday',
        description: 'High contrast electric teal and slate colors, sleek rounded cards, and immersive interactive photo sliders.',
        primary: '#06B6D4',
        secondary: '#0F172A',
        accent: '#F1F5F9',
        headingFont: 'Outfit',
        birthdayName: 'Isabella',
        desc: 'Join us for beats, neon tacos, and signature craft cocktails as we celebrate Isabella turning 25! Dress cool and casual.'
      }),
      // 13. KIDS PLAYFUL BIRTHDAY (Birthday)
      createTemplateSeed({
        id: 'tmpl-kids-birthday',
        name: 'Kids Playful Birthday',
        slug: 'kids-birthday',
        category: 'Birthday',
        description: 'Sweet pastel patterns, bouncing custom icons, soft balloon fonts, and custom details for children parties.',
        primary: '#EC4899',
        secondary: '#EFF6FF',
        accent: '#3B82F6',
        headingFont: 'Playfair Display', // Using available standard font
        birthdayName: 'Noah',
        desc: 'Clowns, colorful bounces, and sweet strawberries! Noah is turning 5, and we are hosting a major magic-themed backyard picnic adventure!'
      }),
      // 14. ELEGANT BIRTHDAY (Birthday)
      createTemplateSeed({
        id: 'tmpl-elegant-birthday',
        name: 'Elegant Birthday',
        slug: 'elegant-birthday',
        category: 'Birthday',
        description: 'Soft lavender, delicate silver divider elements, luxurious serif text headers, and custom dress code grids.',
        primary: '#8B5CF6',
        secondary: '#F9F5FF',
        accent: '#D8B4FE',
        headingFont: 'Playfair Display',
        birthdayName: 'Genevieve',
        desc: 'You are cordially invited to celebrate a refined afternoon high-tea garden soirée as we celebrate Genevieve’s golden year.'
      }),
      
      // 15. LUXURY ENGAGEMENT (Engagement)
      createTemplateSeed({
        id: 'tmpl-luxury-engagement',
        name: 'Luxury Engagement',
        slug: 'luxury-engagement',
        category: 'Engagement',
        description: 'Blush rose gold palette, elegant promise timelines, soft glassmorphic panels, and immersive proposals gallery views.',
        primary: '#EC4899',
        secondary: '#FFF5F5',
        accent: '#F472B6',
        headingFont: 'Cinzel',
        bride: 'Gabriella',
        groom: 'Nathan',
        desc: 'He asked, and she said of course! We are opening a registry and celebrating our promise to marry with an elegant rooftop engagement toast.'
      }),
      // 16. ROMANTIC ENGAGEMENT (Engagement)
      createTemplateSeed({
        id: 'tmpl-romantic-engagement',
        name: 'Romantic Engagement',
        slug: 'romantic-engagement',
        category: 'Engagement',
        description: 'Deep romantic crimson and velvety ivory templates with gorgeous love letter headers and emotional dynamic countdown clocks.',
        primary: '#BE123C',
        secondary: '#FFF1F2',
        accent: '#FDA4AF',
        headingFont: 'Playfair Display',
        bride: 'Camila',
        groom: 'Mateo',
        desc: 'We are taking the path together! Let us gather in a warm romance-drenched evening with wine pairing and romantic violin records.'
      }),
      // 17. MODERN ENGAGEMENT (Engagement)
      createTemplateSeed({
        id: 'tmpl-modern-engagement',
        name: 'Modern Engagement',
        slug: 'modern-engagement',
        category: 'Engagement',
        description: 'Electric violet highlights, glass panels, beautiful horizontal modern layouts, and real-time custom RSVP forms.',
        primary: '#6D28D9',
        secondary: '#F5F3FF',
        accent: '#C084FC',
        headingFont: 'Space Grotesk',
        bride: 'Chloe',
        groom: 'Elijah',
        desc: 'We are engaged! Join us as we lock our fingers and make this absolute official. Cocktails and modern synth beats included.'
      }),
      
      // 18. PREMIUM HOUSEWARMING (Housewarming)
      createTemplateSeed({
        id: 'tmpl-premium-housewarming',
        name: 'Premium Housewarming',
        slug: 'premium-housewarming',
        category: 'Housewarming',
        description: 'Warm dark walnut accents, soft champagne cream screens, map guides, and cozy fireplace-themed welcome graphics.',
        primary: '#78350F',
        secondary: '#FDFBF7',
        accent: '#D97706',
        headingFont: 'Outfit',
        desc: 'Our keys are here, and the threshold is ready! Join us in blessing our brand new dream estate with a warm grill and craft beers.',
        birthdayName: 'The Miller Family' // Treated as homeowner name
      }),
      // 19. MINIMAL HOUSEWARMING (Housewarming)
      createTemplateSeed({
        id: 'tmpl-minimal-housewarming',
        name: 'Minimal Housewarming',
        slug: 'minimal-housewarming',
        category: 'Housewarming',
        description: 'Incredibly sleek architectural concrete gray theme, thin hairline layouts, clean maps embedding, and modern gift-card checklists.',
        primary: '#1F2937',
        secondary: '#FAFAFA',
        accent: '#E5E7EB',
        headingFont: 'Space Grotesk',
        desc: 'We crossed the threshold! Come and explore our newly renovated mid-century modern home. No boxed presents, just warm greetings.',
        birthdayName: 'Lucas & Sofia'
      }),
      
      // 20. BUSINESS EVENT (Corporate)
      createTemplateSeed({
        id: 'tmpl-business-corporate',
        name: 'Business Event',
        slug: 'business-event',
        category: 'Corporate',
        description: 'Polished navy blue background grids, premium bronze key lines, speaker photo galleries, and corporate agenda sliders.',
        primary: '#1E3A8A',
        secondary: '#F8FAFC',
        accent: '#10B981',
        headingFont: 'Space Grotesk',
        desc: 'You are cordially invited to our executive annual leadership symposium, debating industrial automation, enterprise cloud security, and SaaS scaling.',
        birthdayName: 'Apex Enterprises'
      }),
      // 21. CONFERENCE INVITE (Corporate)
      createTemplateSeed({
        id: 'tmpl-conference-corporate',
        name: 'Conference Invite',
        slug: 'conference-invite',
        category: 'Corporate',
        description: 'Tech-forward deep dark blueprints with cyan grid overlays, dynamic interactive timeline calendars, and map guides.',
        primary: '#0891B2',
        secondary: '#0B0F19',
        accent: '#22D3EE',
        headingFont: 'Space Grotesk',
        desc: 'Global Innovation Conference 2026. Join over 500 tech delegates, engineers, and key developers discussing the future of Antigravity AI.',
        birthdayName: 'GIC 2026'
      }),
      // 22. PRODUCT LAUNCH INVITE (Corporate)
      createTemplateSeed({
        id: 'tmpl-product-launch',
        name: 'Product Launch Invite',
        slug: 'product-launch',
        category: 'Corporate',
        description: 'High stakes luxury tech launch layout in intense charcoal dark colors, dramatic neon margins, and video loops compatibility.',
        primary: '#EF4444',
        secondary: '#0A0A0A',
        accent: '#FCA5A5',
        headingFont: 'Outfit',
        desc: 'The veil is lifting. We are unveiling our newest line of spatial computers and carbon-neutral devices. Be among the first to trial the hardware.',
        birthdayName: 'Velo Technologies'
      }),
      
      // 23. BABY SHOWER (Baby Shower)
      createTemplateSeed({
        id: 'tmpl-baby-shower',
        name: 'Sweet Baby Shower',
        slug: 'baby-shower',
        category: 'Baby Shower',
        description: 'Cute cloud shapes, soft mint and strawberry fields palettes, and elegant customized family memory lanes grids.',
        primary: '#06B6D4',
        secondary: '#F0FDF4',
        accent: '#34D399',
        headingFont: 'Playfair Display',
        desc: 'A tiny heartbeat, a huge dream! Join us for sweets, balloon pop trivia, and happy predictions as we prepare for baby Oliver’s arrival.',
        birthdayName: 'Elena & Lucas'
      }),
      // 24. FESTIVAL PARTY (Festival)
      createTemplateSeed({
        id: 'tmpl-festival-party',
        name: 'Festival Party',
        slug: 'festival-party',
        category: 'Festival',
        description: 'Bright electric gold gradients over dark neon violet, music-waves visual details, and fully integrated RSVPs tracking grids.',
        primary: '#F59E0B',
        secondary: '#1E1B4B',
        accent: '#EC4899',
        headingFont: 'Space Grotesk',
        desc: 'Winter solstice forest campfire gathering. Music, dynamic light animations, artisanal pizzas, and outdoor acoustic loops.',
        birthdayName: 'Equinox Trails'
      })
    ];
    
    dbCache.templates = defaultTemplates;
    modified = true;
  }
  
  if (modified) {
    writeDB();
    console.log('Seeded database with default admin accounts and 24 epic templates!');
  }
}

// Helper to construct template structure beautifully with diverse backgrounds 
interface SeedParams {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  primary: string;
  secondary: string;
  accent: string;
  headingFont: string;
  bride?: string;
  groom?: string;
  birthdayName?: string;
  desc: string;
  backgroundType?: 'color' | 'gradient' | 'image' | 'video';
  backgroundValue?: string;
}

function createTemplateSeed(p: SeedParams): Template {
  const isWedding = p.category === 'Wedding' || p.id.includes('wedding') || p.id.includes('engagement');
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category,
    thumbnailUrl: getSampleThumbnail(p.category, p.id),
    description: p.description,
    theme: {
      colors: {
        primary: p.primary,
        secondary: p.secondary,
        accent: p.accent,
        text: p.secondary === '#FFFFFF' || p.secondary === '#FAFAFA' || p.secondary === '#FFFDF0' || p.secondary === '#FFFBEB' || p.secondary === '#F9F5FF' || p.secondary === '#FFF5F5' ? '#1F2937' : '#F1F5F9',
        background: p.secondary,
        button: p.primary,
        buttonText: p.primary === '#FFFFFF' ? '#111827' : '#FFFFFF',
        border: p.accent + '33', // 20% opacity using hex
        card: p.secondary === '#FFFFFF' || p.secondary === '#FAFAFA' || p.secondary === '#FFFDF0' || p.secondary === '#FFFBEB' || p.secondary === '#FAF5FF' || p.secondary === '#FFF5F5' ? '#F9FAFB' : '#1E293B'
      },
      fonts: {
        heading: p.headingFont,
        body: 'Inter',
        button: 'Inter'
      },
      layout: {
        spacing: 'normal',
        width: 'medium',
        borderRadius: 'lg',
        shadows: 'md',
        alignment: 'center'
      }
    },
    sections: [
      { id: 'hero', title: 'Welcome Greeting', enabled: true, order: 0 },
      { id: 'story', title: 'Our Story', enabled: isWedding, order: 1 },
      { id: 'schedule', title: 'Event Details', enabled: true, order: 2 },
      { id: 'timeline', title: 'Timeline Pacing', enabled: true, order: 3 },
      { id: 'gallery', title: 'Photo Gallery', enabled: true, order: 4 },
      { id: 'video', title: 'Event Trailer', enabled: true, order: 5 },
      { id: 'countdown', title: 'Countdown Clock', enabled: true, order: 6 },
      { id: 'custom', title: 'Additional Details', enabled: true, order: 7 },
      { id: 'rsvp', title: 'Attendance Form', enabled: true, order: 8 }
    ],
    content: {
      eventTitle: isWedding ? `${p.bride || 'A'} & ${p.groom || 'B'} Wedding` : (p.birthdayName ? `${p.birthdayName}'s Celebration` : p.name),
      dateText: 'Saturday, September 26, 2026',
      brideName: p.bride,
      groomName: p.groom,
      birthdayPersonName: p.birthdayName,
      eventDescription: p.desc,
      storyHeading: isWedding ? 'How We Met' : 'The Story of My Life',
      storyContent: isWedding 
        ? 'It started on a cold autumn evening in Paris. A single coffee spill at a rustic bakery, a laugh that lasted long past sunset, and three years of adventures around the globe brought us to this sacred moment. We cannot wait to celebrate our union with you.' 
        : 'A beautiful journey of growth, passion, and laughter. From childhood dreams to big career leaps, and most importantly, surrounding myself with the most radiant souls. I would be delighted to look back and toast with everyone who filled these years with light.',
      contactDetails: 'For questions, contact our event coordinator Helena at coord@inviteframe.com or call +1 (555) 304-2094.',
      familyInfo: 'Honorary Parents: Lord & Lady Sterling, Mr. & Mrs. Rajesh Kumar. We thank our families for making this dream reality.',
      giftInfo: 'Your warm presence is the absolute greatest gift. If you wish to bless us, a contribution toward our dream honeymoon flight via venmo: @invite-honeymoon would be deeply appreciated.',
      dressCode: isWedding ? 'Black-Tie Optional / High Formal Luxury Attire' : 'Smart Festive White and Pastel Gold Accents',
      customSections: [
        { id: 'custom-1', title: 'Dress Code Guideline', content: 'We invite our beloved friends and family to dress in warm color palettes: cream, apricot, golden taupe, rosewood, and sage green.' },
        { id: 'custom-2', title: 'Accommodation Details', content: 'A special hotel room block is reserved at the Grand Plaza Resort. Use booking reference code INVITEFRAME for a 20% discount on rooms.' }
      ],
      schedule: [
        {
          id: 'sched-1',
          title: isWedding ? 'Holy Matrimony Marriage Vows' : 'Welcome Mocktails & Arrivals',
          time: '3:00 PM - 4:30 PM',
          date: 'Sept 26, 2026',
          venue: 'St. Jude Cathedral Chapel',
          address: '428 Cathedral Pkwy, New York, NY 10025',
          mapsUrl: 'https://maps.app.goo.gl/StJudeChapel'
        },
        {
          id: 'sched-2',
          title: isWedding ? 'Elegant Sunset Dinner & Champagne Toasts' : 'Dinner Buffet & Dynamic Synth Beating Party',
          time: '6:00 PM - Midnight',
          date: 'Sept 26, 2026',
          venue: 'The Grand Alchemist Hall',
          address: '89 Mercer St, New York, NY 10012',
          mapsUrl: 'https://maps.app.goo.gl/AlchemistHall'
        }
      ],
      timeline: [
        { id: 'tl-1', time: '3:00 PM', title: 'Guest Sign-ins and Welcome Beats', description: 'Arrive at the beautiful cathedral lobby, enjoy ambient acoustic sets, and be seated.' },
        { id: 'tl-2', time: '3:30 PM', title: 'Sacred Ceremony under Arches', description: 'Walk down the aisle, exchange ring vows, and step out under floral confetti shower!' },
        { id: 'tl-3', time: '5:00 PM', title: 'Champagne Cocktail Sunset Hour', description: 'Sip on customized signature cocktails and take pictures in our garden photo booth.' },
        { id: 'tl-4', time: '6:30 PM', title: 'Grand Banquet Dining & First Dance', description: 'Candlelit dinner, heartwarming toasts from families, cut the towering cake, and dance the night away!' }
      ],
      vimeoUrl: '',
      youtubeUrl: 'https://www.youtube.com/watch?v=A8f9-4KymmY', // Standard placeholder
      trailerVideoUrl: '',
      rsvpHeading: 'Please Let Us Know If You Will Be Attending',
      rsvpSubheading: 'We would be delighted to celebrate with you. Kindly confirm your attendance below.',
      
      backgroundType: p.backgroundType || 'gradient',
      backgroundValue: p.backgroundValue || `linear-gradient(135deg, ${p.secondary} 0%, ${p.primary === '#FFFFFF' ? '#F3F4F6' : p.primary + '11'} 100%)`,
      bgOverlayOpacity: 0.1,
      bgBlur: 0,
      parallaxEnabled: false,
      glassmorphismEnabled: true
    },
    music: {
      tracks: [
        { id: 'built-in-ambient', title: 'Midnight Waltz (Acoustic Strings)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', builtIn: true },
        { id: 'built-in-love', title: 'Serenade of Hearts (Soft Piano)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', builtIn: true },
        { id: 'built-in-party', title: 'Retro Groove (Upbeat Synth)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', builtIn: true }
      ],
      defaultTrackId: 'built-in-ambient',
      autoplay: false,
      loop: true,
      controlsEnabled: true,
      volume: 0.5
    },
    gallery: {
      albums: [
        {
          id: 'album-default',
          name: 'The Happy Couple & Memories',
          items: [
            { id: 'g-1', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800', caption: 'Whispers in France gardens', order: 0 },
            { id: 'g-2', url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800', caption: 'The magical engagement night', order: 1 },
            { id: 'g-3', url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800', caption: 'Golden sunset laughters', order: 2 },
            { id: 'g-4', url: 'https://images.unsplash.com/photo-1519225495810-7512c696505a?w=800', caption: 'Companionship for life', order: 3 }
          ]
        }
      ]
    },
    countdown: {
      enabled: true,
      targetDate: '2026-09-26T15:00:00Z',
      style: 'classic'
    }
  };
}

function getSampleThumbnail(category: string, id: string): string {
  // Return attractive unsplash thumbnails based on themes
  switch (id) {
    case 'tmpl-royal-wedding':
      return 'https://images.unsplash.com/photo-1519741497674-611481863552?w=500';
    case 'tmpl-luxury-wedding':
      return 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=500';
    case 'tmpl-cinematic-wedding':
      return 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=500';
    case 'tmpl-modern-wedding':
      return 'https://images.unsplash.com/photo-1519225495810-7512c696505a?w=500';
    case 'tmpl-floral-wedding':
      return 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=500';
    case 'tmpl-minimal-wedding':
      return 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=500';
    case 'tmpl-destination-wedding':
      return 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=500';
    case 'tmpl-traditional-indian':
      return 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=500';
    case 'tmpl-south-indian':
      return 'https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?w=500';
    case 'tmpl-golden-wedding':
      return 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500';
    case 'tmpl-luxury-birthday':
      return 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=500';
    case 'tmpl-modern-birthday':
      return 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=500';
    case 'tmpl-kids-birthday':
      return 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500';
    case 'tmpl-elegant-birthday':
      return 'https://images.unsplash.com/photo-1464302286302-6d3dd1099139?w=500';
    case 'tmpl-luxury-engagement':
      return 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=500';
    case 'tmpl-romantic-engagement':
      return 'https://images.unsplash.com/photo-1510154221190-ff375f327993?w=500';
    case 'tmpl-modern-engagement':
      return 'https://images.unsplash.com/photo-1616166330003-8e5510444665?w=500';
    case 'tmpl-premium-housewarming':
      return 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=500';
    case 'tmpl-minimal-housewarming':
      return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500';
    case 'tmpl-business-corporate':
      return 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=500';
    case 'tmpl-conference-corporate':
      return 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500';
    case 'tmpl-product-launch':
      return 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=500';
    case 'tmpl-baby-shower':
      return 'https://images.unsplash.com/photo-1520121401995-928cd50d4e2b?w=500';
    case 'tmpl-festival-party':
      default:
      return 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=500';
  }
}
