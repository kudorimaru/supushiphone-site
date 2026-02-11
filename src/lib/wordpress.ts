const WP_URL = import.meta.env.WP_URL || 'https://your-site.wordpress.com';
const API_BASE = `${WP_URL}/wp-json/wp/v2`;

export interface WPPost {
  id: number;
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  date: string;
  modified: string;
  featured_media: number;
  categories: number[];
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
      alt_text: string;
    }>;
    'wp:term'?: Array<Array<{
      id: number;
      name: string;
      slug: string;
    }>>;
  };
}

export interface WPCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export async function getPosts(params: {
  perPage?: number;
  page?: number;
  categories?: number[];
} = {}): Promise<{ posts: WPPost[]; totalPages: number }> {
  const { perPage = 12, page = 1, categories } = params;
  const searchParams = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
    _embed: 'true',
    orderby: 'date',
    order: 'desc',
  });

  if (categories?.length) {
    searchParams.set('categories', categories.join(','));
  }

  try {
    const res = await fetch(`${API_BASE}/posts?${searchParams}`);
    if (!res.ok) return { posts: [], totalPages: 0 };

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return { posts: [], totalPages: 0 };

    const posts: WPPost[] = await res.json();
    const totalPages = Number(res.headers.get('X-WP-TotalPages') || 1);
    return { posts, totalPages };
  } catch {
    return { posts: [], totalPages: 0 };
  }
}

export async function getPostBySlug(slug: string): Promise<WPPost | null> {
  try {
    const res = await fetch(`${API_BASE}/posts?slug=${slug}&_embed=true`);
    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;

    const posts: WPPost[] = await res.json();
    return posts[0] || null;
  } catch {
    return null;
  }
}

export async function getAllSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const res = await fetch(`${API_BASE}/posts?per_page=100&page=${page}&_fields=slug`);
      if (!res.ok) break;

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) break;

      const posts: Array<{ slug: string }> = await res.json();
      slugs.push(...posts.map((p) => p.slug));

      const totalPages = Number(res.headers.get('X-WP-TotalPages') || 1);
      hasMore = page < totalPages;
      page++;
    } catch {
      break;
    }
  }

  return slugs;
}

export async function getCategories(): Promise<WPCategory[]> {
  try {
    const res = await fetch(`${API_BASE}/categories?per_page=100&hide_empty=true`);
    if (!res.ok) return [];

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return [];

    return res.json();
  } catch {
    return [];
  }
}

export function getFeaturedImageUrl(post: WPPost): string | null {
  return post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null;
}

export function getCategoryNames(post: WPPost): string[] {
  return post._embedded?.['wp:term']?.[0]?.map((t) => t.name) || [];
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}
