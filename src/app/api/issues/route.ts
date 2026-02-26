import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    // issues와 summaries 테이블을 조인하여 데이터를 가져옵니다.
    const { data, error } = await supabase
      .from('issues')
      .select(`
        id,
        title,
        importance_score,
        summaries ( summary_en )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching issues:', error);
      return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 });
    }

    // API 응답 형식에 맞게 데이터를 변환합니다.
    const formattedIssues = data.map(issue => ({
      id: issue.id,
      title: issue.title,
      score: issue.importance_score,
      // `summaries`는 배열일 수 있으므로 첫 번째 요소를 확인합니다.
      summary: issue.summaries && issue.summaries[0] ? issue.summaries[0].summary_en : 'Summary not available.',
    }));

    return NextResponse.json(formattedIssues);

  } catch (err) {
    console.error('An unexpected error occurred:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
