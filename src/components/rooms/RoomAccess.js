import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function RoomAccess() {
  const { roomCode } = useParams();
  const { user, apiRequest } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [studentJoin, setStudentJoin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await apiRequest(`/api/rooms/code/${roomCode.toUpperCase()}`);
        const fetchedRoom = data.room || data;
        const members = data.members || [];
        setRoom(fetchedRoom);
        // find this student's membership
        const join = members.find(m => m.student_id === user?.id || m.studentId === user?.id);
        if (!join) {
          setError('You are not a member of this room. Please join using the room code first.');
        } else {
          setStudentJoin(join);
        }
      } catch (err) {
        setError(err.message || 'Room not found.');
      } finally {
        setLoading(false);
      }
    })();
  }, [roomCode, user?.id]);

  const handleLeaveRoom = () => {
    if (window.confirm('Are you sure you want to leave this room?')) {
      (async () => {
        try {
          await apiRequest(`/api/rooms/${room.id}/members/${studentJoin.id}/reject`, { method: 'POST' });
          navigate('/student');
        } catch (err) {
          alert('Failed to leave room: ' + err.message);
        }
      })();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
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

  if (!room || !studentJoin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Room Not Found</h2>
          <p className="text-gray-600 mb-4">The room you're looking for doesn't exist.</p>
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
              <h1 className="text-2xl font-bold text-gray-900">{room.name}</h1>
              <p className="text-gray-600">Room Code: {room.code}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleLeaveRoom}
                className="btn btn-secondary"
              >
                Leave Room
              </button>
              <button
                onClick={() => navigate('/student')}
                className="btn btn-primary"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Room Information */}
          <div className="lg:col-span-2">
            <div className="card mb-6">
              <h2 className="text-xl font-bold mb-4">Room Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Room Name</label>
                  <p className="text-gray-900">{room.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Room Code</label>
                  <p className="text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">{room.code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Subject</label>
                  <p className="text-gray-900">{room.subject || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Teacher</label>
                  <p className="text-gray-900">{room.teacherName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Students</label>
                  <p className="text-gray-900">{room.studentCount}/{room.maxStudents}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Your Status</label>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    studentJoin.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {studentJoin.status === 'active' ? 'Active Member' : 'Pending Approval'}
                  </span>
                </div>
              </div>
              {room.description && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-600">Description</label>
                  <p className="text-gray-900 mt-1">{room.description}</p>
                </div>
              )}
            </div>

            {/* Available Quizzes */}
            <div className="card mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Available Quizzes</h2>
                <button
                  onClick={() => navigate(`/room/${room.id}/quizzes`)}
                  className="btn btn-primary text-sm"
                >
                  View All Quizzes
                </button>
              </div>
              {room.quizCount > 0 ? (
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-medium text-blue-900">Quizzes Available</h3>
                    <p className="text-sm text-blue-700">Your teacher has created {room.quizCount} quiz{room.quizCount !== 1 ? 'es' : ''} for this room.</p>
                    <div className="mt-2 flex gap-2">
                      <button 
                        onClick={() => navigate(`/room/${room.id}/quizzes`)}
                        className="btn btn-primary text-sm"
                      >
                        View Quizzes
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">📝</div>
                  <p className="text-gray-600">No quizzes available yet.</p>
                  <p className="text-sm text-gray-500">Check back later for new quizzes from your teacher.</p>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <div>
                    <p className="text-sm font-medium">You joined this room</p>
                    <p className="text-xs text-gray-500">{new Date(studentJoin.joinedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                {studentJoin.status === 'active' && (
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <div>
                      <p className="text-sm font-medium">You are now an active member</p>
                      <p className="text-xs text-gray-500">You can participate in quizzes and activities</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Your Status */}
            <div className="card">
              <h3 className="text-lg font-bold mb-4">Your Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${
                    studentJoin.status === 'active' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {studentJoin.status === 'active' ? 'Active' : 'Pending'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Joined:</span>
                  <span className="font-medium">{new Date(studentJoin.joinedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Room Code:</span>
                  <span className="font-mono font-bold">{room.code}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
              <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {studentJoin.status === 'active' ? (
                  <>
                    <button className="btn btn-primary w-full" onClick={() => navigate(`/room/${room.id}/quizzes`)}>
                      View Available Quizzes
                    </button>
                    <button className="btn btn-success w-full" onClick={async () => {
                      // Prefer fetching quizzes from API; fallback to localStorage if API fails
                      try {
                        const qres = await apiRequest(`/api/quizzes/rooms/${room.id}`);
                        const roomQuizzes = qres.quizzes || qres || [];
                        const now = new Date();
                        const firstAvailable = roomQuizzes.find(q => {
                          const startOk = !q.scheduledStart || now >= new Date(q.scheduledStart);
                          const endOk = !q.scheduledEnd || now <= new Date(q.scheduledEnd);
                          return startOk && endOk;
                        });
                        if (firstAvailable) {
                          navigate(`/room/${room.id}/quiz/${firstAvailable.id}`);
                        } else {
                          alert('No available quizzes at the moment.');
                        }
                      } catch (e) {
                        try {
                          const quizzes = JSON.parse(localStorage.getItem('campusca_quizzes') || '[]');
                          const roomQuizzes = quizzes.filter(q => q.roomId === room.id);
                          const now = new Date();
                          const firstAvailable = roomQuizzes.find(q => {
                            const startOk = !q.scheduledStart || now >= new Date(q.scheduledStart);
                            const endOk = !q.scheduledEnd || now <= new Date(q.scheduledEnd);
                            return startOk && endOk;
                          });
                          if (firstAvailable) {
                            navigate(`/room/${room.id}/quiz/${firstAvailable.id}`);
                          } else {
                            alert('No available quizzes at the moment.');
                          }
                        } catch (le) {
                          alert('No available quizzes at the moment.');
                        }
                      }
                    }}>
                      Take Quiz
                    </button>
                    <button className="btn btn-secondary w-full" onClick={() => navigate(`/room/${room.id}/quizzes`)}>
                      View Results
                    </button>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-yellow-500 text-4xl mb-2">⏳</div>
                    <p className="text-sm text-gray-600">Waiting for teacher approval</p>
                    <p className="text-xs text-gray-500">You'll be able to access quizzes once approved</p>
                  </div>
                )}
              </div>
            </div>

            {/* Room Info */}
            <div className="card bg-blue-50 border-blue-200">
              <h3 className="text-lg font-bold text-blue-900 mb-2">Room Details</h3>
              <div className="space-y-2 text-blue-800">
                <p><strong>Teacher:</strong> {room.teacherName}</p>
                <p><strong>Subject:</strong> {room.subject || 'Not specified'}</p>
                <p><strong>Students:</strong> {room.studentCount}/{room.maxStudents}</p>
                <p><strong>Quizzes:</strong> {room.quizCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoomAccess;



