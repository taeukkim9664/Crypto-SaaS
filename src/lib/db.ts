import path from "path";
import fs from "fs";
import sqlite3 from "sqlite3";
import { open, type Database } from "sqlite";

let dbPromise: Promise<Database> | null = null;

export async function getDb() {
  if (!dbPromise) {
    const dataDir = path.join(process.cwd(), "data");
    fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = path.join(dataDir, "news.db");
    dbPromise = open({ filename: dbPath, driver: sqlite3.Database });
  }

  const db = await dbPromise;
  await db.exec("PRAGMA journal_mode = WAL;");
  await db.exec(`
    CREATE TABLE IF NOT EXISTS news_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      source TEXT,
      published_at TEXT,
      description TEXT,
      summary TEXT,
      title_ko TEXT,
      description_ko TEXT,
      summary_ko TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_news_published ON news_items(published_at);

    CREATE TABLE IF NOT EXISTS news_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const columns = (await db.all(
    "PRAGMA table_info(news_items)"
  )) as Array<{ name: string }>;
  const columnNames = new Set(columns.map((col) => col.name));

  const addColumn = async (name: string, type: string) => {
    if (!columnNames.has(name)) {
      await db.exec(`ALTER TABLE news_items ADD COLUMN ${name} ${type}`);
      columnNames.add(name);
    }
  };

  await addColumn("title_ko", "TEXT");
  await addColumn("description_ko", "TEXT");
  await addColumn("summary_ko", "TEXT");
  return db;
}

export async function getMeta(key: string) {
  const db = await getDb();
  const row = await db.get<{ value: string }>(
    "SELECT value FROM news_meta WHERE key = ?",
    key
  );
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string) {
  const db = await getDb();
  await db.run(
    "INSERT INTO news_meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    key,
    value
  );
}
