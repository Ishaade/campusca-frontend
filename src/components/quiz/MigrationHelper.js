import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

// Small utility to migrate `campusca_quizzes` and `campusca_quiz_results`
// from localStorage into the server via the existing API. This component
// is intentionally explicit and conservative: it previews counts, runs
// operations sequentially, and logs per-item errors.

export default function MigrationHelper() {
  const { apiRequest } = useAuth();
  const [status, setStatus] = useState('idle');
  const [logs, setLogs] = useState([]);
  const [counts, setCounts] = useState({ quizzes: 0, results: 0 });
  const [mapping, setMapping] = useState({}); // oldQuizId -> newQuizId

  const appendLog = (line) => setLogs(prev => [...prev, line]);

  const scan = () => {
    try {
      const quizzes = JSON.parse(localStorage.getItem('campusca_quizzes') || '[]');
      const results = JSON.parse(localStorage.getItem('campusca_quiz_results') || '[]');
      setCounts({ quizzes: quizzes.length, results: results.length });
      appendLog(`Found ${quizzes.length} quizzes and ${results.length} quiz results in localStorage.`);
    } catch (e) {
      appendLog('Failed to read localStorage: ' + e.message);
    }
  };

  const migrateQuizzes = async () => {
    setStatus('migrating-quizzes');
    appendLog('Starting quiz migration...');

    const quizzes = JSON.parse(localStorage.getItem('campusca_quizzes') || '[]');
    const map = {};

    for (let i = 0; i < quizzes.length; i++) {
      const q = quizzes[i];
      appendLog(`Migrating quiz [old id=${q.id}] "${q.title}"...`);
      try {
        // Build payload expected by backend POST /api/quizzes/rooms/:roomId
        const payload = {
          title: q.title,
          description: q.description,
          timeLimit: q.timeLimit,
          scheduledStart: q.scheduledStart || null,
          scheduledEnd: q.scheduledEnd || null,
          attemptsAllowed: q.attemptsAllowed || 1,
          shuffleQuestions: !!q.shuffleQuestions,
          shuffleOptions: !!q.shuffleOptions,
          questions: q.questions || [],
          totalPoints: q.totalPoints || (q.questions || []).reduce((s,qq)=>s+(qq.points||0),0)
        };

        const res = await apiRequest(`/api/quizzes/rooms/${q.roomId}`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        const newId = res?.id || res?.quiz?.id || res?.quizId || null;
        if (!newId) {
          appendLog(`Warning: backend did not return new id for quiz [old id=${q.id}]`);
        } else {
          map[q.id] = newId;
          appendLog(`OK: migrated quiz old id=${q.id} -> new id=${newId}`);
        }
      } catch (err) {
        appendLog(`ERROR migrating quiz old id=${q.id}: ${err.message || err}`);
      }
    }

    setMapping(map);
    setStatus('quizzes-migrated');
    appendLog('Quiz migration finished.');
  };

  const migrateResults = async () => {
    setStatus('migrating-results');
    appendLog('Starting quiz results migration...');

    const results = JSON.parse(localStorage.getItem('campusca_quiz_results') || '[]');
    let migrated = 0;

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const newQuizId = mapping[r.quizId] || r.quizId; // fallback to same id if mapping missing
      appendLog(`Migrating result old quizId=${r.quizId} (new=${newQuizId}) for student ${r.studentId}...`);
      try {
        // First create an attempt on the server
        const createRes = await apiRequest(`/api/quizzes/${newQuizId}/attempts`, {
          method: 'POST',
          body: JSON.stringify({ roomId: r.roomId })
        });

        const attemptId = createRes?.id || createRes?.attemptId || createRes?.attempt?.id || null;

        if (!attemptId) {
          // Try posting a completed attempt directly (some backends accept this shape)
          try {
            await apiRequest(`/api/quizzes/${newQuizId}/attempts`, {
              method: 'POST',
              body: JSON.stringify({
                roomId: r.roomId,
                studentId: r.studentId,
                answers: r.answers,
                timeSpent: r.timeSpent,
                completedAt: r.completedAt,
                status: r.status || 'completed',
                score: r.score,
                points: r.points
              })
            });
            appendLog(`OK: migrated result for quiz ${newQuizId} (no attempt id returned)`);
            migrated++;
            continue;
          } catch (e2) {
            appendLog(`ERROR creating attempt for quiz ${newQuizId}: ${e2.message || e2}`);
            continue;
          }
        }

        // submit the attempt with answers (server should score)
        try {
          await apiRequest(`/api/quizzes/${newQuizId}/attempts/${attemptId}/submit`, {
            method: 'POST',
            body: JSON.stringify({ answers: r.answers, timeSpent: r.timeSpent, completedAt: r.completedAt })
          });
          appendLog(`OK: migrated result -> attempt ${attemptId} for quiz ${newQuizId}`);
          migrated++;
        } catch (e3) {
          appendLog(`ERROR submitting attempt ${attemptId} for quiz ${newQuizId}: ${e3.message || e3}`);
        }
      } catch (err) {
        appendLog(`ERROR migrating result for quizId=${r.quizId}: ${err.message || err}`);
      }
    }

    setStatus('results-migrated');
    appendLog(`Results migration finished. Migrated ${migrated}/${results.length} results.`);
  };

  const clearLocal = () => {
    try {
      localStorage.removeItem('campusca_quizzes');
      localStorage.removeItem('campusca_quiz_results');
      appendLog('Removed localStorage keys: campusca_quizzes, campusca_quiz_results');
    } catch (e) {
      appendLog('Failed to clear localStorage: ' + e.message);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">LocalStorage → Server Migration Helper</h2>
      <p className="text-sm text-gray-600 mb-4">This tool migrates quizzes and quiz results stored in browser localStorage into the API-backed database. Run in a teacher/admin browser session.</p>

      <div className="space-y-3 mb-4">
        <button onClick={scan} className="btn btn-secondary">Scan localStorage</button>
        <button onClick={migrateQuizzes} className="btn btn-primary">Migrate Quizzes</button>
        <button onClick={migrateResults} className="btn btn-primary">Migrate Results</button>
        <button onClick={clearLocal} className="btn btn-danger">Clear LocalStorage Keys</button>
      </div>

      <div className="mb-4">
        <strong>Counts:</strong> Quizzes: {counts.quizzes} — Results: {counts.results}
      </div>

      <div className="bg-gray-50 p-4 rounded border h-64 overflow-auto">
        {logs.length === 0 ? (
          <div className="text-sm text-gray-500">No logs yet — click Scan or Migrate.</div>
        ) : (
          logs.map((l, idx) => <div key={idx} className="text-sm font-mono break-words">{l}</div>)
        )}
      </div>
    </div>
  );
}
