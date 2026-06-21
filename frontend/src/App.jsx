import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Editior from './pages/Editior';
import Playground from './pages/Playground';
import ResetPassword from './pages/ResetPassword';
import NoPage from './pages/NoPage';

// Route protection wrapper
const PrivateRoute = ({ children }) => {
  const { token, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#09080F] flex items-center justify-center font-sans text-slate-500">
        Loading sandbox environment...
      </div>
    );
  }
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<SignUp />} />
        <Route path="/signUp" element={<Navigate to="/register" replace />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/forgot-password" element={<ResetPassword />} />
        
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        } />
        
        <Route path="/editor/:id" element={
          <PrivateRoute>
            <Editior />
          </PrivateRoute>
        } />
        
        {/* Read-only shared project view */}
        <Route path="/editor/shared/:token" element={<Editior />} />
        
        <Route path="/playground" element={<Playground />} />
        <Route path="*" element={<NoPage />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;