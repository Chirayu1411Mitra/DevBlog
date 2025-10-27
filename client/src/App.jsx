import { Routes, Route } from 'react-router-dom';
import Navbar from './components/NavBar';
import { ToastProvider } from './components/ToastContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PostPage from './pages/PostPage';
import CreatePostPage from './pages/CreatePostPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import UserPage from './pages/UserPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import MyDraftsPage from './pages/MyDraftsPage';
import EditPostPage from './pages/EditPostPage';
import TagPage from './pages/TagPage';

function App() {
  return (
    <ToastProvider>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/post/:id" element={<PostPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/my-drafts" element={<MyDraftsPage />} />
          <Route path="/post/:id/edit" element={<EditPostPage />} />
          <Route path="/create" element={<CreatePostPage />} />
          <Route path="/tag/:tag" element={<TagPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/user" element={<UserPage />} />
        </Routes>
      </main>
    </ToastProvider>
  );
}

export default App;