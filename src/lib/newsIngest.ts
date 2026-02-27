import Parser from "rss-parser";
import OpenAI from "openai";
import { getDb, getMeta, setMeta } from "./db";
import { gnewsDefaults, rssSources } from "./newsSources";

export type NewsItem = {
  title: string;
  url: string;
  source: string;
  publishedAt: string | null;
  description: string | null;
};

const parser = new Parser();

function normalizeItem(item: Partial<NewsItem>): NewsItem | null {
  if (!item.title || !item.url) return null;
  return {
    title: item.title.trim(),
    url: item.url.trim(),
    source: item.source ?? "Unknown",
    publishedAt: item.publishedAt ?? null,
    description: item.description ?? null,
  };
}

function isRelevant(item: NewsItem) {
  const keywords = (process.env.NEWS_KEYWORDS ??
    "crypto,bitcoin,btc,ethereum,eth,altcoin,blockchain,defi,nft,web3,token,exchange,stablecoin,regulation,sec,etf,macro,economy,rate,interest,inflation,fx,usd,stock,market,비트코인,이더리움,암호화폐,가상자산,코인,블록체인,디파이,거시,경제,금리,인플레이션,환율,증시,시장")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const text = `${item.title} ${item.description ?? ""}`.toLowerCase();
  return keywords.some((keyword) => text.includes(keyword));
}

async function fetchRssItems(): Promise<NewsItem[]> {
  const results: NewsItem[] = [];

  await Promise.all(
    rssSources.map(async (source) => {
      try {
        const feed = await parser.parseURL(source.url);
        feed.items.forEach((item) => {
          const normalized = normalizeItem({
            title: item.title ?? "",
            url: item.link ?? "",
            source: source.name,
            publishedAt: item.isoDate ?? item.pubDate ?? null,
            description:
              item.contentSnippet ?? item.summary ?? item.content ?? null,
          });
          if (normalized && isRelevant(normalized)) results.push(normalized);
        });
      } catch (error) {
        console.error(`[RSS] Failed: ${source.name}`, error);
      }
    })
  );

  return results;
}

async function fetchGNewsItems(): Promise<NewsItem[]> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    q: gnewsDefaults.query,
    lang: gnewsDefaults.lang,
    country: gnewsDefaults.country,
    max: String(gnewsDefaults.max),
    token: apiKey,
  });

  const url = `https://gnews.io/api/v4/search?${params.toString()}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
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
        publishedAt: article.publishedAt ?? null,
        description: article.description ?? null,
      })
    )
    .filter((item): item is NewsItem => Boolean(item))
    .filter(isRelevant);
}

function dedupe(items: NewsItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

async function storeItems(items: NewsItem[]) {
  const db = await getDb();
  const stmt = await db.prepare(
    `INSERT OR IGNORE INTO news_items
      (title, url, source, published_at, description)
      VALUES (?, ?, ?, ?, ?)`
  );

  try {
    for (const item of items) {
      await stmt.run(
        item.title,
        item.url,
        item.source,
        item.publishedAt,
        item.description
      );
    }
  } finally {
    await stmt.finalize();
  }
}

function hasKorean(text: string | null | undefined) {
  if (!text) return false;
  return /[가-힣]/.test(text);
}

async function translateLatest() {
  const enabled = (process.env.TRANSLATE_ENABLED ?? "true") === "true";
  const apiKey = process.env.OPENAI_API_KEY;
  if (!enabled || !apiKey) return;

  const max = Number(process.env.TRANSLATE_MAX_PER_REQUEST ?? 6);
  const model = process.env.OPENAI_MODEL ?? "gpt-5";

  const db = await getDb();
  const rows = (await db.all(
    `SELECT id, title, description, title_ko, description_ko
     FROM news_items
     WHERE (title_ko IS NULL OR description_ko IS NULL)
     ORDER BY published_at DESC
     LIMIT ?`,
    max
  )) as Array<{
    id: number;
    title: string;
    description: string | null;
    title_ko: string | null;
    description_ko: string | null;
  }>;

  if (rows.length === 0) return;

  const client = new OpenAI({ apiKey });

  for (const row of rows) {
    const needsTitle = !row.title_ko && !hasKorean(row.title);
    const needsDesc =
      !row.description_ko && row.description && !hasKorean(row.description);

    if (!needsTitle && !needsDesc) continue;

    const input = [
      "다음 텍스트를 자연스러운 한국어로 번역하세요.",
      "고유명사/티커는 원문을 유지하세요.",
      "출력 형식은 두 줄만 사용하세요.",
      "TITLE: (번역된 제목)",
      "DESC: (번역된 설명, 없으면 빈 문자열)",
      "",
      `TITLE: ${row.title}`,
      `DESC: ${row.description ?? ""}`,
    ].join("\n");

    try {
      const response = await client.responses.create({
        model,
        input,
      });
      const text = response.output_text ?? "";
      const lines = text.split("\n");
      const titleLine = lines.find((line) => line.startsWith("TITLE:"));
      const descLine = lines.find((line) => line.startsWith("DESC:"));

      const translatedTitle = titleLine
        ? titleLine.replace("TITLE:", "").trim()
        : null;
      const translatedDesc = descLine
        ? descLine.replace("DESC:", "").trim()
        : null;

      await db.run(
        `UPDATE news_items
         SET title_ko = COALESCE(title_ko, ?),
             description_ko = COALESCE(description_ko, ?)
         WHERE id = ?`,
        needsTitle ? translatedTitle : row.title_ko,
        needsDesc ? translatedDesc : row.description_ko,
        row.id
      );
    } catch (error) {
      console.error("[Translate] Failed", error);
    }
  }
}

async function summarizeLatest() {
  const enabled = (process.env.SUMMARY_ENABLED ?? "true") === "true";
  const apiKey = process.env.OPENAI_API_KEY;
  if (!enabled || !apiKey) return;

  const max = Number(process.env.SUMMARY_MAX_PER_REQUEST ?? 6);
  const model = process.env.OPENAI_MODEL ?? "gpt-5";

  const db = await getDb();
  const rows = (await db.all(
    `SELECT id, title, description
     FROM news_items
     WHERE summary_ko IS NULL
     ORDER BY published_at DESC
     LIMIT ?`,
    max
  )) as Array<{
    id: number;
    title: string;
    description: string | null;
    title_ko: string | null;
    description_ko: string | null;
  }>;

  if (rows.length === 0) return;

  const client = new OpenAI({ apiKey });

  for (const row of rows) {
    const title = row.title_ko ?? row.title;
    const description = row.description_ko ?? row.description ?? "";
    const input = `다음 제목과 설명을 바탕으로 1~2문장 한국어 요약을 작성하세요.\n\n제목: ${title}\n설명: ${description}`;
    try {
      const response = await client.responses.create({
        model,
        input,
      });
      const summary = response.output_text?.trim();
      if (summary) {
        await db.run(
          "UPDATE news_items SET summary_ko = ? WHERE id = ?",
          summary,
          row.id
        );
      }
    } catch (error) {
      console.error("[Summary] Failed", error);
    }
  }
}

export async function refreshNews() {
  const items = dedupe([
    ...(await fetchRssItems()),
    ...(await fetchGNewsItems()),
  ]);

  await storeItems(items);
  await setMeta("last_fetch", new Date().toISOString());
  await translateLatest();
  await summarizeLatest();
}

export async function getLatestNews(limit = 50) {
  const db = await getDb();
  const rows = await db.all(
    `SELECT id, title, url, source, published_at, description, summary,
            title_ko, description_ko, summary_ko
     FROM news_items
     ORDER BY published_at DESC
     LIMIT ?`,
    limit
  );
  return rows;
}

export async function maybeRefreshNews() {
  const cacheMinutes = Number(process.env.NEWS_CACHE_MINUTES ?? 10);
  const lastFetch = await getMeta("last_fetch");
  if (!lastFetch) {
    await refreshNews();
    return;
  }

  const elapsed = Date.now() - new Date(lastFetch).getTime();
  if (elapsed > cacheMinutes * 60 * 1000) {
    await refreshNews();
  }
}
