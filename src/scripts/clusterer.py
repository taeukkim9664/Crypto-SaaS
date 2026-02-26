import os
from supabase import create_client, Client
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from sklearn.cluster import DBSCAN
import numpy as np

load_dotenv()

# Supabase 클라이언트 초기화
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# 문장 임베딩 모델 로드
model = SentenceTransformer('all-MiniLM-L6-v2')

def main():
    """클러스터링되지 않은 게시물을 가져와 클러스터링하고 이슈를 생성합니다."""
    print("Starting clustering process...")
    try:
        # 클러스터링되지 않고 처리된 게시물 조회
        response = supabase.table('posts').select('id, cleaned_content').eq('processed_for_clustering', True).is_('issue_id', 'is.null').execute()

        if not response.data or len(response.data) < 2:
            print("Not enough new posts to cluster.")
            return

        posts = response.data
        print(f"Found {len(posts)} posts to cluster.")

        # 임베딩 생성
        contents = [post['cleaned_content'] for post in posts if post['cleaned_content']]
        if not contents:
            print("No content to embed.")
            return
            
        embeddings = model.encode(contents, show_progress_bar=True)

        # DBSCAN 클러스터링 수행
        # eps: 두 샘플이 이웃으로 간주되기 위한 최대 거리
        # min_samples: 핵심 포인트로 간주될 포인트의 이웃 수
        dbscan = DBSCAN(eps=0.5, min_samples=2, metric='cosine')
        clusters = dbscan.fit_predict(np.array(embeddings))

        # 클러스터 결과 처리
        n_clusters = len(set(clusters)) - (1 if -1 in clusters else 0)
        print(f"Found {n_clusters} clusters.")

        for cluster_id in set(clusters):
            if cluster_id == -1:
                continue # -1은 노이즈 포인트

            # 클러스터에 속한 게시물들의 인덱스 가져오기
            indices = [i for i, label in enumerate(clusters) if label == cluster_id]

            # 새 이슈 생성
            # 클러스터의 첫 번째 게시물 제목을 임시 이슈 제목으로 사용
            issue_title = contents[indices[0]][:150] # 제목 길이 제한
            new_issue_res = supabase.table('issues').insert({'title': f"Issue: {issue_title}..."}).execute()
            new_issue_id = new_issue_res.data[0]['id']

            print(f"Created new issue {new_issue_id} for cluster {cluster_id}")

            # 게시물에 이슈 ID 업데이트
            post_ids_to_update = [posts[i]['id'] for i in indices]
            supabase.table('posts').update({'issue_id': new_issue_id}).in_('id', post_ids_to_update).execute()
            print(f"Updated {len(post_ids_to_update)} posts to be part of issue {new_issue_id}")

    except Exception as e:
        print(f"An error occurred during clustering: {e}")

if __name__ == "__main__":
    main()
