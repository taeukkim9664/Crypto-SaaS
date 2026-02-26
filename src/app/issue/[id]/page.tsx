"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Post {
  id: number;
  url: string;
  content: string;
  source_post_id: string;
  sources: { name: string } | null;
}

interface IssueDetails {
  id: number;
  title: string;
  importance_score: number;
  summary_ko: string;
  summary_en: string;
  posts: Post[];
}

export default function IssueDetailPage() {
  const params = useParams();
  const id = params.id;
  const [issue, setIssue] = useState<IssueDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const fetchIssueDetails = async () => {
        try {
          const res = await fetch(`/api/issues/${id}`);
          if (!res.ok) {
            throw new Error('Failed to fetch issue details');
          }
          const data = await res.json();
          setIssue(data);
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      };

      fetchIssueDetails();
    }
  }, [id]);

  if (loading) {
    return <p className="text-center text-white mt-10">Loading issue details...</p>;
  }

  if (!issue) {
    return <p className="text-center text-white mt-10">Issue not found.</p>;
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <header className="p-4 bg-gray-800 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
           <Link href="/" className="text-cyan-400 hover:text-cyan-300">&larr; Back to Issues</Link>
           <h1 className="text-2xl font-bold text-center text-cyan-400">{issue.title}</h1>
           <span className={`text-3xl font-bold ${issue.importance_score > 90 ? 'text-green-400' : 'text-yellow-400'}`}>
              {issue.importance_score}
           </span>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        {/* Summaries Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">English Summary</h2>
            <p className="text-gray-300 whitespace-pre-wrap">{issue.summary_en}</p>
          </div>
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">Korean Summary</h2>
            <p className="text-gray-300 whitespace-pre-wrap">{issue.summary_ko}</p>
          </div>
        </div>

        {/* Original Posts Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-6">Original Posts</h2>
          <div className="space-y-4">
            {issue.posts.map(post => (
              <div key={post.id} className="bg-gray-800 p-4 rounded-lg shadow">
                <p className="text-gray-400 mb-2">{post.content}</p>
                <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:underline">
                  View original post from {post.sources?.name || 'source'}
                </a>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
