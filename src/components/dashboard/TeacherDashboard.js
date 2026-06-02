import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function TeacherDashboard() {
  const { user, logout, apiRequest } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const handleLogout = () => {
    logout();
  };

  const [rooms, setRooms] = useState([]);
  const [stats, setStats] = useState({
    totalRooms: 0,
    activeStudents: 0,
    totalQuizzes: 0,
    completedQuizzes: 0
  });

  useEffect(() => {
    // Load rooms from backend (preferred) and compute stats; fallback to localStorage
    let mounted = true;
    (async () => {
      try {
        const data = await apiRequest('/api/rooms');
        const savedRooms = data.rooms || data || [];
        if (!mounted) return;
        setRooms(savedRooms);

        const totalRooms = savedRooms.length;
        const activeStudents = savedRooms.reduce((sum, room) => sum + (room.studentCount || 0), 0);
        const totalQuizzes = savedRooms.reduce((sum, room) => sum + (room.quizCount || 0), 0);

        // Attempt to collect completed quizzes from analytics per room if available
        let completedQuizzes = 0;
        for (const r of savedRooms) {
          try {
            const a = await apiRequest(`/api/analytics/rooms/${r.id}`);
            // analytics endpoint returns { status, analytics: { quizResults: [...] }}
            completedQuizzes += (a?.analytics?.quizResults || []).length || 0;
          } catch (e) {
            // ignore per-room analytics failures
          }
        }

        setStats({ totalRooms, activeStudents, totalQuizzes, completedQuizzes });
      } catch (err) {
        // Fallback to localStorage as before
        const savedRooms = JSON.parse(localStorage.getItem('campusca_rooms') || '[]');
        setRooms(savedRooms);
        const totalRooms = savedRooms.length;
        const activeStudents = savedRooms.reduce((sum, room) => sum + (room.studentCount || 0), 0);
        const quizResults = JSON.parse(localStorage.getItem('campusca_quiz_results') || '[]');
        const totalQuizzes = quizResults.length;
        const completedQuizzes = quizResults.filter(result => result.status === 'completed').length;
        setStats({ totalRooms, activeStudents, totalQuizzes, completedQuizzes });
      }
    })();
    return () => { mounted = false; };
  }, [user?.id, apiRequest]);

  // Load quizzes for the teacher when the quizzes tab is opened
  const [myQuizzes, setMyQuizzes] = useState([]);
  const safeDate = (value, withTime = false) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return withTime ? d.toLocaleString() : d.toLocaleDateString();
  };
  useEffect(() => {
    let mounted = true;
    if (activeTab !== 'quizzes') return;
    (async () => {
      try {
        const allQuizzes = [];
        const roomIdToName = new Map(rooms.map(r => [String(r.id), r.name]));
        for (const r of rooms) {
          try {
            const qres = await apiRequest(`/api/quizzes/rooms/${r.id}`);
            const quizzes = qres.quizzes || qres || [];
            quizzes.forEach(q => {
              allQuizzes.push({
                ...q,
                roomId: q.roomId || q.room_id || r.id,
                roomName: q.roomName || q.room_name || roomIdToName.get(String(q.roomId || q.room_id || r.id)) || r.name,
                createdAt: q.createdAt || q.created_at,
                scheduledStart: q.scheduledStart || q.scheduled_start,
                scheduledEnd: q.scheduledEnd || q.scheduled_end,
                timeLimit: q.timeLimit || q.time_limit
              });
            });
          } catch (e) {
            // ignore per-room failures
          }
        }
        if (mounted) setMyQuizzes(allQuizzes);
      } catch (e) {
        // fallback: use localStorage
        const quizzes = JSON.parse(localStorage.getItem('campusca_quizzes') || '[]');
        if (mounted) setMyQuizzes(quizzes);
      }
    })();
    return () => { mounted = false; };
  }, [activeTab, rooms, apiRequest]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">CampusCA Teacher Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user?.name}</p>
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
            >
              Logout
            </button>
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
              { id: 'analytics', label: 'Analytics' }
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
          <div>
            <h2 className="text-xl font-bold mb-6">Dashboard Overview</h2>
            
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
                    <p className="text-sm font-medium text-gray-600">Total Rooms</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalRooms}</p>
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
                    <p className="text-2xl font-bold text-gray-900">{stats.activeStudents}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Quizzes</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalQuizzes}</p>
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
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.completedQuizzes}</p>
                  </div>
                </div>
              </div>
            </div>

            
          </div>
        )}

        {activeTab === 'rooms' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">My Rooms</h2>
              <button 
                onClick={() => navigate('/create-room')}
                className="btn btn-primary"
              >
                Create New Room
              </button>
            </div>
            
            {rooms.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-6xl mb-4">🏫</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No rooms created yet</h3>
                <p className="text-gray-600 mb-4">Create your first room to get started with quizzes.</p>
                <button 
                  onClick={() => navigate('/create-room')}
                  className="btn btn-primary"
                >
                  Create Your First Room
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rooms.map(room => (
                  <div key={room.id} className="card">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-bold">{room.name}</h3>
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        {room.code}
                      </span>
                    </div>
                    {room.subject && (
                      <p className="text-sm text-gray-600 mb-2">{room.subject}</p>
                    )}
                    {room.description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{room.description}</p>
                    )}
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">{room.studentCount}</span> students
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">{room.quizCount}</span> quizzes
                      </p>
                      <p className="text-sm text-gray-600">
                        Max: <span className="font-medium">{room.maxStudents}</span> students
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => navigate(`/manage-room/${room.id}`)}
                        className="btn btn-secondary flex-1"
                      >
                        Manage
                      </button>
                      <button 
                        onClick={() => navigate(`/room-details/${room.id}`)}
                        className="btn btn-primary flex-1"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'quizzes' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold">My Quizzes</h2>
            </div>
            {(() => {
              if (!myQuizzes || myQuizzes.length === 0) {
                return (
                  <div className="card">
                    <p className="text-gray-600">No quizzes found.</p>
                  </div>
                );
              }

              const roomIdToName = new Map(rooms.map(r => [r.id, r.name]));

              return (
                <div className="card overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600">
                        <th className="py-2 pr-4">Title</th>
                        <th className="py-2 pr-4">Room</th>
                        <th className="py-2 pr-4">Questions</th>
                        <th className="py-2 pr-4">Time</th>
                        <th className="py-2 pr-4">Schedule</th>
                        <th className="py-2 pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myQuizzes
                        .sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                        .map(q => (
                        <tr key={q.id} className="border-t">
                          <td className="py-2 pr-4 font-medium text-gray-900">{q.title}</td>
                          <td className="py-2 pr-4">{q.roomName || roomIdToName.get(q.roomId) || q.roomId}</td>
                          <td className="py-2 pr-4">{q.questions?.length || 0}</td>
                          <td className="py-2 pr-4">{q.timeLimit} min</td>
                          <td className="py-2 pr-4 text-xs text-gray-600">
                            {q.scheduledStart ? `Start: ${safeDate(q.scheduledStart, true)}` : '—'}
                            {q.scheduledEnd ? ` \u00B7 End: ${safeDate(q.scheduledEnd, true)}` : ''}
                          </td>
                          <td className="py-2 pr-4">
                            <div className="flex gap-2">
                              <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/room/${q.roomId}/edit-quiz/${q.id}`)}>Edit</button>
                              <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/room/${q.roomId}/manage-quizzes`)}>Manage</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Analytics</h2>
              {rooms.length > 0 && (
                <button 
                  onClick={() => navigate(`/room/${rooms[0].id}/analytics`)}
                  className="btn btn-primary"
                >
                  View Detailed Analytics
                </button>
              )}
            </div>
            
            {rooms.length === 0 ? (
              <div className="card">
                <p className="text-gray-600">Create a room to view analytics and reports.</p>
                <div className="mt-4">
                  <button 
                    onClick={() => navigate('/create-room')}
                    className="btn btn-primary"
                  >
                    Create Your First Room
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {rooms.map(room => (
                  <div key={room.id} className="card">
                    <h3 className="font-bold text-gray-900 mb-2">{room.name}</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>Students: {room.studentCount}</p>
                      <p>Quizzes: {room.quizCount}</p>
                    </div>
                    <button
                      onClick={() => navigate(`/room/${room.id}/analytics`)}
                      className="btn btn-primary w-full mt-4"
                    >
                      View Analytics
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TeacherDashboard;
