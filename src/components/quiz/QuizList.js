import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { checkQuizAvailability } from '../../utils/quizUtils';

function QuizList() {
  const { roomId } = useParams();
  const { user, apiRequest } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [roomCode, setRoomCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const safeDate = (value, withTime = false) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return withTime ? d.toLocaleString() : d.toLocaleDateString();
  };

  useEffect(() => {
    // roomId is a UUID string in this app — don't require numeric
    if (!roomId) {
      setError('Invalid room ID');
      setLoading(false);
      return;
    }

    // Load quizzes and room info from API
    const load = async () => {
      try {
        setLoading(true);
        // quizzes for the room - API may return either { quizzes: [...] } or the array directly
        const roomQuizzesResp = await apiRequest(`/api/quizzes/rooms/${roomId}`);
        const roomQuizzes = (roomQuizzesResp && (Array.isArray(roomQuizzesResp.quizzes) ? roomQuizzesResp.quizzes : Array.isArray(roomQuizzesResp) ? roomQuizzesResp : [])) || [];
        // room info (to get room code)
        let foundRoom = null;
        try {
          foundRoom = await apiRequest(`/api/rooms/${roomId}`);
        } catch (e) {
          // ignore, room may not be directly accessible
        }

        const roomObj = foundRoom?.room || foundRoom;
        if (roomObj?.code) setRoomCode(roomObj.code);

        // For each quiz, fetch attempts and determine user's completion
        const quizzesWithStatus = await Promise.all((roomQuizzes || []).map(async (quiz) => {
          let attempts = [];
          try {
            const res = await apiRequest(`/api/quizzes/${quiz.id}/attempts`);
            attempts = Array.isArray(res) ? res : (res.attempts || []);
          } catch (e) {
            // If attempts endpoint is restricted, fallback to empty
            attempts = [];
          }

          const userAttemptsForThis = attempts.filter(a => String(a.studentId || a.student_id) === String(user?.id));
          const userResult = userAttemptsForThis[userAttemptsForThis.length - 1];
          const availability = checkQuizAvailability(quiz);

          return {
            ...quiz,
            completed: !!userResult,
            score: userResult ? userResult.score : null,
            completedAt: userResult ? (userResult.completedAt || userResult.submittedAt || userResult.submitted_at) : null,
            attemptsByUserCount: userAttemptsForThis.length,
            availability
          };
        }));

        setQuizzes(quizzesWithStatus);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to load quizzes');
      } finally {
        setLoading(false);
      }
    };

    load();

    // Set up interval to refresh availability every minute
    const availabilityInterval = setInterval(() => {
      setQuizzes(prev => prev.map(q => ({ ...q, availability: checkQuizAvailability(q) })));
    }, 60000);

    return () => clearInterval(availabilityInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user?.id]);

  const handleTakeQuiz = (quizId) => {
    navigate(`/room/${roomId}/quiz/${quizId}`);
  };

  const handleViewResults = (quizId) => {
    navigate(`/room/${roomId}/quiz/${quizId}/results`);
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/student')}
            className="btn btn-primary"
          >
            Back to Dashboard
          </button>
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
              <h1 className="text-2xl font-bold text-gray-900">Available Quizzes</h1>
              <p className="text-gray-600">Take quizzes and track your progress</p>
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
        {quizzes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No quizzes available</h3>
            <p className="text-gray-600">Your teacher hasn't created any quizzes for this room yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map(quiz => {
              const availability = quiz.availability || checkQuizAvailability(quiz);
              const userAttempts = quiz.attemptsByUserCount || 0;
              const attemptsAllowed = quiz.attemptsAllowed || 1;
              const attemptsRemaining = Math.max(0, attemptsAllowed - userAttempts);
              const canAttempt = attemptsRemaining > 0;
              const isAvailable = availability.isAvailable && !quiz.completed && canAttempt;
              
              return (
                <div key={quiz.id} className="card">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{quiz.title}</h3>
                    <div className="flex flex-col items-end gap-1">
                      {quiz.completed && (
                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                          Completed
                        </span>
                      )}
                      {!quiz.completed && availability.status === 'not_started' && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">
                          Not Started
                        </span>
                      )}
                      {!quiz.completed && availability.status === 'ended' && (
                        <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
                          Ended
                        </span>
                      )}
                      {!quiz.completed && availability.status === 'available' && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                          Available
                        </span>
                      )}
                    </div>
                  </div>

                  {quiz.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{quiz.description}</p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Questions:</span>
                      <span className="font-medium">{quiz.questions.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Time Limit:</span>
                      <span className="font-medium">{quiz.timeLimit} minutes</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Points:</span>
                      <span className="font-medium">{quiz.totalPoints}</span>
                    </div>
                    
                    {/* Schedule Information */}
                    {quiz.scheduledStart && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Starts:</span>
                        <span className="font-medium text-xs">
                          {safeDate(quiz.scheduledStart, true)}
                        </span>
                      </div>
                    )}
                    {quiz.scheduledEnd && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Ends:</span>
                        <span className="font-medium text-xs">
                          {safeDate(quiz.scheduledEnd, true)}
                        </span>
                      </div>
                    )}
                    
                    {quiz.completed && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Your Score:</span>
                        <span className={`font-bold ${
                          quiz.score >= 80 ? 'text-green-600' : 
                          quiz.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {quiz.score}%
                        </span>
                      </div>
                    )}
                    
                    {/* Availability Message */}
                    {!quiz.completed && availability.status === 'not_started' && (
                      <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                        {availability.message}
                      </div>
                    )}
                    {!quiz.completed && availability.status === 'ended' && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                        {availability.message}
                      </div>
                    )}
                    {!quiz.completed && availability.status === 'available' && availability.timeUntilEnd && (
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                        {availability.hoursUntilEnd > 0 && `${availability.hoursUntilEnd}h `}
                        {availability.minutesUntilEnd > 0 && `${availability.minutesUntilEnd}m `}
                        remaining
                      </div>
                    )}
                    {!quiz.completed && (
                      <div className="p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700">
                        Attempts: {userAttempts}/{attemptsAllowed} {canAttempt ? `(Remaining: ${attemptsRemaining})` : '(No attempts left)'}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {quiz.completed ? (
                      <>
                        <button
                          onClick={() => handleViewResults(quiz.id)}
                          className="btn btn-primary w-full"
                        >
                          View Results
                        </button>
                        <p className="text-xs text-gray-500 text-center">
                          Completed on {safeDate(quiz.completedAt)}
                        </p>
                      </>
                    ) : (
                      <button
                        onClick={() => handleTakeQuiz(quiz.id)}
                        disabled={!isAvailable}
                        className={`btn w-full ${
                          isAvailable ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'
                        }`}
                      >
                        {availability.status === 'not_started' ? 'Quiz Not Started' :
                         availability.status === 'ended' ? 'Quiz Has Ended' :
                         !canAttempt ? 'No Attempts Left' :
                         'Take Quiz'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default QuizList;
