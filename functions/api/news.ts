import { XMLParser } from "fast-xml-parser";

type D1Database = {
  prepare: (query: string) => {
    bind: (...values: unknown[]) => {
      run: () => Promise<{ success: boolean }>;
      first: <T = unknown>() => Promise<T | null>;
      all: <T = unknown>() => Promise<{ results?: T[] }>;
    };
  };
};

type Env = {
  DB: D1Database;
  GNEWS_API_KEY?: string;
  GNEWS_LANG?: string;
  GNEWS_COUNTRY?: string;
  GNEWS_MAX_PER_REQUEST?: string;
  NEWS_CACHE_MINUTES?: string;
  NEWS_KEYWORDS?: string;
};

type NewsItem = {
  title: string;
  url: string;
  source: string;
  published_at: string | null;
  description: string | null;
};

const rssSources = [
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { name: "ODAILY - Newsflash", url: "https://rss.odaily.news/rss/newsflash" },
  { name: "ODAILY - Posts", url: "https://rss.odaily.news/rss/post" },
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  removeNSPrefix: true,
});

function normalizeItem(item: Partial<NewsItem>): NewsItem | null {
  if (!item.title || !item.url) return null;
  return {
    title: item.title.trim(),
    url: item.url.trim(),
    source: item.source ?? "Unknown",
    published_at: item.published_at ?? null,
    description: item.description ?? null,
  };
}

function isRelevant(item: NewsItem, env: Env) {
  const keywords = (env.NEWS_KEYWORDS ??
    "crypto,bitcoin,btc,ethereum,eth,altcoin,blockchain,defi,nft,web3,token,exchange,stablecoin,regulation,sec,etf,macro,economy,rate,interest,inflation,fx,usd,stock,market,비트코인,이더리움,암호화폐,가상자산,코인,블록체인,디파이,거시,경제,금리,인플레이션,환율,증시,시장")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const text = `${item.title} ${item.description ?? ""}`.toLowerCase();
  return keywords.some((keyword) => text.includes(keyword));
}

function coerceArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function readText(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const maybeText = (value as { "#text"?: string })["#text"];
    if (typeof maybeText === "string") return maybeText;
  }
  return null;
}

function extractRssItems(feed: any, sourceName: string): NewsItem[] {
  const results: NewsItem[] = [];
  const rssItems = coerceArray(feed?.rss?.channel?.item);
  for (const item of rssItems) {
    const normalized = normalizeItem({
      title: readText(item?.title) ?? "",
      url: readText(item?.link) ?? "",
      source: sourceName,
      published_at:
        readText(item?.isoDate) ??
        readText(item?.pubDate) ??
        readText(item?.published) ??
        null,
      description:
        readText(item?.contentSnippet) ??
        readText(item?.summary) ??
        readText(item?.description) ??
        readText(item?.content) ??
        null,
    });
    if (normalized) results.push(normalized);
  }
  return results;
}

function extractAtomItems(feed: any, sourceName: string): NewsItem[] {
  const results: NewsItem[] = [];
  const entries = coerceArray(feed?.feed?.entry);
  for (const entry of entries) {
    const links = coerceArray(entry?.link);
    const href =
      readText(entry?.link?.href) ??
      readText(links.find((link) => link?.rel === "alternate")?.href) ??
      readText(links[0]?.href) ??
      readText(entry?.link) ??
      "";

    const normalized = normalizeItem({
      title: readText(entry?.title) ?? "",
      url: href,
      source: sourceName,
      published_at:
        readText(entry?.updated) ??
        readText(entry?.published) ??
        readText(entry?.pubDate) ??
        null,
      description:
        readText(entry?.summary) ??
        readText(entry?.content) ??
        readText(entry?.description) ??
        null,
    });
    if (normalized) results.push(normalized);
  }
  return results;
}

async function fetchRssItems(env: Env): Promise<NewsItem[]> {
  const results: NewsItem[] = [];

  await Promise.all(
    rssSources.map(async (source) => {
      try {
        const res = await fetch(source.url, {
          headers: { "User-Agent": "crypto-saas-news/1.0" },
        });
        if (!res.ok) return;
        const xml = await res.text();
        const parsed = parser.parse(xml);
        const items = [
          ...extractRssItems(parsed, source.name),
          ...extractAtomItems(parsed, source.name),
        ].filter((item) => isRelevant(item, env));
        results.push(...items);
      } catch (error) {
        console.error(`[RSS] Failed: ${source.name}`, error);
      }
    })
  );

  return results;
}

async function fetchGNewsItems(env: Env): Promise<NewsItem[]> {
  const apiKey = env.GNEWS_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    q: "crypto OR bitcoin OR ethereum",
    lang: env.GNEWS_LANG ?? "ko",
    country: env.GNEWS_COUNTRY ?? "kr",
    max: String(env.GNEWS_MAX_PER_REQUEST ?? 20),
    token: apiKey,
  });

  const url = `https://gnews.io/api/v4/search?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[GNews] HTTP ${res.status}`);
    return [];
  }

  const data = (await res.json()) as {
    articles?: Array<{
      title: string;
      description?: string;
      url: string;
      publishedAt?: string;
      source?: { name?: string };
    }>;
  };

  return (data.articles ?? [])
    .map((article) =>
      normalizeItem({
        title: article.title,
        url: article.url,
        source: article.source?.name ?? "GNews",
        published_at: article.publishedAt ?? null,
        description: article.description ?? null,
      })
    )
    .filter((item): item is NewsItem => Boolean(item))
    .filter((item) => isRelevant(item, env));
}

function dedupe(items: NewsItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

async function refreshNews(env: Env) {
  const items = dedupe([...(await fetchRssItems(env)), ...(await fetchGNewsItems(env))]);
  if (items.length === 0) return;

  const stmt = env.DB.prepare(
    `INSERT OR IGNORE INTO news_items
      (title, url, source, published_at, description)
      VALUES (?1, ?2, ?3, ?4, ?5)`
  );

  for (const item of items) {
    await stmt.bind(
      item.title,
      item.url,
      item.source,
      item.published_at,
      item.description
    ).run();
  }

  await env.DB.prepare(
    "INSERT INTO news_meta(key, value) VALUES(?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  )
    .bind("last_fetch", new Date().toISOString())
    .run();
}

async function shouldRefresh(env: Env) {
  const cacheMinutes = Number(env.NEWS_CACHE_MINUTES ?? 10);
  const row = await env.DB.prepare(
    "SELECT value FROM news_meta WHERE key = ?1"
  )
    .bind("last_fetch")
    .first<{ value: string }>();

  if (!row?.value) return true;
  const elapsed = Date.now() - new Date(row.value).getTime();
  return elapsed > cacheMinutes * 60 * 1000;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const force = url.searchParams.get("refresh") === "1";

  if (force || (await shouldRefresh(context.env))) {
    await refreshNews(context.env);
  }

  const rows = await context.env.DB.prepare(
    `SELECT id, title, url, source, published_at, description, summary,
            title_ko, description_ko, summary_ko
     FROM news_items
     ORDER BY published_at DESC
     LIMIT ?1`
  )
    .bind(60)
    .all();

  return new Response(JSON.stringify({ items: rows.results ?? [] }), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
