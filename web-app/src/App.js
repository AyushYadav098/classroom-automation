import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import CreateLecture from './pages/CreateLecture';
import LectureDetail from './pages/LectureDetail';
import AllLectures from './pages/AllLectures';
import SearchLectures from './pages/SearchLectures';
import TakeAttendance from './pages/TakeAttendance';
import StudentMarkAttendance from './pages/StudentMarkAttendance';
import LandingPage from './pages/LandingPage';
import './App.css';
import AdminDashboard from './pages/AdminDashboard';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="loading-container">Loading...</div>;
  }

  return user ? children : <Navigate to="/login" />;
};

const AppRoutes = () => {
  const { user } = useContext(AuthContext);

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/dashboard" /> : <Login />} 
      />
      <Route 
        path="/register" 
        element={user ? <Navigate to="/dashboard" /> : <Register />} 
      />
     <Route
  path="/dashboard"
  element={
    <PrivateRoute>
      {user?.role === 'admin' ? <AdminDashboard /> : 
       user?.role === 'teacher' ? <TeacherDashboard /> : 
       <StudentDashboard />}
    </PrivateRoute>
  }
/>
      <Route
        path="/create-lecture"
        element={
          <PrivateRoute>
            <CreateLecture />
          </PrivateRoute>
        }
      />
      <Route
        path="/search"
        element={
          <PrivateRoute>
            <SearchLectures />
          </PrivateRoute>
        }
      />
      <Route
        path="/lecture/:id"
        element={
          <PrivateRoute>
            <LectureDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/all-lectures"
        element={
          <PrivateRoute>
            <AllLectures />
          </PrivateRoute>
        }
      />
      {/* NEW ATTENDANCE ROUTES */}
      <Route
        path="/attendance/:id"
        element={
          <PrivateRoute>
            <TakeAttendance />
          </PrivateRoute>
        }
      />
      <Route
        path="/mark-attendance/:id"
        element={
          <PrivateRoute>
            <StudentMarkAttendance />
          </PrivateRoute>
        }
      />
      {/* If user is logged in, take them to dashboard. If not, show landing page. */}
<Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
