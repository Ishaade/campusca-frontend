import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function LandingPage() {
  const { clearAllData, apiRequest } = useAuth();
  const [showDebug, setShowDebug] = useState(false);
  const [debugCounts, setDebugCounts] = useState({ rooms: 0, joins: 0, quizResults: 0 });

  useEffect(() => {
    if (!showDebug) return;
    let mounted = true;
    (async () => {
      try {
        const roomsRes = await apiRequest('/api/rooms');
        const rooms = roomsRes?.rooms || roomsRes || [];
        const roomsCount = Array.isArray(rooms) ? rooms.length : 0;

        // For student joins and quiz results there may not be a global API
        // endpoint available; fall back to localStorage counts if needed.
        const joins = JSON.parse(localStorage.getItem('campusca_student_rooms') || '[]').length;
        const quizResults = JSON.parse(localStorage.getItem('campusca_quiz_results') || '[]').length;

        if (mounted) setDebugCounts({ rooms: roomsCount, joins, quizResults });
      } catch (err) {
        // Fallback to localStorage counts
        if (mounted) setDebugCounts({
          rooms: JSON.parse(localStorage.getItem('campusca_rooms') || '[]').length,
          joins: JSON.parse(localStorage.getItem('campusca_student_rooms') || '[]').length,
          quizResults: JSON.parse(localStorage.getItem('campusca_quiz_results') || '[]').length
        });
      }
    })();
    return () => { mounted = false; };
  }, [showDebug, apiRequest]);

  const handleClearData = () => {
    if (window.confirm('This will clear all room data. Are you sure?')) {
      clearAllData();
      window.location.reload();
    }
  };

  const addSampleQuizResults = () => {
    const sampleResults = [
      {
        id: Date.now() + 1,
        studentId: 'test-student-1',
        studentName: 'Test Student',
        quizName: 'Math Quiz 1',
        roomName: 'Math 101',
        roomCode: 'ABC123',
        score: 85,
        points: 85,
        completedAt: new Date().toISOString(),
        status: 'completed'
      },
      {
        id: Date.now() + 2,
        studentId: 'test-student-1',
        studentName: 'Test Student',
        quizName: 'Science Test',
        roomName: 'Science Class',
        roomCode: 'XYZ789',
        score: 92,
        points: 92,
        completedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        status: 'completed'
      },
      {
        id: Date.now() + 3,
        studentId: 'test-student-1',
        studentName: 'Test Student',
        quizName: 'History Quiz',
        roomName: 'History 101',
        roomCode: 'DEF456',
        score: 78,
        points: 78,
        completedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        status: 'completed'
      }
    ];

    const existingResults = JSON.parse(localStorage.getItem('campusca_quiz_results') || '[]');
    const updatedResults = [...existingResults, ...sampleResults];
    localStorage.setItem('campusca_quiz_results', JSON.stringify(updatedResults));
    alert('Sample quiz results added!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-indigo-600">CampusCA</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* <button
                onClick={() => setShowDebug(!showDebug)}
                className="text-gray-500 hover:text-gray-700 px-2 py-1 text-xs"
                title="Toggle debug panel"
              >
                
              </button> */}
              <Link
                to="/auth/login"
                className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign In
              </Link>
              {/* <button
                type="button"
                disabled
                className="bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium cursor-not-allowed"
                title="Registration disabled"
              >
                Registration Closed
              </button> */}
            </div>
          </div>
        </div>
      </nav>

      {/* Debug Panel */}
      {showDebug && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-yellow-800">Debug Panel</h3>
                <p className="text-xs text-yellow-700">
                  Rooms: {debugCounts.rooms} | 
                  Student Joins: {debugCounts.joins} | 
                  Quiz Results: {debugCounts.quizResults}
                </p>
              </div>
                      <div className="flex gap-2">
                        <button
                          onClick={addSampleQuizResults}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                        >
                          Add Sample Quiz Results
                        </button>
                        <button
                          onClick={handleClearData}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
                        >
                          Clear All Data
                        </button>
                      </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">Transform Your</span>{' '}
                  <span className="block text-indigo-600 xl:inline">Classroom</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Create interactive quiz rooms, engage students in real-time, and track learning progress with CampusCA's comprehensive quiz platform designed for modern education.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <Link
                      to="/auth/login"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
                    >
                      Teacher Sign In
                    </Link>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <Link
                      to="/auth/login"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 md:py-4 md:text-lg md:px-10"
                    >
                      Student Sign In
                    </Link>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <div className="h-56 w-full bg-gradient-to-r from-indigo-400 to-purple-500 sm:h-72 md:h-96 lg:w-full lg:h-full flex items-center justify-center">
            <div className="text-white text-center">
              <div className="text-6xl mb-4">🎓</div>
              <h3 className="text-2xl font-bold">Interactive Learning</h3>
              <p className="text-lg opacity-90">Real-time quizzes, instant feedback</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need for modern education
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              CampusCA provides all the tools teachers and students need for engaging, interactive learning experiences.
            </p>
          </div>

          <div className="mt-10">
            <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10 lg:grid-cols-3">
              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    🏠
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Quiz Rooms</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  Create virtual quiz rooms with unique codes. Invite students easily and manage multiple classes simultaneously.
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    ⚡
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Real-time Quizzes</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  Conduct live quizzes with instant student participation. Monitor progress in real-time as students submit answers.
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    📊
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Analytics & Reports</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  Get detailed insights into student performance. Track progress, identify knowledge gaps, and export comprehensive reports.
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    ❓
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Multiple Question Types</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  Support for multiple choice, true/false, short answer, and image-based questions. Create diverse, engaging assessments.
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    📱
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Mobile Responsive</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  Access CampusCA from any device. Students can participate using smartphones, tablets, or computers seamlessly.
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    🔒
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Secure & Reliable</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  Enterprise-grade security with role-based access control. Your data and quizzes are protected with industry-standard encryption.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">Benefits</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Perfect for teachers and students
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* For Teachers */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center mb-4">
                <div className="text-3xl mr-3">👩‍🏫</div>
                <h3 className="text-xl font-bold text-gray-900">For Teachers</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="text-green-500 mr-2">✓</div>
                  <span className="text-gray-600">Save time with automated grading and instant feedback</span>
                </li>
                <li className="flex items-start">
                  <div className="text-green-500 mr-2">✓</div>
                  <span className="text-gray-600">Engage students with interactive, real-time quizzes</span>
                </li>
                <li className="flex items-start">
                  <div className="text-green-500 mr-2">✓</div>
                  <span className="text-gray-600">Track student progress with detailed analytics</span>
                </li>
                <li className="flex items-start">
                  <div className="text-green-500 mr-2">✓</div>
                  <span className="text-gray-600">Create reusable question banks for efficiency</span>
                </li>
              </ul>
            </div>

            {/* For Students */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center mb-4">
                <div className="text-3xl mr-3">🎓</div>
                <h3 className="text-xl font-bold text-gray-900">For Students</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="text-green-500 mr-2">✓</div>
                  <span className="text-gray-600">Join classes easily with simple room codes</span>
                </li>
                <li className="flex items-start">
                  <div className="text-green-500 mr-2">✓</div>
                  <span className="text-gray-600">Get instant feedback on quiz performance</span>
                </li>
                <li className="flex items-start">
                  <div className="text-green-500 mr-2">✓</div>
                  <span className="text-gray-600">Access quizzes from any device, anywhere</span>
                </li>
                <li className="flex items-start">
                  <div className="text-green-500 mr-2">✓</div>
                  <span className="text-gray-600">View performance history and track improvement</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-indigo-700">
        <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            <span className="block">Ready to transform your classroom?</span>
          </h2>
          <p className="mt-4 text-lg leading-6 text-indigo-200">
            Join CampusCA to create engaging learning experiences.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/auth/login"
              className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 sm:w-auto"
            >
              Sign In
            </Link>
            {/* <Link
              to="/auth/login"
              className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-500 bg-opacity-20 hover:bg-opacity-30 sm:w-auto"
            >
              Sign In
            </Link> */}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            <div className="text-gray-400 hover:text-gray-300">
              📧 campusca4@gmail.com
            </div>
          </div>
          <div className="mt-8 md:mt-0 md:order-1">
            <p className="text-center text-base text-gray-400">
              &copy; 2025 CampusCA. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;

