/* eslint-disable react-hooks/exhaustive-deps */   
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function RoomDetails() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { apiRequest } = useAuth();
  const [room, setRoom] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load room details from backend
    (async () => {
      try {
        const data = await apiRequest(`/api/rooms/${roomId}`);
        const fetchedRoom = data.room || data;
        const members = data.members || [];
        setRoom(fetchedRoom);
        setStudents(members);
      } catch (err) {
        // ignore — handled below
      } finally {
        setLoading(false);
      }
    })();
  }, [roomId]);

  const handleDeleteRoom = () => {
    if (window.confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
      (async () => {
        try {
          await apiRequest(`/api/rooms/${roomId}`, { method: 'DELETE' });
          navigate('/teacher');
        } catch (err) {
          alert('Failed to delete room: ' + err.message);
        }
      })();
    }
  };

  const handleApproveStudent = (studentId) => {
    (async () => {
      try {
        await apiRequest(`/api/rooms/${roomId}/members/${studentId}/approve`, { method: 'POST' });
        const data = await apiRequest(`/api/rooms/${roomId}`);
        setStudents(data.members || []);
      } catch (err) {
        alert('Failed to approve student: ' + err.message);
      }
    })();
  };

  const handleRejectStudent = (studentId) => {
    if (window.confirm('Are you sure you want to reject this student?')) {
      (async () => {
        try {
          await apiRequest(`/api/rooms/${roomId}/members/${studentId}/reject`, { method: 'POST' });
          const data = await apiRequest(`/api/rooms/${roomId}`);
          setStudents(data.members || []);
        } catch (err) {
          alert('Failed to reject student: ' + err.message);
        }
      })();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading room details...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Room Not Found</h2>
          <p className="text-gray-600 mb-4">The room you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/teacher')}
            className="btn btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const activeStudents = students.filter(s => s.status === 'active');
  const pendingStudents = students.filter(s => s.status === 'pending');

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
                onClick={() => navigate(`/manage-room/${roomId}`)}
                className="btn btn-secondary"
              >
                Manage Room
              </button>
              <button
                onClick={() => navigate('/teacher')}
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
                  <label className="text-sm font-medium text-gray-600">Max Students</label>
                  <p className="text-gray-900">{room.maxStudents}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Created</label>
                  <p className="text-gray-900">{new Date(room.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Settings</label>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-900">
                      Self Join: {room.allowSelfJoin ? '✅ Allowed' : '❌ Not Allowed'}
                    </p>
                    <p className="text-sm text-gray-900">
                      Approval Required: {room.requireApproval ? '✅ Yes' : '❌ No'}
                    </p>
                  </div>
                </div>
              </div>
              {room.description && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-600">Description</label>
                  <p className="text-gray-900 mt-1">{room.description}</p>
                </div>
              )}
            </div>

            {/* Students List */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Students ({students.length})</h2>
              
              {students.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">👥</div>
                  <p className="text-gray-600">No students have joined this room yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Active Students */}
                  {activeStudents.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-green-800 mb-2">
                        Active Students ({activeStudents.length})
                      </h3>
                      <div className="space-y-2">
                        {activeStudents.map(student => {
                          const memberId = student.id || student.studentId;
                          const name = student.student_name || student.studentName || 'Student';
                          const email = student.student_email || student.studentEmail || '';
                          const joinedAt = student.joined_at || student.joinedAt;
                          return (
                          <div key={memberId} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div>
                              <p className="font-medium text-green-900">{name}</p>
                              <p className="text-sm text-green-700">{email}</p>
                              <p className="text-xs text-green-600">
                                Joined: {new Date(joinedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleRejectStudent(memberId)}
                                className="btn btn-secondary text-xs"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        )})}
                      </div>
                    </div>
                  )}

                  {/* Pending Students */}
                  {pendingStudents.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-yellow-800 mb-2">
                        Pending Approval ({pendingStudents.length})
                      </h3>
                      <div className="space-y-2">
                        {pendingStudents.map(student => {
                          const memberId = student.id || student.studentId;
                          const name = student.student_name || student.studentName || 'Student';
                          const email = student.student_email || student.studentEmail || '';
                          const requestedAt = student.joined_at || student.joinedAt;
                          return (
                          <div key={memberId} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div>
                              <p className="font-medium text-yellow-900">{name}</p>
                              <p className="text-sm text-yellow-700">{email}</p>
                              <p className="text-xs text-yellow-600">
                                Requested: {new Date(requestedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApproveStudent(memberId)}
                                className="btn btn-success text-xs"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectStudent(memberId)}
                                className="btn btn-secondary text-xs"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        )})}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="card">
              <h3 className="text-lg font-bold mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Students:</span>
                  <span className="font-bold">{students.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Students:</span>
                  <span className="font-bold text-green-600">{activeStudents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending Approval:</span>
                  <span className="font-bold text-yellow-600">{pendingStudents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Available Spots:</span>
                  <span className="font-bold">{room.maxStudents - students.length}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
              <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate(`/manage-room/${roomId}`)}
                  className="btn btn-primary w-full"
                >
                  Edit Room Settings
                </button>
                <button 
                  onClick={() => navigate(`/room/${roomId}/create-quiz`)}
                  className="btn btn-success w-full"
                >
                  Create Quiz
                </button>
                <button 
                  onClick={() => navigate(`/room/${roomId}/manage-quizzes`)}
                  className="btn btn-secondary w-full"
                >
                  Manage Quizzes
                </button>
                <button 
                  onClick={() => navigate(`/room/${roomId}/analytics`)}
                  className="btn btn-secondary w-full"
                >
                  View Analytics
                </button>
                <button
                  onClick={handleDeleteRoom}
                  className="btn btn-secondary w-full text-red-600 hover:bg-red-50"
                >
                  Delete Room
                </button>
              </div>
            </div>

            {/* Room Code */}
            <div className="card bg-blue-50 border-blue-200">
              <h3 className="text-lg font-bold text-blue-900 mb-2">Share Room Code</h3>
              <p className="text-blue-800 text-sm mb-3">
                Students can join using this code:
              </p>
              <div className="bg-white p-3 rounded border">
                <p className="text-2xl font-mono font-bold text-center text-blue-900">
                  {room.code}
                </p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(room.code);
                  alert('Room code copied to clipboard!');
                }}
                className="btn btn-primary w-full mt-3"
              >
                Copy Code
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoomDetails;
