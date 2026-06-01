import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// (ID normalization handled elsewhere)

function QuizResults() {
  const { roomId, quizId } = useParams();
  const { user, apiRequest } = useAuth();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [result, setResult] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Validate parameters
    if (!roomId || !quizId) {
      setError('Invalid room or quiz ID');
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        // fetch quiz (API may return { status, quiz } or the quiz directly)
        const fetchedQuizResp = await apiRequest(`/api/quizzes/${quizId}`);
        const fetchedQuiz = (fetchedQuizResp && (fetchedQuizResp.quiz ? fetchedQuizResp.quiz : fetchedQuizResp)) || null;
        if (!fetchedQuiz) {
          setError('Quiz not found');
          return;
        }

        // normalize questions (may be JSON string) and snake_case -> camelCase where helpful
        if (typeof fetchedQuiz.questions === 'string') {
          try { fetchedQuiz.questions = JSON.parse(fetchedQuiz.questions); } catch (e) { fetchedQuiz.questions = []; }
        }
        if (!Array.isArray(fetchedQuiz.questions)) fetchedQuiz.questions = fetchedQuiz.questions || [];

        setQuiz(fetchedQuiz);

        // fetch room info (optional, for roomCode)
        try {
          const fetchedRoom = await apiRequest(`/api/rooms/${roomId}`);
          if (fetchedRoom?.code) setRoomCode(fetchedRoom.code);
        } catch (e) {
          // ignore; room code is optional
        }

        // fetch attempts for this quiz
        let attempts = [];
        try {
          const res = await apiRequest(`/api/quizzes/${quizId}/attempts`);
          attempts = Array.isArray(res) ? res : (res.attempts || []);
          // normalize attempts to use camelCase and easier shapes
          attempts = attempts.map(a => {
            const normalized = { ...a };
            // unify timestamps
            normalized.completedAt = a.submitted_at || a.submittedAt || a.submittedAt || a.submitted_at;
            normalized.startedAt = a.started_at || a.startedAt || a.started_at;
            // unify earned points/points
            normalized.points = a.earned_points || a.earnedPoints || a.points || 0;
            normalized.elapsedSeconds = a.elapsed_seconds || a.elapsedSeconds || a.elapsed_seconds || null;
            // answers may be stored as array [{questionId,response}] or as object map
            if (Array.isArray(a.answers)) {
              const map = {};
              a.answers.forEach(item => { if (item && item.questionId) map[item.questionId] = item.response; });
              normalized.answers = map;
            }
            return normalized;
          });
        } catch (e) {
          attempts = [];
        }

        // find latest attempt by this user
        const userAttempts = attempts.filter(a => String(a.studentId || a.student_id) === String(user?.id));
        if (userAttempts.length === 0) {
          setError('Quiz result not found');
          return;
        }
        const latest = userAttempts[userAttempts.length - 1];
        setResult(latest);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to load quiz result');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [quizId, roomId, user?.id]);

  const getQuestionResult = (question) => {
    const userAnswer = result?.answers ? result.answers[question.id] : null;
    let isCorrect = false;
    let pointsEarned = 0;

    if (question.type === 'multiple-choice' || question.type === 'true-false') {
      isCorrect = parseInt(userAnswer) === question.correctAnswer;
      pointsEarned = isCorrect ? question.points : 0;
    } else if (question.type === 'short-answer') {
      // For short answer, check if answer was provided
      isCorrect = userAnswer && userAnswer.trim().length > 0;
      pointsEarned = isCorrect ? question.points : 0;
    }

    return { isCorrect, pointsEarned, userAnswer };
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !quiz || !result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Quiz or result not found'}</p>
          {roomCode ? (
            <button
              onClick={() => navigate(`/room/${roomCode}`)}
              className="btn btn-primary"
            >
              Back to Room
            </button>
          ) : (
            <button
              onClick={() => navigate('/student')}
              className="btn btn-primary"
            >
              Back to Dashboard
            </button>
          )}
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
              <h1 className="text-2xl font-bold text-gray-900">Quiz Results</h1>
              <p className="text-gray-600">{quiz.title}</p>
            </div>
            {roomCode ? (
              <button
                onClick={() => navigate(`/room/${roomCode}`)}
                className="btn btn-secondary"
              >
                Back to Room
              </button>
            ) : (
              <button
                onClick={() => navigate('/student')}
                className="btn btn-secondary"
              >
                Back to Dashboard
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          {/* Score Summary */}
          <div className="card mb-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">
                {result.score >= 80 ? '🎉' : result.score >= 60 ? '👍' : '📚'}
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Score: {result.score}%</h2>
              <p className="text-gray-600">
                {result.points} out of {quiz.totalPoints || quiz.total_points || quiz.questions.reduce((sum, q) => sum + (q.points || 1), 0)} points
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{result.score}%</div>
                <div className="text-sm text-blue-800">Final Score</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">
                  {quiz.questions.filter((q, idx) => {
                    const res = getQuestionResult(q);
                    return res.isCorrect;
                  }).length}/{quiz.questions.length}
                </div>
                <div className="text-sm text-green-800">Correct Answers</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">{result.points}</div>
                <div className="text-sm text-purple-800">Points Earned</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {formatTime(result.elapsedSeconds || result.timeSpent || 0)}
                  </div>
                <div className="text-sm text-yellow-800">Time Taken</div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Completed on</span>
                <span>{new Date(result.completedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Question Review */}
          <div className="card">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Question Review</h3>
            <div className="space-y-6">
              {quiz.questions.map((question, index) => {
                const questionResult = getQuestionResult(question);
                return (
                  <div
                    key={question.id}
                    className={`p-4 rounded-lg border-2 ${
                      questionResult.isCorrect
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-gray-900">Question {index + 1}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            questionResult.isCorrect
                              ? 'bg-green-200 text-green-800'
                              : 'bg-red-200 text-red-800'
                          }`}>
                            {questionResult.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                          </span>
                          <span className="text-sm text-gray-500">
                            {questionResult.pointsEarned}/{question.points} points
                          </span>
                        </div>
                        <p className="text-gray-900 font-medium mb-3">{question.question}</p>
                      </div>
                    </div>

                    {question.type === 'multiple-choice' && (
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Your Answer:</p>
                          <div className="p-2 bg-white rounded border">
                            {question.options[parseInt(questionResult.userAnswer)] || 'No answer'}
                          </div>
                        </div>
                        {!questionResult.isCorrect && (
                          <div>
                            <p className="text-sm font-medium text-green-700 mb-1">Correct Answer:</p>
                            <div className="p-2 bg-green-100 rounded border border-green-300">
                              {question.options[question.correctAnswer]}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {question.type === 'true-false' && (
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Your Answer:</p>
                          <div className="p-2 bg-white rounded border">
                            {parseInt(questionResult.userAnswer) === 0 ? 'True' : 'False'}
                          </div>
                        </div>
                        {!questionResult.isCorrect && (
                          <div>
                            <p className="text-sm font-medium text-green-700 mb-1">Correct Answer:</p>
                            <div className="p-2 bg-green-100 rounded border border-green-300">
                              {question.correctAnswer === 0 ? 'True' : 'False'}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {question.type === 'short-answer' && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Your Answer:</p>
                        <div className="p-3 bg-white rounded border min-h-[60px]">
                          {questionResult.userAnswer || 'No answer provided'}
                        </div>
                        {question.sampleAnswer && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-green-700 mb-1">Sample Answer:</p>
                            <div className="p-3 bg-green-100 rounded border border-green-300">
                              {question.sampleAnswer}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Course Outcome:</span>
                        <span className="ml-2 font-medium">{question.courseOutcome || '—'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Bloom's Taxonomy:</span>
                        <span className="ml-2 font-medium capitalize">{question.bloomsTaxonomy || '—'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuizResults;

