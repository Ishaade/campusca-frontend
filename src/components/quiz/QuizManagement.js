import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function QuizManagement() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { apiRequest } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const safeDate = (value, withTime = false) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return withTime ? d.toLocaleString() : d.toLocaleDateString();
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const roomQuizzesResp = await apiRequest(`/api/quizzes/rooms/${roomId}`);
        const roomQuizzes = (roomQuizzesResp && (Array.isArray(roomQuizzesResp.quizzes) ? roomQuizzesResp.quizzes : Array.isArray(roomQuizzesResp) ? roomQuizzesResp : [])) || [];

        const quizzesWithStats = await Promise.all((roomQuizzes || []).map(async (quiz) => {
          let attempts = [];
          try {
            const res = await apiRequest(`/api/quizzes/${quiz.id}/attempts`);
            attempts = Array.isArray(res) ? res : (res.attempts || []);
            // normalize attempts to camelCase for easier handling
            attempts = attempts.map(a => ({
              ...a,
              completedAt: a.submitted_at || a.submittedAt || null,
              points: a.earned_points || a.earnedPoints || a.points || 0
            }));
          } catch (e) {
            attempts = [];
          }

          const quizResults = attempts;
          const averageScore = quizResults.length > 0
            ? Math.round(quizResults.reduce((sum, r) => sum + (r.score || 0), 0) / quizResults.length)
            : 0;
          const validTakenTimestamps = quizResults
            .map(r => new Date(r.completedAt).getTime())
            .filter(ts => Number.isFinite(ts));
          const lastTaken = validTakenTimestamps.length > 0
            ? Math.max(...validTakenTimestamps)
            : null;

          return {
            ...quiz,
            scheduledStart: quiz.scheduledStart || quiz.scheduled_start,
            scheduledEnd: quiz.scheduledEnd || quiz.scheduled_end,
            createdAt: quiz.createdAt || quiz.created_at,
            timeLimit: quiz.timeLimit || quiz.time_limit,
            totalPoints: quiz.totalPoints || quiz.total_points,
            questions: Array.isArray(quiz.questions) ? quiz.questions : [],
            completionCount: quizResults.length,
            averageScore,
            lastTaken
          };
        }));

        setQuizzes(quizzesWithStats);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const handleDeleteQuiz = (quizId) => {
    if (window.confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      // Delete via API
      (async () => {
        try {
          await apiRequest(`/api/quizzes/${quizId}`, { method: 'DELETE' });
          // refresh list
          const updated = quizzes.filter(q => q.id !== quizId);
          setQuizzes(updated);
        } catch (err) {
          console.error(err);
          alert('Failed to delete quiz: ' + (err.message || 'Unknown error'));
        }
      })();
    }
  };

  const handleEditQuiz = (quizId) => {
    navigate(`/room/${roomId}/edit-quiz/${quizId}`);
  };

  const handleViewAttempts = (quizId) => {
    navigate(`/room/${roomId}/quiz/${quizId}/attempts`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading quizzes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quiz Management</h1>
              <p className="text-gray-600">Manage quizzes for this room</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/room/${roomId}/create-quiz`)}
                className="btn btn-primary"
              >
                Create New Quiz
              </button>
              <button
                onClick={() => navigate(`/room-details/${roomId}`)}
                className="btn btn-secondary"
              >
                Back to Room
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {quizzes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No quizzes created yet</h3>
            <p className="text-gray-600 mb-4">Create your first quiz to get started with assessments.</p>
            <button
              onClick={() => navigate(`/room/${roomId}/create-quiz`)}
              className="btn btn-primary"
            >
              Create Your First Quiz
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {quizzes.map(quiz => (
              <div key={quiz.id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{quiz.title}</h3>
                    {quiz.description && (
                      <p className="text-gray-600 mb-3">{quiz.description}</p>
                    )}
                    {/* Schedule Badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {quiz.scheduledStart && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">
                          Starts: {safeDate(quiz.scheduledStart, true)}
                        </span>
                      )}
                      {quiz.scheduledEnd && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                          Ends: {safeDate(quiz.scheduledEnd, true)}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Questions:</span>
                        <span className="ml-1 font-medium">{quiz.questions.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Time Limit:</span>
                        <span className="ml-1 font-medium">{quiz.timeLimit} min</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Total Points:</span>
                        <span className="ml-1 font-medium">{quiz.totalPoints}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <span className={`ml-1 font-medium ${
                          quiz.status === 'draft' ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {quiz.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEditQuiz(quiz.id)}
                      className="btn btn-secondary text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleViewAttempts(quiz.id)}
                      className="btn btn-secondary text-sm"
                    >
                      Results
                    </button>
                    <button
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      className="btn btn-secondary text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                {/* Quiz Stats */}
                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Completions:</span>
                      <span className="ml-1 font-medium">{quiz.completionCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Average Score:</span>
                      <span className={`ml-1 font-medium ${
                        quiz.averageScore >= 80 ? 'text-green-600' : 
                        quiz.averageScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {quiz.averageScore}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <span className="ml-1 font-medium">{safeDate(quiz.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Last Taken:</span>
                      <span className="ml-1 font-medium">
                        {quiz.lastTaken ? safeDate(quiz.lastTaken) : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default QuizManagement;
