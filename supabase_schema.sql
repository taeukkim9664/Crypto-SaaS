-- Supabase DB Schema for Crypto Auto-Research Web App

-- 1. Data Sources Table
CREATE TABLE sources (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL, -- X account URL or RSS feed URL
    type TEXT NOT NULL, -- 'x_account' or 'rss'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Issues Table (Clustered)
CREATE TABLE issues (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    importance_score INT NOT NULL DEFAULT 0, -- 0-100 score
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Posts Table
CREATE TABLE posts (
    id BIGSERIAL PRIMARY KEY,
    source_id BIGINT REFERENCES sources(id) ON DELETE CASCADE,
    issue_id BIGINT REFERENCES issues(id) ON DELETE CASCADE, -- Link to a clustered issue
    source_post_id TEXT NOT NULL, -- Unique ID from the source (e.g., Tweet ID)
    content TEXT NOT NULL,
    cleaned_content TEXT, -- For storing processed text for clustering
    url TEXT,
    posted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_for_clustering BOOLEAN DEFAULT FALSE,
    UNIQUE(source_id, source_post_id) -- Ensure no duplicate posts from the same source
);

-- 4. Summaries Table
CREATE TABLE summaries (
    id BIGSERIAL PRIMARY KEY,
    issue_id BIGINT UNIQUE REFERENCES issues(id) ON DELETE CASCADE,
    summary_ko TEXT, -- Korean summary
    summary_en TEXT, -- English summary
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RPC Function to get issues needing summarization
CREATE OR REPLACE FUNCTION get_issues_without_summary()
RETURNS TABLE(id BIGINT, title TEXT)
AS $$
BEGIN
    RETURN QUERY
    SELECT i.id, i.title
    FROM issues i
    LEFT JOIN summaries s ON i.id = s.issue_id
    WHERE s.id IS NULL;
END; $$ LANGUAGE plpgsql;

-- Initial Data: Default X Accounts and RSS Feeds
INSERT INTO sources (name, url, type) VALUES
    ('Vitalik Buterin', 'https://twitter.com/VitalikButerin', 'x_account'),
    ('CoinDesk', 'https://twitter.com/CoinDesk', 'x_account'),
    ('The Block', 'https://www.theblockcrypto.com/rss.xml', 'rss'),
    ('Bankless', 'https://www.bankless.com/rss', 'rss');
