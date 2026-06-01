import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LandingPage from './components/LandingPage';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ChangePassword from './components/auth/ChangePassword';
import AdminUserManagement from './components/admin/AdminUserManagement';
import TeacherDashboard from './components/dashboard/TeacherDashboard';
import StudentDashboard from './components/dashboard/StudentDashboard';
import CreateRoom from './components/rooms/CreateRoom';
import JoinRoom from './components/rooms/JoinRoom';
import RoomDetails from './components/rooms/RoomDetails';
import RoomManagement from './components/rooms/RoomManagement';
import RoomAccess from './components/rooms/RoomAccess';
import CreateQuiz from './components/quiz/CreateQuiz';
import EditQuiz from './components/quiz/EditQuiz';
import TakeQuiz from './components/quiz/TakeQuiz';
import QuizList from './components/quiz/QuizList';
import QuizResults from './components/quiz/QuizResults';
import QuizManagement from './components/quiz/QuizManagement';
import QuizAnalytics from './components/analytics/QuizAnalytics';
import MigrationHelper from './components/quiz/MigrationHelper';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Landing Page */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Public Auth Routes */}
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
            <Route path="/auth/change-password" element={<ChangePassword />} />
            <Route path="/admin/users" element={
              <ProtectedRoute role="admin">
                <AdminUserManagement />
              </ProtectedRoute>
            } />
            
            {/* Protected Routes */}
            <Route path="/teacher/*" element={
              <ProtectedRoute role="teacher">
                <TeacherDashboard />
              </ProtectedRoute>
            } />
            <Route path="/student/*" element={
              <ProtectedRoute role="student">
                <StudentDashboard />
              </ProtectedRoute>
            } />
            
            {/* Room Management Routes */}
            <Route path="/create-room" element={
              <ProtectedRoute role="teacher">
                <CreateRoom />
              </ProtectedRoute>
            } />
            <Route path="/join-room" element={
              <ProtectedRoute role="student">
                <JoinRoom />
              </ProtectedRoute>
            } />
            <Route path="/room-details/:roomId" element={
              <ProtectedRoute role="teacher">
                <RoomDetails />
              </ProtectedRoute>
            } />
            <Route path="/manage-room/:roomId" element={
              <ProtectedRoute role="teacher">
                <RoomManagement />
              </ProtectedRoute>
            } />
            <Route path="/room/:roomCode" element={
              <ProtectedRoute role="student">
                <RoomAccess />
              </ProtectedRoute>
            } />
            
            {/* Quiz Routes */}
            <Route path="/room/:roomId/create-quiz" element={
              <ProtectedRoute role="teacher">
                <CreateQuiz />
              </ProtectedRoute>
            } />
            <Route path="/room/:roomId/edit-quiz/:quizId" element={
              <ProtectedRoute role="teacher">
                <EditQuiz />
              </ProtectedRoute>
            } />
            <Route path="/room/:roomId/quizzes" element={
              <ProtectedRoute role="student">
                <QuizList />
              </ProtectedRoute>
            } />
            <Route path="/room/:roomId/quiz/:quizId" element={
              <ProtectedRoute role="student">
                <TakeQuiz />
              </ProtectedRoute>
            } />
            <Route path="/room/:roomId/quiz/:quizId/results" element={
              <ProtectedRoute role="student">
                <QuizResults />
              </ProtectedRoute>
            } />
            <Route path="/room/:roomId/manage-quizzes" element={
              <ProtectedRoute role="teacher">
                <QuizManagement />
              </ProtectedRoute>
            } />
            
            {/* Analytics Routes */}
            <Route path="/room/:roomId/analytics" element={
              <ProtectedRoute role="teacher">
                <QuizAnalytics />
              </ProtectedRoute>
            } />
            {/* Migration Helper (teacher-only) */}
            <Route path="/teacher/migration" element={
              <ProtectedRoute role="teacher">
                <MigrationHelper />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
