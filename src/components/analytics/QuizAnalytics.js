import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Utility function to normalize room ID for comparison
const normalizeRoomId = (id) => {
  if (typeof id === 'string') {
    const parsed = parseInt(id);
    return isNaN(parsed) ? id : parsed;
  }
  return id;
};

function QuizAnalytics() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState({
    totalQuizzes: 0,
    totalStudents: 0,
    averageScore: 0,
    completionRate: 0,
    quizResults: [],
    studentPerformance: []
  });
  const [loading, setLoading] = useState(true);

  const { apiRequest } = useAuth();

  const [coGroups, setCoGroups] = useState(null);

  useEffect(() => {
    let mounted = true;
    const buildCO = async () => {
      // Prefer backend aggregations
      if (analytics.coAggregations) {
        const arr = Object.entries(analytics.coAggregations).map(([co, val]) => ({ co, value: Math.round(val) }));
        if (mounted) setCoGroups(arr);
        return;
      }

      try {
        const qres = await apiRequest(`/api/quizzes/rooms/${roomId}`);
        const quizzes = qres.quizzes || qres || [];
        const groups = {};
        quizzes.forEach(q => {
          (q.questions || []).forEach(qn => {
            const co = qn.courseOutcome || 'Unspecified';
            if (!groups[co]) groups[co] = 1;
            else groups[co]++;
          });
        });
        const arr = Object.keys(groups).map(co => ({ co, value: analytics.averageScore || 0 }));
        if (mounted) setCoGroups(arr);
      } catch (e) {
        try {
          const quizzes = JSON.parse(localStorage.getItem('campusca_quizzes') || '[]')
            .filter(q => q.roomId === Number(roomId) || q.roomId === roomId);
          const groups = {};
          quizzes.forEach(q => {
            (q.questions || []).forEach(qn => {
              const co = qn.courseOutcome || 'Unspecified';
              if (!groups[co]) groups[co] = 1;
              else groups[co]++;
            });
          });
          const arr = Object.keys(groups).map(co => ({ co, value: analytics.averageScore || 0 }));
          if (mounted) setCoGroups(arr);
        } catch (le) {
          if (mounted) setCoGroups([]);
        }
      }
    };

    buildCO();
    return () => { mounted = false; };
  }, [analytics, roomId, apiRequest]);

  useEffect(() => {
    let mounted = true;
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        // Primary: fetch analytics from backend
        const res = await apiRequest(`/api/analytics/rooms/${roomId}`);
        if (mounted && res) {
          // support both shapes:
          // 1) { quizResults: [...], studentPerformance: [...] }
          // 2) { analytics: { quizResults: [...], studentPerformance: [...], ... } }
          const payload = res.analytics ? res.analytics : res;
          const hasResults = Array.isArray(payload.quizResults) || Array.isArray(payload.studentPerformance);
          if (hasResults) {
            setAnalytics({
              totalQuizzes: payload.totalQuizzes || 0,
              totalStudents: payload.totalStudents || 0,
              averageScore: payload.averageScore || 0,
              completionRate: payload.completionRate || 0,
              quizResults: payload.quizResults || [],
              studentPerformance: payload.studentPerformance || [],
              coAggregations: payload.coAggregations || null,
              bloomAggregations: payload.bloomAggregations || null
            });
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        // fall through to local fallback
        // console.warn('Analytics API fetch failed, falling back to local calculation', err);
      }

      // Fallback: compute analytics from localStorage (keeps app functional when backend unavailable)
      try {
        const quizzes = JSON.parse(localStorage.getItem('campusca_quizzes') || '[]');
        const normalizedRoomId = normalizeRoomId(roomId);
        const roomQuizzes = quizzes.filter(q => normalizeRoomId(q.roomId) === normalizedRoomId);

        const quizResults = JSON.parse(localStorage.getItem('campusca_quiz_results') || '[]');
        const roomResults = quizResults.filter(r => normalizeRoomId(r.roomId) === normalizedRoomId);

        const studentRooms = JSON.parse(localStorage.getItem('campusca_student_rooms') || '[]');
        const roomStudents = studentRooms.filter(sr => normalizeRoomId(sr.roomId) === normalizedRoomId && sr.status === 'active');

        const totalQuizzes = roomQuizzes.length;
        const totalStudents = roomStudents.length;
        const averageScore = roomResults.length > 0
          ? Math.round(roomResults.reduce((sum, r) => sum + r.score, 0) / roomResults.length)
          : 0;

        const totalPossibleCompletions = totalQuizzes * totalStudents;
        const actualCompletions = roomResults.length;
        const completionRate = totalPossibleCompletions > 0
          ? Math.round((actualCompletions / totalPossibleCompletions) * 100)
          : 0;

        const studentPerformance = roomStudents.map(student => {
          const studentResults = roomResults.filter(r => r.studentId === student.studentId);
          const avgScore = studentResults.length > 0
            ? Math.round(studentResults.reduce((sum, r) => sum + r.score, 0) / studentResults.length)
            : 0;
          return {
            studentName: student.studentName,
            studentEmail: student.studentEmail,
            quizzesCompleted: studentResults.length,
            averageScore: avgScore,
            totalPoints: studentResults.reduce((sum, r) => sum + (r.points || 0), 0)
          };
        });

        if (mounted) {
          setAnalytics({
            totalQuizzes,
            totalStudents,
            averageScore,
            completionRate,
            quizResults: roomResults,
            studentPerformance
          });
        }
      } catch (e) {
        if (mounted) {
          setAnalytics(prev => prev);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAnalytics();
    return () => { mounted = false; };
  }, [roomId, apiRequest]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Quiz Analytics</h1>
              <p className="text-gray-600">Track student performance and quiz statistics</p>
            </div>
            <button
              onClick={() => navigate(`/room-details/${roomId}`)}
              className="btn btn-secondary"
            >
              Back to Room
            </button>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Quizzes</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalQuizzes}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Students</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalStudents}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.averageScore}%</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.completionRate}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Quiz Results */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Recent Quiz Results</h2>
            {analytics.quizResults.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-2">📊</div>
                <p className="text-gray-600">No quiz results yet</p>
                <p className="text-sm text-gray-500">Results will appear here once students start taking quizzes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.quizResults
                  .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
                  .slice(0, 5)
                  .map(result => (
                    <div key={result.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{result.studentName}</p>
                        <p className="text-sm text-gray-600">{result.quizName}</p>
                        <p className="text-xs text-gray-500">{new Date(result.completedAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${
                          result.score >= 80 ? 'text-green-600' : 
                          result.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {result.score}%
                        </p>
                        <p className="text-xs text-gray-500">{result.points} points</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Student Performance */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Student Performance</h2>
            {analytics.studentPerformance.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-2">👥</div>
                <p className="text-gray-600">No students in this room yet</p>
                <p className="text-sm text-gray-500">Student performance will appear here once they join and take quizzes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.studentPerformance
                  .sort((a, b) => b.averageScore - a.averageScore)
                  .map((student, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{student.studentName}</p>
                        <p className="text-sm text-gray-600">{student.quizzesCompleted} quiz{student.quizzesCompleted !== 1 ? 'es' : ''} completed</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${
                          student.averageScore >= 80 ? 'text-green-600' : 
                          student.averageScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {student.averageScore}%
                        </p>
                        <p className="text-xs text-gray-500">{student.totalPoints} points</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Quiz Performance Chart */}
        <div className="mt-8">
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Quiz Performance Overview</h2>
            {analytics.quizResults.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📈</div>
                <p className="text-gray-600">No quiz results yet</p>
                <p className="text-sm text-gray-500">Performance charts will appear here once students start taking quizzes</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Score Distribution Chart */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Score Distribution</h3>
                  <div className="space-y-3">
                    {(() => {
                      const scoreRanges = [
                        { label: '90-100%', min: 90, max: 100, color: 'bg-green-500' },
                        { label: '80-89%', min: 80, max: 89, color: 'bg-blue-500' },
                        { label: '70-79%', min: 70, max: 79, color: 'bg-yellow-500' },
                        { label: '60-69%', min: 60, max: 69, color: 'bg-orange-500' },
                        { label: '0-59%', min: 0, max: 59, color: 'bg-red-500' }
                      ];
                      
                      const distribution = scoreRanges.map(range => {
                        const count = analytics.quizResults.filter(r => 
                          r.score >= range.min && r.score <= range.max
                        ).length;
                        return { ...range, count };
                      });
                      
                      const maxCount = Math.max(...distribution.map(d => d.count), 1);
                      
                      return distribution.map(range => (
                        <div key={range.label} className="flex items-center gap-4">
                          <div className="w-24 text-sm font-medium text-gray-700">{range.label}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div 
                                className={`${range.color} h-8 rounded transition-all`}
                                style={{ width: `${(range.count / maxCount) * 100}%` }}
                              ></div>
                              <span className="text-sm font-medium text-gray-700 w-12">{range.count}</span>
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Recent Performance Trend */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Recent Quiz Results Trend</h3>
                  <div className="h-64 flex items-end justify-between gap-2">
                    {analytics.quizResults
                      .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))
                      .slice(-10)
                      .map((result, index) => {
                        const height = (result.score / 100) * 100;
                        return (
                          <div key={result.id} className="flex-1 flex flex-col items-center gap-2">
                            <div className="w-full flex flex-col items-center">
                              <div
                                className={`w-full rounded-t transition-all ${
                                  result.score >= 80 ? 'bg-green-500' : 
                                  result.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ height: `${height}%`, minHeight: '4px' }}
                                title={`${result.score}% - ${new Date(result.completedAt).toLocaleDateString()}`}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500 transform -rotate-45 origin-top-left whitespace-nowrap">
                              {new Date(result.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Average Scores by Quiz */}
                {(() => {
                  const quizGroups = {};
                  analytics.quizResults.forEach(result => {
                    if (!quizGroups[result.quizId]) {
                      quizGroups[result.quizId] = {
                        quizName: result.quizName,
                        scores: []
                      };
                    }
                    quizGroups[result.quizId].scores.push(result.score);
                  });

                  const quizAverages = Object.entries(quizGroups).map(([quizId, data]) => ({
                    quizId,
                    quizName: data.quizName,
                    averageScore: Math.round(data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length),
                    count: data.scores.length
                  }));

                  if (quizAverages.length === 0) return null;

                  return (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Average Score by Quiz</h3>
                      <div className="space-y-3">
                        {quizAverages.map(quiz => (
                          <div key={quiz.quizId}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-gray-700 truncate flex-1">
                                {quiz.quizName}
                              </span>
                              <span className="text-sm font-bold text-gray-900 ml-2">
                                {quiz.averageScore}%
                              </span>
                              <span className="text-xs text-gray-500 ml-2">
                                ({quiz.count} attempt{quiz.count !== 1 ? 's' : ''})
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4">
                              <div
                                className={`h-4 rounded-full transition-all ${
                                  quiz.averageScore >= 80 ? 'bg-green-500' : 
                                  quiz.averageScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${quiz.averageScore}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* CO and Bloom Aggregations */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* By Course Outcome */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Performance by Course Outcome</h2>
            {analytics.quizResults.length === 0 ? (
              <p className="text-gray-600 text-sm">No data yet</p>
            ) : (
              <div className="space-y-3">
                {coGroups == null ? (
                  <div className="text-sm text-gray-500">Loading course outcome aggregations…</div>
                ) : coGroups.length === 0 ? (
                  <div className="text-sm text-gray-500">No course outcome data available</div>
                ) : (
                  coGroups.map((g) => (
                    <div key={g.co} className="flex justify-between items-center">
                      <span className="text-sm text-gray-700 truncate mr-2">{g.co}</span>
                      <span className="text-sm font-bold text-gray-900">{g.value}%</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          {/* By Bloom's */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Performance by Bloom's Level</h2>
            {analytics.quizResults.length === 0 ? (
              <p className="text-gray-600 text-sm">No data yet</p>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const levels = ['remember','understand','apply','analyze','evaluate','create'];
                  return levels.map(level => (
                    <div key={level} className="flex justify-between items-center">
                      <span className="text-sm text-gray-700 capitalize">{level}</span>
                      <span className="text-sm font-bold text-gray-900">{analytics.averageScore}%</span>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuizAnalytics;
