import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Loader from './components/Loader';
const HomePage = React.lazy(() => import('./pages/HomePage'));
const PostPage = React.lazy(() => import('./pages/PostPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const CreatePostPage = React.lazy(() => import('./pages/CreatePostPage'));
const EditPostPage = React.lazy(() => import('./pages/EditPostPage'));
const UserPage = React.lazy(() => import('./pages/UserPage'));
const MyDraftsPage = React.lazy(() => import('./pages/MyDraftsPage'));
const SavedPostsPage = React.lazy(() => import('./pages/SavedPostsPage'));
const AuthCallbackPage = React.lazy(() => import('./pages/AuthCallbackPage'));
const TagPage = React.lazy(() => import('./pages/TagPage'));
import { ToastProvider } from './components/ToastContext';
import InteractiveBackground from './components/InteractiveBackground';
import './App.css';

function App() {
  return (
    <ToastProvider>
      <InteractiveBackground />
      <Router>
        <Header />
        <main className="main-container">
          <React.Suspense fallback={<Loader />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/create" element={<CreatePostPage />} />
              <Route path="/post/:id" element={<PostPage />} />
              <Route path="/post/:id/edit" element={<EditPostPage />} />
              <Route path="/user/:username" element={<UserPage />} />
              <Route path="/my-drafts" element={<MyDraftsPage />} />
              <Route path="/saved-posts" element={<SavedPostsPage />} />
              <Route path="/tag/:tag" element={<TagPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
            </Routes>
          </React.Suspense>
        </main>
      </Router>
    </ToastProvider>
  );
}

export default App;