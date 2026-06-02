import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function TeacherAttemptDetail() {
  const { roomId, quizId, attemptId } = useParams();
  const navigate = useNavigate();
  const { apiRequest } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await apiRequest(`/api/quizzes/${quizId}/attempts/${attemptId}`);
        setData(res);
      } catch (e) {
        setError(e?.message || 'Failed to load attempt details');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId, attemptId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading attempt...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Attempt not found'}</p>
          <button className="btn btn-primary" onClick={() => navigate(`/room/${roomId}/quiz/${quizId}/attempts`)}>
            Back to Attempts
          </button>
        </div>
      </div>
    );
  }

  const quiz = data.quiz;
  const attempt = data.attempt;
  const questionReview = data.questionReview || [];

  const safeDateTime = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
  };

  const normalizeTrueFalseIndex = (value) => {
    // App convention: 0 => True, 1 => False
    if (typeof value === 'boolean') return value ? 0 : 1;
    if (typeof value === 'number') return value === 0 ? 0 : 1;
    if (typeof value === 'string') {
      const raw = value.trim().toLowerCase();
      if (raw === '0' || raw === 'true') return 0;
      if (raw === '1' || raw === 'false') return 1;
    }
    return 1;
  };

  const formatTf = (v) => {
    return normalizeTrueFalseIndex(v) === 0 ? 'True' : 'False';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Attempt Details</h1>
              <p className="text-gray-600">{quiz?.title}</p>
            </div>
            <button className="btn btn-secondary" onClick={() => navigate(`/room/${roomId}/quiz/${quizId}/attempts`)}>
              Back
            </button>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Student</h2>
          <p className="text-gray-800">{attempt?.studentName} ({attempt?.studentEmail})</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
            <div><span className="text-gray-500">Score:</span> <span className="font-medium">{attempt?.score}%</span></div>
            <div><span className="text-gray-500">Points:</span> <span className="font-medium">{attempt?.earnedPoints} / {attempt?.totalPoints}</span></div>
            <div><span className="text-gray-500">Started:</span> <span className="font-medium">{safeDateTime(attempt?.startedAt)}</span></div>
            <div><span className="text-gray-500">Submitted:</span> <span className="font-medium">{safeDateTime(attempt?.submittedAt)}</span></div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Question Review</h2>
          <div className="space-y-4">
            {questionReview.map((q, idx) => (
              <div key={q.questionId} className="p-4 border rounded bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-gray-900">Q{idx + 1}. {q.question}</div>
                  <div className="text-sm text-gray-700">{q.earnedPoints}/{q.points} pts</div>
                </div>
                <div className="text-sm text-gray-600 mb-2">Status: {q.status}</div>

                {q.type === 'multiple-choice' && (
                  <div className="text-sm space-y-2">
                    <div>
                      <div className="text-gray-700 font-medium">Student answer</div>
                      <div className="p-2 border rounded bg-gray-50">
                        {q.options?.[Number(q.studentResponse)] ?? '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-700 font-medium">Correct answer</div>
                      <div className="p-2 border rounded bg-green-50 border-green-200">
                        {q.options?.[Number(q.correctAnswer)] ?? '—'}
                      </div>
                    </div>
                  </div>
                )}

                {q.type === 'true-false' && (
                  <div className="text-sm space-y-2">
                    <div>
                      <div className="text-gray-700 font-medium">Student answer</div>
                      <div className="p-2 border rounded bg-gray-50">{q.studentResponse == null ? '—' : formatTf(q.studentResponse)}</div>
                    </div>
                    <div>
                      <div className="text-gray-700 font-medium">Correct answer</div>
                      <div className="p-2 border rounded bg-green-50 border-green-200">{formatTf(q.correctAnswer)}</div>
                    </div>
                  </div>
                )}

                {q.type === 'short-answer' && (
                  <div className="text-sm space-y-2">
                    <div>
                      <div className="text-gray-700 font-medium">Student answer</div>
                      <div className="p-2 border rounded bg-gray-50 whitespace-pre-wrap">{q.studentResponse || '—'}</div>
                    </div>
                    <div className="text-gray-500">Short-answer is auto-scored by exact text match.</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeacherAttemptDetail;

