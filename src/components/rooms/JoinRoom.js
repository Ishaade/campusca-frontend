import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function JoinRoom() {
  const { user, apiRequest } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [availableRooms, setAvailableRooms] = useState([]);
  const [joinedRoomCodes, setJoinedRoomCodes] = useState([]);

  useEffect(() => {
    // Attempt to load rooms from the backend. If the backend does not return
    // a public list of rooms, the list will be empty and students can still
    // join by code using the join API.
    (async () => {
      try {
        const data = await apiRequest('/api/rooms');
        const rooms = data.rooms || [];
        setAvailableRooms(rooms);

        // For students, /api/rooms returns joined rooms. Map codes for joined check.
        const joinedCodes = rooms.map(r => r.code);
        setJoinedRoomCodes(joinedCodes);
      } catch (err) {
        // If the API isn't available or returns an error, leave lists empty
        setAvailableRooms([]);
        setJoinedRoomCodes([]);
      }
    })();
  }, [user?.id]);

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Ask backend to join the room by code
      const payload = { code: roomCode.toUpperCase() };
      const data = await apiRequest('/api/rooms/join', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const membership = data.membership || data;
      if (membership.status === 'pending') {
        setSuccess(`Requested to join. Waiting for teacher approval.`);
        setRoomCode('');
        setTimeout(() => navigate('/student'), 1500);
      } else {
        setSuccess(`Successfully joined the room!`);
        setRoomCode('');
        setTimeout(() => navigate(`/room/${membership.room_id || membership.roomId || membership.roomId}`), 1000);
      }

    } catch (err) {
      setError('Failed to join room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByInvitation = (room) => {
    setRoomCode(room.code);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Join a Room</h1>
              <p className="text-gray-600">Enter a room code or browse available rooms</p>
            </div>
            <button
              onClick={() => navigate('/student')}
              className="btn btn-secondary"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          {/* Join by Code Section */}
          <div className="card mb-8">
            <h2 className="text-xl font-bold mb-4">Join with Room Code</h2>
            <form onSubmit={handleJoinByCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Room Code
                </label>
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="form-input flex-1 text-center text-2xl font-mono tracking-widest"
                    placeholder="ABC123"
                    maxLength="6"
                    required
                  />
                  <button
                    type="submit"
                    className="btn btn-primary px-8"
                    disabled={loading || roomCode.length !== 6}
                  >
                    {loading ? 'Joining...' : 'Join Room'}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Enter the 6-character room code provided by your teacher
                </p>
              </div>
            </form>
            
            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                {success}
              </div>
            )}
          </div>

          {/* Available Rooms Section */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Available Rooms</h2>
            
            {availableRooms.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-6xl mb-4">🏫</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No rooms available</h3>
                <p className="text-gray-600">Ask your teacher for a room code to join a class.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableRooms.map(room => (
                  <div key={room.id} className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                    joinedRoomCodes.includes(room.code) 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-gray-200'
                  }`}>
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-gray-900">{room.name}</h3>
                      <div className="flex items-center gap-2">
                        {joinedRoomCodes.includes(room.code) && (
                          <span className="text-green-600 text-xs">✓</span>
                        )}
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          joinedRoomCodes.includes(room.code)
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {room.code}
                        </span>
                      </div>
                    </div>
                    
                    {room.subject && (
                      <p className="text-sm text-gray-600 mb-2">{room.subject}</p>
                    )}
                    
                    {room.description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{room.description}</p>
                    )}
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Teacher:</span>
                        <span className="font-medium">{room.teacherName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Students:</span>
                        <span className="font-medium">{room.studentCount}/{room.maxStudents}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Quizzes:</span>
                        <span className="font-medium">{room.quizCount}</span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm">
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                          room.allowSelfJoin ? 'bg-green-500' : 'bg-red-500'
                        }`}></span>
                        <span className="text-gray-600">
                          {room.allowSelfJoin ? 'Self join allowed' : 'Teacher approval required'}
                        </span>
                      </div>
                      {room.requireApproval && (
                        <div className="flex items-center text-sm">
                          <span className="inline-block w-2 h-2 rounded-full mr-2 bg-yellow-500"></span>
                          <span className="text-gray-600">Approval required</span>
                        </div>
                      )}
                    </div>

                    {joinedRoomCodes.includes(room.code) ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/room/${room.code}`)}
                          className="btn btn-success flex-1"
                        >
                          Enter Room
                        </button>
                        <button
                          onClick={() => setRoomCode(room.code)}
                          className="btn btn-secondary"
                          title="Copy room code"
                        >
                          📋
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleJoinByInvitation(room)}
                          className="btn btn-primary flex-1"
                          disabled={!room.allowSelfJoin || room.studentCount >= room.maxStudents}
                        >
                          Join Room
                        </button>
                        <button
                          onClick={() => setRoomCode(room.code)}
                          className="btn btn-secondary"
                          title="Copy room code"
                        >
                          📋
                        </button>
                      </div>
                    )}

                    {joinedRoomCodes.includes(room.code) && (
                      <p className="text-xs text-green-600 mt-2">✓ Room already joined</p>
                    )}
                    {!joinedRoomCodes.includes(room.code) && room.studentCount >= room.maxStudents && (
                      <p className="text-xs text-red-600 mt-2">Room is full</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Help Section */}
          <div className="mt-8 card bg-blue-50 border-blue-200">
            <h3 className="text-lg font-bold text-blue-900 mb-3">Need Help?</h3>
            <div className="space-y-2 text-blue-800">
              <p>• Ask your teacher for the 6-character room code</p>
              <p>• Room codes are case-insensitive</p>
              <p>• Some rooms may require teacher approval to join</p>
              <p>• If a room is full, contact the teacher</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default JoinRoom;
