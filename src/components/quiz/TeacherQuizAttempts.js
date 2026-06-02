import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function TeacherQuizAttempts() {
  const { roomId, quizId } = useParams();
  const navigate = useNavigate();
  const { apiRequest } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const safeDateTime = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError('');

        const quizResp = await apiRequest(`/api/quizzes/${quizId}`);
        const q = quizResp?.quiz || quizResp;
        setQuiz(q);

        const attemptsResp = await apiRequest(`/api/quizzes/${quizId}/attempts`);
        const rows = Array.isArray(attemptsResp) ? attemptsResp : (attemptsResp?.attempts || []);
        setAttempts(rows);
      } catch (e) {
        setError(e?.message || 'Failed to load attempts');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading attempts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button className="btn btn-primary" onClick={() => navigate(`/room/${roomId}/manage-quizzes`)}>
            Back to Quiz Management
          </button>
        </div>
      </div>
    );
  }

  const completed = attempts.filter(a => (a.status || a.status) === 'completed');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quiz Attempts</h1>
              <p className="text-gray-600">{quiz?.title}</p>
            </div>
            <button className="btn btn-secondary" onClick={() => navigate(`/room/${roomId}/manage-quizzes`)}>
              Back
            </button>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Completed Attempts ({completed.length})
            </h2>
          </div>

          {completed.length === 0 ? (
            <p className="text-sm text-gray-600">No students have submitted this quiz yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 rounded">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Student</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Email</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Score</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Points</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Submitted</th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {completed.map((a) => {
                    const submittedAt = a.submitted_at || a.submittedAt;
                    const earned = a.earned_points || a.earnedPoints || a.points || 0;
                    const total = a.total_points || a.totalPoints || quiz?.total_points || quiz?.totalPoints || 0;
                    return (
                      <tr key={a.id} className="border-t border-gray-200">
                        <td className="p-3 text-sm text-gray-800">{a.student_name || a.studentName || '—'}</td>
                        <td className="p-3 text-sm text-gray-600">{a.student_email || a.studentEmail || '—'}</td>
                        <td className="p-3 text-sm text-gray-800">{a.score ?? '—'}%</td>
                        <td className="p-3 text-sm text-gray-800">{earned} / {total}</td>
                        <td className="p-3 text-sm text-gray-600">{safeDateTime(submittedAt)}</td>
                        <td className="p-3 text-right">
                          <button
                            className="btn btn-secondary text-sm"
                            onClick={() => navigate(`/room/${roomId}/quiz/${quizId}/attempts/${a.id}`)}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeacherQuizAttempts;

