/* eslint-disable react-hooks/exhaustive-deps */   
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function RoomManagement() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { apiRequest } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: '',
    maxStudents: 50,
    allowSelfJoin: true,
    requireApproval: false
  });

  useEffect(() => {
    // Load room data for editing from backend
    (async () => {
      try {
        const data = await apiRequest(`/api/rooms/${roomId}`);
        const room = data.room || data;
        if (room) {
          setFormData({
            name: room.name,
            description: room.description || '',
            subject: room.subject || '',
            maxStudents: room.maxStudents || room.max_students || 50,
            allowSelfJoin: room.allowSelfJoin ?? room.allow_self_join ?? true,
            requireApproval: room.requireApproval ?? room.require_approval ?? false
          });
        }
      } catch (err) {
        setError('Failed to load room.');
      }
    })();
  }, [roomId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        subject: formData.subject,
        maxStudents: Number(formData.maxStudents),
        allowSelfJoin: Boolean(formData.allowSelfJoin),
        requireApproval: Boolean(formData.requireApproval)
      };

      await apiRequest(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

      setSuccess('Room updated successfully!');
      setTimeout(() => navigate(`/room-details/${roomId}`), 1000);

    } catch (err) {
      setError('Failed to update room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manage Room</h1>
              <p className="text-gray-600">Edit room settings and preferences</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/room-details/${roomId}`)}
                className="btn btn-secondary"
              >
                View Room
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
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                  {success}
                </div>
              )}

              {/* Room Name */}
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  Room Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g., Math 101 - Algebra"
                  required
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label htmlFor="description" className="form-label">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="form-input"
                  rows="3"
                  placeholder="Brief description of the room and its purpose..."
                />
              </div>

              {/* Subject */}
              <div className="form-group">
                <label htmlFor="subject" className="form-label">
                  Subject
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="">Select a subject</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Science">Science</option>
                  <option value="English">English</option>
                  <option value="History">History</option>
                  <option value="Geography">Geography</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Art">Art</option>
                  <option value="Music">Music</option>
                  <option value="Physical Education">Physical Education</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Max Students */}
              <div className="form-group">
                <label htmlFor="maxStudents" className="form-label">
                  Maximum Students
                </label>
                <input
                  type="number"
                  id="maxStudents"
                  name="maxStudents"
                  value={formData.maxStudents}
                  onChange={handleChange}
                  className="form-input"
                  min="1"
                  max="200"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Maximum number of students who can join this room
                </p>
              </div>

              {/* Room Settings */}
              <div className="form-group">
                <label className="form-label">Room Settings</label>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="allowSelfJoin"
                      name="allowSelfJoin"
                      checked={formData.allowSelfJoin}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="allowSelfJoin" className="ml-2 text-sm text-gray-700">
                      Allow students to join using room code
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="requireApproval"
                      name="requireApproval"
                      checked={formData.requireApproval}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="requireApproval" className="ml-2 text-sm text-gray-700">
                      Require teacher approval for student joins
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => navigate(`/room-details/${roomId}`)}
                  className="btn btn-secondary flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={loading}
                >
                  {loading ? 'Updating Room...' : 'Update Room'}
                </button>
              </div>
            </form>
          </div>

          {/* Room Preview */}
          <div className="mt-8">
            <h3 className="text-lg font-bold mb-4">Room Preview</h3>
            <div className="card bg-blue-50 border-blue-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-xl font-bold text-blue-900">{formData.name}</h4>
                  {formData.subject && (
                    <p className="text-blue-700">{formData.subject}</p>
                  )}
                </div>
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                  {roomId}
                </span>
              </div>
              {formData.description && (
                <p className="text-blue-700 mb-4">{formData.description}</p>
              )}
              <div className="text-sm text-blue-600">
                <p>Max Students: {formData.maxStudents}</p>
                <p>Self Join: {formData.allowSelfJoin ? 'Allowed' : 'Not Allowed'}</p>
                <p>Approval Required: {formData.requireApproval ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoomManagement;
