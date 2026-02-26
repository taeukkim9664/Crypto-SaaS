export const rssSources = [
  {
    name: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
  },
  {
    name: "ODAILY - Newsflash",
    url: "https://rss.odaily.news/rss/newsflash",
  },
  {
    name: "ODAILY - Posts",
    url: "https://rss.odaily.news/rss/post",
  },
];

export const gnewsDefaults = {
  query: "crypto OR bitcoin OR ethereum",
  lang: process.env.GNEWS_LANG ?? "ko",
  country: process.env.GNEWS_COUNTRY ?? "kr",
  max: Number(process.env.GNEWS_MAX_PER_REQUEST ?? 20),
};
