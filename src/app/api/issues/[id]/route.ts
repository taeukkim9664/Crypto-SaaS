import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: 'Issue ID is required' }, { status: 400 });
  }

  try {
    // 특정 이슈와 관련된 모든 정보를 가져옵니다.
    const { data: issueData, error: issueError } = await supabase
      .from('issues')
      .select(`
        id,
        title,
        importance_score,
        summaries ( summary_ko, summary_en )
      `)
      .eq('id', id)
      .single();

    if (issueError) {
      console.error('Error fetching issue details:', issueError);
      return NextResponse.json({ error: 'Failed to fetch issue details' }, { status: 500 });
    }
    
    if (!issueData) {
        return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    // 해당 이슈에 속한 게시물들을 가져옵니다.
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('id, url, content, source_post_id, sources ( name )')
      .eq('issue_id', id);

    if (postsError) {
      console.error('Error fetching posts for the issue:', postsError);
      return NextResponse.json({ error: 'Failed to fetch posts for the issue' }, { status: 500 });
    }

    // 최종 응답 데이터를 조합합니다.
    const responseData = {
      ...issueData,
      summary_ko: issueData.summaries && issueData.summaries[0] ? issueData.summaries[0].summary_ko : 'N/A',
      summary_en: issueData.summaries && issueData.summaries[0] ? issueData.summaries[0].summary_en : 'N/A',
      posts: postsData,
    };
    // `summaries` 배열은 더 이상 필요 없으므로 제거합니다.
    delete responseData.summaries;

    return NextResponse.json(responseData);

  } catch (err) {
    console.error('An unexpected error occurred:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
