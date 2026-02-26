import os
import openai
from supabase import create_client, Client
from dotenv import load_dotenv
import json

load_dotenv()

# 클라이언트 초기화
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

openai.api_key = os.environ.get("OPENAI_API_KEY")

def get_issues_without_summary():
    """요약이 없는 이슈 목록을 가져옵니다."""
    response = supabase.rpc('get_issues_without_summary', {}).execute()
    return response.data

def get_posts_for_issue(issue_id: int):
    """특정 이슈에 대한 모든 게시물을 가져옵니다."""
    response = supabase.table('posts').select('cleaned_content').eq('issue_id', issue_id).execute()
    return [post['cleaned_content'] for post in response.data if post['cleaned_content']]

def summarize_text(text: str):
    """OpenAI API를 사용하여 텍스트를 요약하고 제목을 생성합니다."""
    if not text.strip():
        print("Content is empty, skipping summarization.")
        return None

    prompt = f"""You are an expert crypto analyst. Based on the following collection of posts, please perform two tasks:

1.  Generate a concise, descriptive title for the main topic or event discussed. The title should be in English.
2.  Provide a summary of the key information in both English and Korean.

Here is the text to analyze:
---
{text}
---

Please format your response as a JSON object with the following keys: "title", "summary_en", "summary_ko"."""

    try:
        client = openai.OpenAI()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant designed to output JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"An error occurred with OpenAI API: {e}")
        return None

def main():
    """요약이 없는 이슈를 찾아 요약을 생성하고 DB를 업데이트합니다."""
    print("Starting summarization process...")
    
    # Supabase에 RPC 함수가 필요합니다. 스키마에 추가해야 합니다.
    # 이 함수는 `issues` 테이블과 `summaries` 테이블을 LEFT JOIN하여
    # `summaries.issue_id`가 NULL인 이슈를 찾습니다.
    # CREATE OR REPLACE FUNCTION get_issues_without_summary()
    # RETURNS TABLE(id BIGINT, title TEXT)
    # AS $$
    # BEGIN
    #     RETURN QUERY
    #     SELECT i.id, i.title
    #     FROM issues i
    #     LEFT JOIN summaries s ON i.id = s.issue_id
    #     WHERE s.id IS NULL;
    # END; $$ LANGUAGE plpgsql;

    try:
        # `get_issues_without_summary` RPC 함수 호출로 변경 필요
        # 임시로 모든 이슈를 가져오는 로직 사용
        issues_res = supabase.table('issues').select('id, title').execute()
        summaries_res = supabase.table('summaries').select('issue_id').execute()
        summarized_issue_ids = {s['issue_id'] for s in summaries_res.data}
        
        issues_to_process = [i for i in issues_res.data if i['id'] not in summarized_issue_ids]

        if not issues_to_process:
            print("No new issues to summarize.")
            return

        print(f"Found {len(issues_to_process)} issues to summarize.")

        for issue in issues_to_process:
            issue_id = issue['id']
            print(f"Processing issue {issue_id}...")

            posts_content = get_posts_for_issue(issue_id)
            full_text = "\n\n".join(posts_content)

            summary_data = summarize_text(full_text)

            if summary_data:
                # 요약 정보 삽입
                supabase.table('summaries').insert({
                    'issue_id': issue_id,
                    'summary_ko': summary_data['summary_ko'],
                    'summary_en': summary_data['summary_en']
                }).execute()

                # 이슈 제목 업데이트
                supabase.table('issues').update({'title': summary_data['title']}).eq('id', issue_id).execute()
                print(f"Successfully summarized and updated issue {issue_id} with title: {summary_data['title']}")

    except Exception as e:
        print(f"An error occurred during summarization main loop: {e}")

if __name__ == "__main__":
    main()
