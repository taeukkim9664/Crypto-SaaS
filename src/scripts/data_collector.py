import os
import argparse
import tweepy
import feedparser
from supabase import create_client, Client
from dotenv import load_dotenv
import re
from datetime import datetime
import time

load_dotenv()

# Supabase 클라이언트 초기화
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# 트위터 API 클라이언트 초기화
bearer_token = os.environ.get("TWITTER_BEARER_TOKEN")
twitter_client = tweepy.Client(bearer_token)

def get_user_id_from_url(url: str) -> str:
    """트위터 URL에서 사용자 아이디를 추출합니다."""
    match = re.search(r"twitter\.com/(\w+)", url)
    if match:
        return match.group(1)
    return None

def fetch_from_x(source_id: int, account_url: str):
    """지정된 X 계정에서 최신 트윗을 가져와 posts 테이블에 저장합니다."""
    print(f"Fetching tweets from {account_url}")
    username = get_user_id_from_url(account_url)
    if not username:
        print(f"Invalid Twitter URL: {account_url}")
        return

    try:
        user = twitter_client.get_user(username=username)
        if not user.data:
            print(f"Could not find user: {username}")
            return

        user_id = user.data.id
        response = twitter_client.get_users_tweets(id=user_id, max_results=20, tweet_fields=["created_at"])

        if not response.data:
            print(f"No tweets found for user: {username}")
            return

        for tweet in response.data:
            existing_post = supabase.table('posts').select("id").eq('source_post_id', str(tweet.id)).execute()
            if len(existing_post.data) > 0:
                print(f"Tweet {tweet.id} already exists. Skipping.")
                continue

            post_data = {
                'source_id': source_id,
                'source_post_id': str(tweet.id),
                'content': tweet.text,
                'posted_at': tweet.created_at.isoformat(),
                'url': f"https://twitter.com/{username}/status/{tweet.id}"
            }
            supabase.table('posts').insert(post_data).execute()
            print(f"Inserted tweet {tweet.id} from {username}")

    except Exception as e:
        print(f"An error occurred while fetching tweets for {username}: {e}")

def fetch_from_rss(source_id: int, feed_url: str):
    """지정된 RSS 피드에서 최신 게시물을 가져와 posts 테이블에 저장합니다."""
    print(f"Fetching posts from RSS feed: {feed_url}")
    try:
        feed = feedparser.parse(feed_url)
        for entry in feed.entries:
            post_id = entry.get('id', entry.link)
            
            existing_post = supabase.table('posts').select("id").eq('source_post_id', post_id).execute()
            if len(existing_post.data) > 0:
                print(f"Post '{entry.title}' already exists. Skipping.")
                continue

            content = entry.get('summary', '')
            if hasattr(entry, 'content'):
                # HTML 콘텐츠의 첫 번째 값을 사용
                content = entry.content[0].value

            posted_at_parsed = entry.get('published_parsed', time.gmtime())
            posted_at = datetime.fromtimestamp(time.mktime(posted_at_parsed)).isoformat()

            post_data = {
                'source_id': source_id,
                'source_post_id': post_id,
                'content': f"{entry.title}\n\n{content}",
                'posted_at': posted_at,
                'url': entry.link
            }
            supabase.table('posts').insert(post_data).execute()
            print(f"Inserted post '{entry.title}' from {feed_url}")

    except Exception as e:
        print(f"An error occurred while fetching RSS feed {feed_url}: {e}")

def main():
    parser = argparse.ArgumentParser(description="Collect data from various sources.")
    parser.add_argument("--source", type=str, required=True, choices=['x', 'rss'], help="The data source type to collect from.")
    args = parser.parse_args()

    if args.source == 'x':
        sources = supabase.table('sources').select('id, url').eq('type', 'x_account').execute()
        for source in sources.data:
            fetch_from_x(source['id'], source['url'])
    elif args.source == 'rss':
        sources = supabase.table('sources').select('id, url').eq('type', 'rss').execute()
        for source in sources.data:
            fetch_from_rss(source['id'], source['url'])

if __name__ == "__main__":
    main()
