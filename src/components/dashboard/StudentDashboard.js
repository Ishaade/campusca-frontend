import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [roomCode, setRoomCode] = useState('');

  const { apiRequest } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!roomCode.trim()) return;

    (async () => {
      try {
        const payload = { code: roomCode.toUpperCase() };
        const data = await apiRequest('/api/rooms/join', { method: 'POST', body: JSON.stringify(payload) });
        const membership = data.membership || data;
        if (membership.status === 'pending') {
          alert('Requested to join. Waiting for teacher approval.');
          setRoomCode('');
          // refresh joined rooms and normalize
          const joined = await apiRequest('/api/rooms');
          const roomsList = (joined.rooms || joined || []);
          const normalized = roomsList.map((r) => {
            const id = r.id || r.roomId || r.room_id;
            const name = r.name || r.roomName || r.room_name;
            const code = r.code || r.roomCode || r.room_code;
            const status = r.membershipStatus || r.status || r.membership_status || 'active';
            const joinedAt = r.joinedAt || r.joined_at || r.joined_at || null;
            const membershipId = r.membershipId || r.membership_id || r.id || null;
            return { id, name, code, status, joinedAt, membershipId, raw: r };
          });
          setJoinedRooms(normalized);
        } else {
          alert('Successfully joined the room!');
          setRoomCode('');
          const joined = await apiRequest('/api/rooms');
          const roomsList = (joined.rooms || joined || []);
          const normalized = roomsList.map((r) => {
            const id = r.id || r.roomId || r.room_id;
            const name = r.name || r.roomName || r.room_name;
            const code = r.code || r.roomCode || r.room_code;
            const status = r.membershipStatus || r.status || r.membership_status || 'active';
            const joinedAt = r.joinedAt || r.joined_at || r.joined_at || null;
            const membershipId = r.membershipId || r.membership_id || r.id || null;
            return { id, name, code, status, joinedAt, membershipId, raw: r };
          });
          setJoinedRooms(normalized);
          // find the joined room by membership id so we can navigate using the room code
          const roomFound = normalized.find(r => String(r.membershipId) === String(membership.id) || String(r.id) === String(membership.room_id) || String(r.id) === String(membership.roomId));
          if (roomFound && roomFound.code) {
            navigate(`/room/${roomFound.code}`);
          }
        }
      } catch (err) {
        alert('Failed to join room: ' + err.message);
      }
    })();
  };

  const [joinedRooms, setJoinedRooms] = useState([]);
  const [stats, setStats] = useState({
    joinedRooms: 0,
    completedQuizzes: 0,
    averageScore: 0,
    totalPoints: 0
  });

  useEffect(() => {
    // Load joined rooms and quiz summaries from backend and normalize fields
    (async () => {
      try {
        const joined = await apiRequest('/api/rooms');
        const roomsList = (joined.rooms || joined || []);
        const normalized = roomsList.map((r) => {
          // server may return either teacher view (rooms) or student joined rooms
          const id = r.id || r.roomId || r.room_id;
          const name = r.name || r.roomName || r.room_name;
          const code = r.code || r.roomCode || r.room_code;
          const status = r.membershipStatus || r.status || r.membership_status || 'active';
          const joinedAt = r.joinedAt || r.joined_at || r.joined_at || null;
          const membershipId = r.membershipId || r.membership_id || r.id || null;

          return { id, name, code, status, joinedAt, membershipId, raw: r };
        });

        setJoinedRooms(normalized);

        // fetch this student's completed attempts from server
        let myAttempts = [];
        try {
          const ares = await apiRequest(`/api/quizzes/attempts/me`);
          myAttempts = Array.isArray(ares.attempts) ? ares.attempts : (ares.attempts || ares || []);
        } catch (e) {
          myAttempts = [];
        }

        // map server attempts -> UI recentQuizzes shape
        const recent = myAttempts.map(at => ({
          id: at.id,
          quizId: at.quizId,
          quizName: at.quizName || at.quiz_title || 'Quiz',
          roomId: at.roomId,
          roomName: at.roomName || at.room_name || (normalized.find(r => r.id === at.roomId)?.name) || 'Room',
          completedAt: at.completedAt || at.submitted_at,
          points: at.points || at.earned_points || 0,
          score: at.score || 0
        }));

        setRecentQuizzes(recent);

        const completedQuizzes = recent.length;
        const averageScore = completedQuizzes > 0 ? Math.round(recent.reduce((s,r) => s + (r.score || 0), 0) / completedQuizzes) : 0;
        const totalPoints = recent.reduce((s,r) => s + (r.points || 0), 0);

        setStats({
          joinedRooms: normalized.length,
          completedQuizzes,
          averageScore,
          totalPoints
        });
      } catch (err) {
        setJoinedRooms([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const [upcomingQuizzes, setUpcomingQuizzes] = useState([]);

  useEffect(() => {
    // Build upcoming quizzes by fetching quizzes for each joined room
    (async () => {
      try {
        const now = new Date();
        const upcoming = [];
        for (const j of joinedRooms) {
          try {
            const qdata = await apiRequest(`/api/quizzes/rooms/${j.id}`);
            const quizzes = qdata.quizzes || qdata || [];
            quizzes.forEach(q => {
              if (q.scheduledStart && new Date(q.scheduledStart) > now) {
                upcoming.push({
                  id: q.id,
                  title: q.title,
                  roomName: j.name,
                  scheduledStart: q.scheduledStart,
                  scheduledEnd: q.scheduledEnd,
                  timeLimit: q.timeLimit
                });
              }
            });
          } catch (e) {
            // ignore per-room failures
          }
        }
        upcoming.sort((a,b) => new Date(a.scheduledStart) - new Date(b.scheduledStart));
        setUpcomingQuizzes(upcoming.slice(0,5));
      } catch (err) {
        setUpcomingQuizzes([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, joinedRooms]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">CampusCA Student Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user?.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/auth/change-password" className="btn btn-secondary">
                Change password
              </Link>
              <button onClick={handleLogout} className="btn btn-secondary">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'rooms', label: 'My Rooms' },
              { id: 'quizzes', label: 'Quizzes' },
              { id: 'results', label: 'Results' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Stats */}
            <div className="lg:col-span-2 space-y-8">
              <h2 className="text-xl font-bold mb-6">Dashboard Overview</h2>
            
              {/* Join Room Section */}
              <div className="card mb-8">
                <h3 className="text-lg font-bold mb-4">Join a New Room</h3>
                <form onSubmit={handleJoinRoom} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enter Room Code
                    </label>
                    <div className="flex gap-4">
                      <input
                        type="text"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        placeholder="ABC123"
                        className="form-input flex-1 text-center text-xl font-mono tracking-widest"
                        maxLength="6"
                        required
                      />
                      <button type="submit" className="btn btn-primary px-6">
                        Join Room
                      </button>
                    </div>
                  </div>
                </form>
                <div className="mt-4 text-center">
                  <button 
                    onClick={() => navigate('/join-room')}
                    className="text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Browse Available Rooms →
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="card">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Joined Rooms</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.joinedRooms}</p>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Completed Quizzes</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.completedQuizzes}</p>
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
                      <p className="text-2xl font-bold text-gray-900">{stats.averageScore}%</p>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Points</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalPoints}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="card">
                <h3 className="text-lg font-bold mb-4">Recent Quiz Results</h3>
                {recentQuizzes.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-2">📝</div>
                    <p className="text-gray-600">No quiz results yet</p>
                    <p className="text-sm text-gray-500">Complete quizzes to see your results here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentQuizzes
                      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
                      .slice(0, 5)
                      .map(quiz => (
                      <div key={quiz.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{quiz.quizName}</p>
                          <p className="text-sm text-gray-600">{quiz.roomName} • {new Date(quiz.completedAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${
                            quiz.score >= 80 ? 'text-green-600' : 
                            quiz.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {quiz.score}%
                          </p>
                          {quiz.points && (
                            <p className="text-xs text-gray-500">{quiz.points} points</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              {/* Upcoming Quizzes */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Upcoming Quizzes</h2>
                  <button className="btn btn-secondary text-sm" onClick={() => setActiveTab('quizzes')}>View All</button>
                </div>
                {upcomingQuizzes.length === 0 ? (
                  <p className="text-gray-600 text-sm">No upcoming quizzes scheduled.</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingQuizzes.map(uq => (
                      <div key={uq.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium text-gray-900">{uq.title}</p>
                          <p className="text-xs text-gray-600">{uq.roomName} • Starts {new Date(uq.scheduledStart).toLocaleString()}</p>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={() => {
                          // Resolve roomId by checking `joinedRooms` from state
                          const room = joinedRooms.find(r => r.name === uq.roomName || r.roomName === uq.roomName || String(r.id) === String(uq.roomId));
                          if (room) {
                            navigate(`/room/${room.id}/quiz/${uq.id}`);
                          } else {
                            alert('Room not found. Please open the room from your Rooms list.');
                          }
                        }}>View</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rooms' && (
          <div>
            <h2 className="text-xl font-bold mb-6">My Rooms</h2>
            
            {joinedRooms.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-6xl mb-4">🎓</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No rooms joined yet</h3>
                <p className="text-gray-600 mb-4">Join a room using a room code or browse available rooms.</p>
                <button 
                  onClick={() => navigate('/join-room')}
                  className="btn btn-primary"
                >
                  Browse Available Rooms
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {joinedRooms.map(join => (
                  <div key={join.id || join.code} className="card">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold">{join.name}</h3>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        (join.status === 'active') 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {join.status === 'active' ? 'Active' : 'Pending'}
                      </span>
                    </div>
                    <div className="mb-4">
                      <span className="text-sm font-medium text-gray-600">Room Code:</span>
                      <div className="mt-1 flex items-center justify-between bg-gray-100 px-3 py-2 rounded border">
                        <span className="font-mono font-bold text-lg text-gray-900">{join.code}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(join.code || '');
                            alert('Room code copied to clipboard!');
                          }}
                          className="text-gray-500 hover:text-gray-700 text-sm"
                          title="Copy room code"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-gray-600">
                        Joined: {join.joinedAt ? new Date(join.joinedAt).toLocaleDateString() : '—'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Status: {join.status}
                      </p>
                    </div>
                    <button 
                      onClick={() => navigate(`/room/${join.code}`)}
                      className={`btn w-full ${
                        join.status === 'active' ? 'btn-primary' : 'btn-secondary'
                      }`}
                      disabled={join.status !== 'active'}
                    >
                      {join.status === 'active' ? 'Enter Room' : 'Waiting for Approval'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'quizzes' && (
          <div>
            <h2 className="text-xl font-bold mb-6">Available Quizzes</h2>
            
            {joinedRooms.length === 0 ? (
              <div className="card">
                <p className="text-gray-600">Join a room to see available quizzes.</p>
                <div className="mt-4">
                  <button 
                    onClick={() => navigate('/join-room')}
                    className="btn btn-primary"
                  >
                    Browse Rooms
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {joinedRooms.map(join => (
                  <div key={join.id || join.code} className="card">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-gray-900">{join.name}</h3>
                        <p className="text-sm text-gray-600">Room Code: {join.code}</p>
                      </div>
                      <button
                        onClick={() => navigate(`/room/${join.id}/quizzes`)}
                        className="btn btn-primary"
                        disabled={join.status !== 'active'}
                      >
                        View Quizzes
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'results' && (
          <div>
            <h2 className="text-xl font-bold mb-6">Quiz Results</h2>
            
            {recentQuizzes.length === 0 ? (
              <div className="card">
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📊</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No quiz results yet</h3>
                  <p className="text-gray-600 mb-4">Complete quizzes to see your results and performance history.</p>
                  <button className="btn btn-primary">Browse Available Quizzes</button>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Quiz Name</th>
                        <th className="text-left py-2">Room</th>
                        <th className="text-left py-2">Score</th>
                        <th className="text-left py-2">Points</th>
                        <th className="text-left py-2">Date</th>
                        <th className="text-left py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentQuizzes
                        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
                        .map(quiz => (
                        <tr key={quiz.id} className="border-b">
                          <td className="py-2 font-medium">{quiz.quizName}</td>
                          <td className="py-2">{quiz.roomName}</td>
                          <td className="py-2">
                            <span className={`font-bold ${quiz.score >= 80 ? 'text-green-600' : quiz.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {quiz.score}%
                            </span>
                          </td>
                          <td className="py-2">{quiz.points || 0}</td>
                          <td className="py-2">{new Date(quiz.completedAt).toLocaleDateString()}</td>
                          <td className="py-2">
                            <button 
                              onClick={() => navigate(`/room/${quiz.roomId}/quiz/${quiz.quizId}/results`)}
                              className="btn btn-secondary text-sm"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentDashboard;
