import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { checkQuizAvailability } from '../../utils/quizUtils';

function TakeQuiz() {
  const { roomId, quizId } = useParams();
  const { user, apiRequest } = useAuth();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [attemptId, setAttemptId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [error, setError] = useState('');
  const [availability, setAvailability] = useState(null);
  const [warnings, setWarnings] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [isTabActive, setIsTabActive] = useState(true);
  const [autoSubmitTrigger, setAutoSubmitTrigger] = useState(false);
  const timeLeftRef = useRef(timeLeft);
  timeLeftRef.current = timeLeft;

  useEffect(() => {
    // Load quiz and attempt state from API and initialize answers
    const load = async () => {
      try {
        setLoading(true);

        // roomId and quizId are UUIDs (strings) in this app — don't treat them as numeric
        if (!roomId || !quizId) {
          setError('Invalid room or quiz ID');
          return;
        }

        // Fetch quiz (API may return { status, quiz } or the quiz object directly)
        const fetchedQuizResp = await apiRequest(`/api/quizzes/${quizId}`);
        const fetchedQuiz = (fetchedQuizResp && (fetchedQuizResp.quiz ? fetchedQuizResp.quiz : fetchedQuizResp)) || null;
        if (!fetchedQuiz) {
          setError('Quiz not found');
          return;
        }

        // Normalize snake_case -> camelCase for common fields so UI can rely on camelCase
        const normalize = (q) => {
          if (!q) return q;
          const normalized = { ...q };
          if (q.time_limit !== undefined) normalized.timeLimit = q.time_limit;
          if (q.attempts_allowed !== undefined) normalized.attemptsAllowed = q.attempts_allowed;
          if (q.shuffle_questions !== undefined) normalized.shuffleQuestions = q.shuffle_questions;
          if (q.shuffle_options !== undefined) normalized.shuffleOptions = q.shuffle_options;
          if (q.scheduled_start !== undefined) normalized.scheduledStart = q.scheduled_start;
          if (q.scheduled_end !== undefined) normalized.scheduledEnd = q.scheduled_end;
          if (q.total_points !== undefined) normalized.totalPoints = q.total_points;
          if (q.created_at !== undefined) normalized.createdAt = q.created_at;
          if (q.updated_at !== undefined) normalized.updatedAt = q.updated_at;
          // ensure questions is an array
          if (typeof normalized.questions === 'string') {
            try { normalized.questions = JSON.parse(normalized.questions); } catch (e) { normalized.questions = []; }
          }
          if (!Array.isArray(normalized.questions)) normalized.questions = normalized.questions || [];
          return normalized;
        };

        const fetchedQuizNorm = normalize(fetchedQuiz);

        // Check availability
        const availabilityCheck = checkQuizAvailability(fetchedQuizNorm);
        setAvailability(availabilityCheck);
        if (!availabilityCheck.isAvailable) {
          setError(availabilityCheck.message);
          return;
        }

        // Fetch attempts to enforce attemptsAllowed
        let attempts = [];
        try {
          const res = await apiRequest(`/api/quizzes/${quizId}/attempts`);
          attempts = Array.isArray(res) ? res : (res.attempts || []);
        } catch (e) {
          attempts = [];
        }

        const myAttempts = attempts.filter(a => String(a.studentId || a.student_id) === String(user?.id)).length;
        const attemptsAllowed = fetchedQuizNorm.attemptsAllowed || 1;
        if (myAttempts >= attemptsAllowed) {
          setError('No attempts left for this quiz');
          return;
        }

        // Prepare questions (shuffling if needed)
        let preparedQuestions = [...(fetchedQuizNorm.questions || [])];
        if (fetchedQuizNorm.shuffleQuestions) {
          preparedQuestions = preparedQuestions.sort(() => Math.random() - 0.5);
        }
        if (fetchedQuizNorm.shuffleOptions) {
          preparedQuestions = preparedQuestions.map(q => {
            if (q.type !== 'multiple-choice' || !Array.isArray(q.options)) return q;
            const indices = q.options.map((_, idx) => idx).sort(() => Math.random() - 0.5);
            const newOptions = indices.map(i => q.options[i]);
            const newCorrect = indices.indexOf(q.correctAnswer);
            return { ...q, options: newOptions, correctAnswer: newCorrect };
          });
        }

        const quizWithPrep = { ...fetchedQuizNorm, questions: preparedQuestions };
        setQuiz(quizWithPrep);

        // Set timeLeft (cap at scheduled end if present)
        let remaining = (fetchedQuizNorm.timeLimit || 0) * 60;
        if (fetchedQuizNorm.scheduledEnd) {
          const secondsUntilEnd = Math.max(0, Math.floor((new Date(fetchedQuizNorm.scheduledEnd) - new Date()) / 1000));
          remaining = Math.min(remaining, secondsUntilEnd);
        }
        setTimeLeft(remaining);

        // Try to fetch room code
        try {
          const room = await apiRequest(`/api/rooms/${roomId}`);
          if (room?.code) setRoomCode(room.code);
        } catch (e) {
          // ignore
        }

        // Initialize answers
        const initialAnswers = {};
        quizWithPrep.questions.forEach(q => { initialAnswers[q.id] = ''; });

        // Attempt to restore server-side draft for this user's latest attempt if any
        const userAttempts = attempts.filter(a => String(a.studentId || a.student_id) === String(user?.id));
        const latestDraft = userAttempts.length ? userAttempts[userAttempts.length - 1] : null;
        if (latestDraft && latestDraft.answers) {
          setAnswers(latestDraft.answers);
        } else {
          setAnswers(initialAnswers);
        }

      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to load quiz');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [quizId, roomId, user?.id, apiRequest]);

  // Create server-side attempt when quiz is ready
  useEffect(() => {
    if (!quiz || !user) return;
    const startAttempt = async () => {
      try {
        const res = await apiRequest(`/api/quizzes/${quiz.id}/attempts`, {
          method: 'POST',
          body: JSON.stringify({ roomId })
        });
        // Accept a variety of shapes: { id }, { attemptId }, or returned object
        const id = res?.id || res?.attemptId || res?.attempt?.id || null;
        if (id) setAttemptId(id);
      } catch (err) {
        console.warn('Failed to create attempt on server, will proceed in client-only mode', err);
      }
    };

    startAttempt();
  }, [quiz, user, apiRequest, roomId]);

  // Autosave answers to server (and fallback to localStorage)
  useEffect(() => {
    if (!quiz || !user) return;

    let cancelled = false;

    const doAutosave = async () => {
        if (attemptId) {
        try {
          // convert answers map -> array of { questionId, response }
          const answersArray = Object.keys(answers || {}).map(qid => ({ questionId: qid, response: answers[qid] }));
          await apiRequest(`/api/quizzes/${quiz.id}/attempts/${attemptId}`, {
            method: 'PATCH',
            body: JSON.stringify({ answers: answersArray, elapsedSeconds: (quiz.timeLimit * 60) - timeLeftRef.current })
          });
        } catch (err) {
          // fallback to localStorage
          const autosaveKey = `quiz_autosave_${user.id}_${quiz.id}`;
          const payload = { answers, updatedAt: Date.now() };
          localStorage.setItem(autosaveKey, JSON.stringify(payload));
        }
      } else {
        // fallback to localStorage autosave
        const autosaveKey = `quiz_autosave_${user.id}_${quiz.id}`;
        const payload = { answers, updatedAt: Date.now() };
        localStorage.setItem(autosaveKey, JSON.stringify(payload));
      }
    };

    // debounce/save after a short delay to avoid spamming
    const timer = setTimeout(() => {
      if (!cancelled) doAutosave();
    }, 1500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [answers, quiz, user, attemptId, apiRequest]);

  // Handle security violations - defined early so it can be used in useEffect hooks
  const handleSecurityViolation = useCallback((message) => {
    if (submitted) return;

    setWarnings(prev => {
      const newWarnings = prev + 1;
      setWarningMessage(message);
      setShowWarningModal(true);

      // Auto-submit after 3 warnings
      if (newWarnings >= 3) {
        setTimeout(() => {
          setShowWarningModal(false);
          alert('You have reached the maximum number of warnings (3). Your quiz will be automatically submitted.');
          setAutoSubmitTrigger(true);
        }, 2000);
      } else {
        // Auto-close warning after 3 seconds
        setTimeout(() => {
          setShowWarningModal(false);
        }, 3000);
      }
      
      return newWarnings;
    });
  }, [submitted]);

  // Warn on unload if not submitted
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!submitted && quiz) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [submitted, quiz]);

  // Security: Prevent copy, paste, cut, and right-click
  useEffect(() => {
    if (!quiz || submitted) return;

    const preventCopyPaste = (e) => {
      // Prevent copy (Ctrl+C, Cmd+C)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        handleSecurityViolation('Copy action is not allowed during the quiz.');
        return false;
      }
      // Prevent cut (Ctrl+X, Cmd+X)
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        handleSecurityViolation('Cut action is not allowed during the quiz.');
        return false;
      }
      // Prevent paste (Ctrl+V, Cmd+V)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        handleSecurityViolation('Paste action is not allowed during the quiz.');
        return false;
      }
      // Prevent select all (Ctrl+A, Cmd+A)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        handleSecurityViolation('Select all is not allowed during the quiz.');
        return false;
      }
      // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J (Developer Tools)
      if (e.key === 'F12' || 
          ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'J'))) {
        e.preventDefault();
        handleSecurityViolation('Developer tools are not allowed during the quiz.');
        return false;
      }
    };

    const preventContextMenu = (e) => {
      e.preventDefault();
      handleSecurityViolation('Right-click is not allowed during the quiz.');
      return false;
    };

    const preventPasteEvent = (e) => {
      e.preventDefault();
      handleSecurityViolation('Paste action is not allowed during the quiz.');
      return false;
    };

    const preventCopyEvent = (e) => {
      e.preventDefault();
      handleSecurityViolation('Copy action is not allowed during the quiz.');
      return false;
    };

    const preventCutEvent = (e) => {
      e.preventDefault();
      handleSecurityViolation('Cut action is not allowed during the quiz.');
      return false;
    };

    const preventSelectStart = (e) => {
      // Allow normal text selection within input fields, but prevent outside
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return true;
      }
      e.preventDefault();
      return false;
    };

    // Add event listeners
    document.addEventListener('keydown', preventCopyPaste);
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('paste', preventPasteEvent);
    document.addEventListener('copy', preventCopyEvent);
    document.addEventListener('cut', preventCutEvent);
    document.addEventListener('selectstart', preventSelectStart);

    // Disable text selection via CSS (but allow in input/textarea)
    const style = document.createElement('style');
    style.id = 'quiz-security-styles';
    style.textContent = `
      body * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
      }
      body input,
      body textarea {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.removeEventListener('keydown', preventCopyPaste);
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('paste', preventPasteEvent);
      document.removeEventListener('copy', preventCopyEvent);
      document.removeEventListener('cut', preventCutEvent);
      document.removeEventListener('selectstart', preventSelectStart);
      const styleElement = document.getElementById('quiz-security-styles');
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, [quiz, submitted, handleSecurityViolation]);

  // Security: Detect tab switching using Page Visibility API
  useEffect(() => {
    if (!quiz || submitted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab switched or window minimized
        setIsTabActive(false);
        handleSecurityViolation('You switched tabs or minimized the window. This is not allowed during the quiz.');
      } else {
        setIsTabActive(true);
      }
    };

    const handleBlur = () => {
      // Window lost focus
      if (document.activeElement === document.body) {
        setIsTabActive(false);
        handleSecurityViolation('You switched away from the quiz window. This is not allowed during the quiz.');
      }
    };

    const handleFocus = () => {
      setIsTabActive(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [quiz, submitted, handleSecurityViolation]);

  const handleSubmit = useCallback(async () => {
    if (submitted || !quiz || !user || !quiz.questions || quiz.questions.length === 0) return;

    const timeSpent = (quiz.timeLimit * 60) - timeLeft;

    // Try submit to server if we have an attemptId (or create one)
    try {
      let id = attemptId;
      if (!id) {
        // create attempt first
        try {
          const createRes = await apiRequest(`/api/quizzes/${quiz.id}/attempts`, {
            method: 'POST',
            body: JSON.stringify({ roomId })
          });
          id = createRes?.id || createRes?.attemptId || createRes?.attempt?.id || null;
          if (id) setAttemptId(id);
        } catch (err) {
          console.warn('Failed to create attempt before submit, will fallback to client-side submit', err);
        }
      }

      if (id) {
        // server-side submit
        // convert answers map -> array for server
        const answersArray = Object.keys(answers || {}).map(qid => ({ questionId: qid, response: answers[qid] }));
        const submitRes = await apiRequest(`/api/quizzes/${quiz.id}/attempts/${id}/submit`, {
          method: 'POST',
          body: JSON.stringify({ answers: answersArray, elapsedSeconds: timeSpent })
        });

        // Expect server to return scored attempt
        const scored = submitRes?.attempt || submitRes?.data || submitRes;
        const finalScore = scored?.score ?? scored?.finalScore ?? Math.round(((scored?.points || 0) / (scored?.totalPoints || quiz.questions.reduce((s,q)=>s+(q.points||0),0))) * 100);
        const earnedPoints = scored?.points ?? scored?.earnedPoints ?? 0;
        const correctAnswers = scored?.correctAnswers ?? 0;
        const totalPoints = scored?.totalPoints ?? quiz.questions.reduce((s,q)=>s+(q.points||0),0);

        setScore({
          correctAnswers,
          totalQuestions: quiz.questions.length,
          percentage: scored?.percentage ?? finalScore,
          earnedPoints,
          totalPoints,
          finalScore,
          timeSpent,
        });

        setSubmitted(true);

        // cleanup autosave local key if present
        try { localStorage.removeItem(`quiz_autosave_${user.id}_${quiz.id}`); } catch(e){}
        return;
      }
    } catch (err) {
      console.error('Server submit failed', err);
      // continue to fallback to local scoring below
    }

    // Fallback: local scoring (if server unavailable)
    let correctAnswers = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    quiz.questions.forEach(question => {
      totalPoints += question.points;
      const userAnswer = answers[question.id];
      
      if (question.type === 'multiple-choice' || question.type === 'true-false') {
        if (parseInt(userAnswer) === question.correctAnswer) {
          correctAnswers++;
          earnedPoints += question.points;
        }
      } else if (question.type === 'short-answer') {
        if (userAnswer && userAnswer.trim().length > 0) {
          correctAnswers++;
          earnedPoints += question.points;
        }
      }
    });

    const percentage = Math.round((correctAnswers / quiz.questions.length) * 100);
    const finalScore = Math.round((earnedPoints / totalPoints) * 100);

    setScore({
      correctAnswers,
      totalQuestions: quiz.questions.length,
      percentage,
      earnedPoints,
      totalPoints,
      finalScore,
      timeSpent
    });

    // Fallback persist to localStorage for offline/demo mode
    try {
      const quizResult = {
        id: Date.now(),
        studentId: user.id,
        studentName: user.name,
        studentEmail: user.email,
        quizId: quiz.id,
        quizName: quiz.title,
        roomId: quiz.roomId,
        roomName: quiz.roomName || 'Unknown Room',
        roomCode: quiz.roomCode || 'N/A',
        answers,
        score: finalScore,
        points: earnedPoints,
        completedAt: new Date().toISOString(),
        status: 'completed',
        timeSpent
      };
      const existingResults = JSON.parse(localStorage.getItem('campusca_quiz_results') || '[]');
      existingResults.push(quizResult);
      localStorage.setItem('campusca_quiz_results', JSON.stringify(existingResults));
    } catch (e) {
      // ignore
    }

    setSubmitted(true);
  }, [submitted, quiz, answers, user, timeLeft, attemptId, apiRequest, roomId]);

  // Auto-submit when triggered by security violations
  useEffect(() => {
    if (autoSubmitTrigger && !submitted && quiz) {
      handleSubmit();
      setAutoSubmitTrigger(false);
    }
  }, [autoSubmitTrigger, submitted, quiz, handleSubmit]);

  useEffect(() => {
    if (timeLeft > 0 && !submitted && quiz) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !submitted && quiz) {
      handleSubmit();
    }
  }, [timeLeft, submitted, quiz, handleSubmit]);

  // Check if quiz has ended during attempt
  useEffect(() => {
    if (!quiz || submitted) return;
    
    const checkInterval = setInterval(() => {
      const availabilityCheck = checkQuizAvailability(quiz);
      if (!availabilityCheck.isAvailable && availabilityCheck.status === 'ended') {
        // Auto-submit if quiz has ended
        handleSubmit();
      }
    }, 1000); // Check every second
    
    return () => clearInterval(checkInterval);
  }, [quiz, submitted, handleSubmit]);

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
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
          <p className="mt-4 text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const getErrorIcon = () => {
      if (availability?.status === 'not_started') return '⏰';
      if (availability?.status === 'ended') return '🔒';
      return '❌';
    };
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-gray-400 text-6xl mb-4">{getErrorIcon()}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {availability?.status === 'not_started' ? 'Quiz Not Started' : 
             availability?.status === 'ended' ? 'Quiz Has Ended' : 'Error'}
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          {availability?.status === 'not_started' && availability?.timeUntilStart && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                {availability.hoursUntilStart > 0 && `${availability.hoursUntilStart} hour(s) `}
                {availability.minutesUntilStart > 0 && `${availability.minutesUntilStart} minute(s) `}
                until quiz starts
              </p>
            </div>
          )}
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

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Not Found</h2>
          <p className="text-gray-600 mb-4">The quiz you're looking for doesn't exist.</p>
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

  if (submitted && score) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container py-8">
          <div className="max-w-2xl mx-auto">
            <div className="card text-center">
              <div className="text-6xl mb-4">
                {score.finalScore >= 80 ? '🎉' : score.finalScore >= 60 ? '👍' : '📚'}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Quiz Completed!</h1>
              <h2 className="text-xl text-gray-600 mb-8">{quiz.title}</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{score.finalScore}%</div>
                  <div className="text-sm text-blue-800">Final Score</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{score.correctAnswers}/{score.totalQuestions}</div>
                  <div className="text-sm text-green-800">Correct Answers</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{score.earnedPoints}/{score.totalPoints}</div>
                  <div className="text-sm text-purple-800">Points Earned</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{formatTime(score.timeSpent)}</div>
                  <div className="text-sm text-yellow-800">Time Taken</div>
                </div>
              </div>

              <div className="space-y-4">
                {roomCode ? (
                  <button
                    onClick={() => navigate(`/room/${roomCode}`)}
                    className="btn btn-primary w-full"
                  >
                    Back to Room
                  </button>
                ) : null}
                <button
                  onClick={() => navigate('/student')}
                  className="btn btn-secondary w-full"
                >
                  Student Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Safety check for questions array
  if (!quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Quiz</h2>
          <p className="text-gray-600 mb-4">This quiz has no questions.</p>
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

  const currentQ = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  // Check if quiz is ending soon (within 5 minutes of scheduled end)
  const getQuizEndWarning = () => {
    if (!quiz.scheduledEnd) return null;
    const endDate = new Date(quiz.scheduledEnd);
    const now = new Date();
    const timeUntilEnd = Math.floor((endDate - now) / 1000 / 60); // minutes
    
    if (timeUntilEnd > 0 && timeUntilEnd <= 5) {
      return {
        show: true,
        minutes: timeUntilEnd,
        message: `Quiz will end in ${timeUntilEnd} minute(s)`
      };
    }
    return null;
  };

  const endWarning = getQuizEndWarning();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Security Warning Banner */}
      {warnings > 0 && warnings < 3 && (
        <div className="bg-red-50 border-b-2 border-red-400 p-3">
          <div className="container">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-red-600 text-xl mr-2">⚠️</span>
                <span className="text-red-800 font-medium">
                  Warning {warnings}/3: {warningMessage}
                </span>
              </div>
              <span className="text-red-600 font-bold">
                {3 - warnings} warning{3 - warnings !== 1 ? 's' : ''} remaining
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Security Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Security Warning</h2>
              <p className="text-gray-700 mb-4">{warningMessage}</p>
              <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                <p className="text-sm text-red-800 font-medium">
                  Warning {warnings}/3
                </p>
                {warnings >= 3 ? (
                  <p className="text-sm text-red-800 mt-2">
                    Maximum warnings reached! Your quiz will be automatically submitted.
                  </p>
                ) : (
                  <p className="text-sm text-red-800 mt-2">
                    {3 - warnings} more warning{3 - warnings !== 1 ? 's' : ''} will result in automatic submission.
                  </p>
                )}
              </div>
              {warnings < 3 && (
                <button
                  onClick={() => setShowWarningModal(false)}
                  className="btn btn-primary"
                >
                  I Understand
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Inactive Overlay */}
      {!isTabActive && !submitted && (
        <div className="fixed inset-0 bg-red-600 bg-opacity-90 flex items-center justify-center z-40">
          <div className="text-center text-white">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-3xl font-bold mb-2">Return to Quiz</h2>
            <p className="text-xl">Please return to the quiz window immediately.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{quiz.title}</h1>
              <p className="text-gray-600">Question {currentQuestion + 1} of {quiz.questions.length}</p>
            </div>
            <div className="flex items-center space-x-4">
              {warnings > 0 && (
                <div className="text-right mr-4">
                  <div className={`text-lg font-bold ${warnings >= 2 ? 'text-red-600' : 'text-yellow-600'}`}>
                    ⚠️ Warnings: {warnings}/3
                  </div>
                  <div className="text-xs text-gray-500">Security Alerts</div>
                </div>
              )}
              <div className="text-right">
                <div className="text-2xl font-bold text-indigo-600">{formatTime(timeLeft)}</div>
                <div className="text-sm text-gray-500">Time Remaining</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Quiz Ending Warning */}
      {endWarning && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="container">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-yellow-400 text-xl">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-800">
                  {endWarning.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="card mb-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Question {currentQuestion + 1}
              </h2>
              <p className="text-gray-700 text-lg">{currentQ.question}</p>
              <div className="mt-2 text-sm text-gray-500">
                {currentQ.points} point{currentQ.points !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Answer Options */}
            <div className="space-y-3">
              {currentQ.type === 'multiple-choice' && (
                currentQ.options.map((option, index) => (
                  <label key={index} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name={`question-${currentQ.id}`}
                      value={index}
                      checked={answers[currentQ.id] === index.toString()}
                      onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                      className="h-4 w-4 text-indigo-600 mr-3"
                    />
                    <span className="text-gray-700">{option}</span>
                  </label>
                ))
              )}

              {currentQ.type === 'true-false' && (
                <>
                  <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name={`question-${currentQ.id}`}
                      value="0"
                      checked={answers[currentQ.id] === '0'}
                      onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                      className="h-4 w-4 text-indigo-600 mr-3"
                    />
                    <span className="text-gray-700">True</span>
                  </label>
                  <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name={`question-${currentQ.id}`}
                      value="1"
                      checked={answers[currentQ.id] === '1'}
                      onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                      className="h-4 w-4 text-indigo-600 mr-3"
                    />
                    <span className="text-gray-700">False</span>
                  </label>
                </>
              )}

              {currentQ.type === 'short-answer' && (
                <textarea
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                  onPaste={(e) => {
                    e.preventDefault();
                    handleSecurityViolation('Paste action is not allowed during the quiz.');
                  }}
                  onCopy={(e) => {
                    e.preventDefault();
                    handleSecurityViolation('Copy action is not allowed during the quiz.');
                  }}
                  onCut={(e) => {
                    e.preventDefault();
                    handleSecurityViolation('Cut action is not allowed during the quiz.');
                  }}
                  className="form-input"
                  rows="4"
                  placeholder="Enter your answer..."
                />
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className="btn btn-secondary"
            >
              Previous
            </button>

            <div className="flex space-x-2">
              {currentQuestion === quiz.questions.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  className="btn btn-primary"
                >
                  Submit Quiz
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="btn btn-primary"
                >
                  Next
                </button>
              )}
            </div>
          </div>

          {/* Question Navigation */}
          <div className="mt-8">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Question Navigation</h3>
            <div className="flex flex-wrap gap-2">
              {quiz.questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestion(index)}
                  className={`w-10 h-10 rounded-full text-sm font-medium ${
                    index === currentQuestion
                      ? 'bg-indigo-600 text-white'
                      : answers[quiz.questions[index].id]
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TakeQuiz;
