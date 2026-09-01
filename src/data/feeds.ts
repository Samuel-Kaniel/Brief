import { Category, FeedSource } from '../types';

export const CATEGORIES: Category[] = [
  {
    id: 'technology',
    label: 'Technology',
    description: 'General tech news, gadgets, and industry moves',
  },
  {
    id: 'ai_ml',
    label: 'AI / ML / Computer Vision / NLP',
    description: 'Machine learning research and AI industry news',
  },
  {
    id: 'system_design',
    label: 'System Design',
    description: 'Engineering architecture and large-scale systems',
  },
  {
    id: 'politics',
    label: 'Politics',
    description: 'National and world politics',
  },
  {
    id: 'finance',
    label: 'Finance',
    description: 'Markets, business, and economic news',
  },
  {
    id: 'science',
    label: 'Science',
    description: 'Scientific discovery and research',
  },
  {
    id: 'health',
    label: 'Health',
    description: 'Health, medicine, and wellness news',
  },
  {
    id: 'education',
    label: 'Education',
    description: 'Teaching, learning, and edtech news',
  },
];

// All sources are free, public RSS feeds. No API key required.
export const FEED_SOURCES: FeedSource[] = [
  // Technology
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', category: 'technology' },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', category: 'technology' },

  // AI / ML / Computer Vision / NLP
  { name: 'arXiv cs.LG (Machine Learning)', url: 'https://export.arxiv.org/rss/cs.LG', category: 'ai_ml' },
  { name: 'arXiv cs.CV (Computer Vision)', url: 'https://export.arxiv.org/rss/cs.CV', category: 'ai_ml' },
  { name: 'arXiv cs.CL (NLP)', url: 'https://export.arxiv.org/rss/cs.CL', category: 'ai_ml' },

  // System Design
  { name: 'High Scalability', url: 'https://feeds.feedburner.com/HighScalability', category: 'system_design' },
  { name: 'Netflix Tech Blog', url: 'https://netflixtechblog.com/feed', category: 'system_design' },
  { name: 'AWS Architecture Blog', url: 'https://aws.amazon.com/blogs/architecture/feed/', category: 'system_design' },

  // Politics
  { name: 'BBC News - Politics', url: 'https://feeds.bbci.co.uk/news/politics/rss.xml', category: 'politics' },
  { name: 'NPR - Politics', url: 'https://feeds.npr.org/1014/rss.xml', category: 'politics' },
  { name: 'Slashdot - Politics', url: 'https://politics.slashdot.org/politics.rss', category: 'politics' },

  // Finance
  { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex', category: 'finance' },
  { name: 'WSJ - Markets', url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml', category: 'finance' },

  // Science
  { name: 'ScienceDaily - Top Science', url: 'https://www.sciencedaily.com/rss/top/science.xml', category: 'science' },
  { name: 'NASA', url: 'https://www.nasa.gov/feed/', category: 'science' },

  // Health
  { name: 'ScienceDaily - Health', url: 'https://www.sciencedaily.com/rss/top/health.xml', category: 'health' },
  { name: 'NPR - Health', url: 'https://feeds.npr.org/1128/rss.xml', category: 'health' },

  // Education
  { name: 'EdSource', url: 'https://www.edsource.org/feed', category: 'education' },
  { name: 'The Hechinger Report', url: 'https://hechingerreport.org/feed/', category: 'education' },
  { name: 'NPR - Education', url: 'https://feeds.npr.org/1013/rss.xml', category: 'education' },
  { name: 'K-12 Dive', url: 'https://www.k12dive.com/feeds/news/', category: 'education' },
];
