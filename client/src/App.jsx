import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import PostPage from './pages/PostPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CreatePostPage from './pages/CreatePostPage';
import EditPostPage from './pages/EditPostPage';
import UserPage from './pages/UserPage';
import MyDraftsPage from './pages/MyDraftsPage';
import SavedPostsPage from './pages/SavedPostsPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import TagPage from './pages/TagPage';
import SearchPage from './pages/SearchPage';
import InteractiveBackground from './components/InteractiveBackground';
//import './App.css';

function App() {
  return (
    <>
      <InteractiveBackground />
      <Router>
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/create" element={<CreatePostPage />} />
            <Route path="/post/:idSlug" element={<PostPage />} />
            <Route path="/post/:idSlug/edit" element={<EditPostPage />} />
            <Route path="/user/:username" element={<UserPage />} />
            <Route path="/my-drafts" element={<MyDraftsPage />} />
            <Route path="/saved-posts" element={<SavedPostsPage />} />
            <Route path="/tags" element={<SearchPage />} />
            <Route path="/tag/:tag" element={<TagPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
          </Routes>
        </main>
      </Router>
    </>
  );
}

export default App;