import { NextResponse } from "next/server";
import { getLatestNews, maybeRefreshNews, refreshNews } from "@/lib/newsIngest";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("refresh") === "1";

  if (force) {
    await refreshNews();
  } else {
    await maybeRefreshNews();
  }

  const items = await getLatestNews(60);
  return NextResponse.json({ items });
}
