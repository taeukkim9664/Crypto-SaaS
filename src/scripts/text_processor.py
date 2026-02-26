import os
import re
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Supabase 클라이언트 초기화
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

def clean_text(text: str) -> str:
    """URL, 멘션, 해시태그, 특수문자를 제거하여 텍스트를 정제합니다."""
    # URL 제거
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    # 멘션 및 해시태그 제거
    text = re.sub(r'@[\w_]+', '', text)
    text = re.sub(r'#[\w_]+', '', text)
    # HTML 태그 제거
    text = re.sub(r'<.*?>', '', text)
    # 특수문자 및 숫자 제거 (선택적)
    text = re.sub(r'[^A-Za-z\s]', '', text)
    # 다중 공백을 단일 공백으로 변환
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def main():
    """처리되지 않은 게시물을 가져와 텍스트를 정제하고 DB를 업데이트합니다."""
    print("Starting text processing...")
    try:
        # 처리되지 않은 게시물 조회
        response = supabase.table('posts').select('id, content').eq('processed_for_clustering', False).execute()
        
        if not response.data:
            print("No new posts to process.")
            return

        print(f"Found {len(response.data)} posts to process.")

        for post in response.data:
            post_id = post['id']
            original_content = post['content']
            
            # 텍스트 정제
            cleaned_content = clean_text(original_content)
            
            # Supabase 업데이트
            update_data = {
                'cleaned_content': cleaned_content,
                'processed_for_clustering': True
            }
            supabase.table('posts').update(update_data).eq('id', post_id).execute()
            print(f"Processed and updated post ID: {post_id}")

    except Exception as e:
        print(f"An error occurred during text processing: {e}")

if __name__ == "__main__":
    main()
