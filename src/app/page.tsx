"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Issue {
  id: number;
  title: string;
  score: number;
  summary: string;
}

export default function DashboardPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const res = await fetch('/api/issues');
        const data = await res.json();
        setIssues(data);
      } catch (error) {
        console.error('Failed to fetch issues:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIssues();
  }, []);

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <header className="p-4 bg-gray-800 shadow-md">
        <h1 className="text-3xl font-bold text-center text-cyan-400">Crypto Auto-Researcher</h1>
      </header>

      <main className="p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Latest Issues</h2>
          {/* 필터 버튼은 여기에 추가될 수 있습니다. */}
        </div>

        {loading ? (
          <p className="text-center">Loading issues...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {issues.map((issue) => (
              <div key={issue.id} className="bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-cyan-500/50 transition-shadow duration-300">
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold mb-2">{issue.title}</h3>
                  <span className={`text-2xl font-bold ${issue.score > 90 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {issue.score}
                  </span>
                </div>
                <p className="text-gray-400 mt-4">{issue.summary}</p>
                <Link href={`/issue/${issue.id}`} className="text-cyan-400 hover:text-cyan-300 mt-4 inline-block">
                  Read more &rarr;
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
