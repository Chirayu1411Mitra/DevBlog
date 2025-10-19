import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastContext';

const API_URL = import.meta.env.VITE_API_URL ?? 'https://devblog-b.onrender.com/api';

const UserPage = () => {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: '', email: '' });
  const [passwordFlow, setPasswordFlow] = useState({ step: 0, current: '', newPassword: '', confirm: '', verified: false });
  const navigate = useNavigate();
  const { addToast } = useToast();

  const token = localStorage.getItem('token');
  useEffect(() => {
    if (!token) return navigate('/login');

    const fetch = async () => {
      try {
        const me = await axios.get(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        setUser(me.data.user);
  setForm({ username: me.data.user.username || '', email: me.data.user.email || '' });

        const myPosts = await axios.get(`${API_URL}/auth/my-posts`, { headers: { Authorization: `Bearer ${token}` } });
        setPosts(myPosts.data);
      } catch (err) {
        console.error('Failed to load user page', err);
        addToast('Failed to load user data', { type: 'error' });
      }
    };
    fetch();
  }, [token]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
  // If passwordFlow.step === 2 we include newPassword in the update payload
  const payload = { ...form };
  if (passwordFlow.step === 2 && passwordFlow.newPassword) payload.password = passwordFlow.newPassword;
  const res = await axios.put(`${API_URL}/auth/me`, payload, { headers: { Authorization: `Bearer ${token}` } });
      setUser(res.data.user);
      setEditing(false);
      addToast('Profile updated', { type: 'success' });
    } catch (err) {
      console.error('Update failed', err);
      addToast(err.response?.data?.message || 'Update failed', { type: 'error' });
    }
  };

  const saveProfile = async () => {
    try {
      const payload = { ...form };
      if (passwordFlow.step === 2 && passwordFlow.newPassword) {
        // include currentPassword for server-side verification
        payload.password = passwordFlow.newPassword;
        payload.currentPassword = passwordFlow.current;
      }
      const res = await axios.put(`${API_URL}/auth/me`, payload, { headers: { Authorization: `Bearer ${token}` } });
      setUser(res.data.user);
      setEditing(false);
      const changedPassword = (passwordFlow.step === 2 && passwordFlow.newPassword);
      setPasswordFlow({ step: 0, current: '', newPassword: '', confirm: '', verified: false });
      if (changedPassword) {
        // force re-login after password change
        localStorage.removeItem('token');
        addToast('Password changed — please log in again', { type: 'success' });
        navigate('/login');
        return;
      }
      addToast('Profile updated', { type: 'success' });
    } catch (err) {
      console.error('Update failed', err);
      addToast(err.response?.data?.message || 'Update failed', { type: 'error' });
    }
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="fade-in profile">
      <div className="profile-header">
        <div className="profile-avatar">{(user.username || '?').slice(0,1).toUpperCase()}</div>
        <div>
          <h2 className="profile-username">{user.username}</h2>
          <div className="profile-meta">Joined {new Date(user.created_at).toLocaleDateString()} • {user.email || 'No email'}</div>
        </div>
      </div>

      <div className="profile-grid">
        <aside className="profile-card">
          <h4>Profile</h4>
          {editing ? (
            <form onSubmit={handleUpdate} className="profile-form">
              <div className="row">
                <div>
                  <label>Username</label>
                  <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                </div>
                <div>
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <label>Security</label>
                {passwordFlow.step === 0 && (
                  <div className="profile-actions">
                    <button type="button" className="btn" onClick={() => setPasswordFlow({ step: 1, current: '', newPassword: '', confirm: '', verified: false })}>Change password</button>
                  </div>
                )}
                {passwordFlow.step === 1 && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                    <input type="password" placeholder="Current password" value={passwordFlow.current} onChange={(e) => setPasswordFlow({ ...passwordFlow, current: e.target.value })} />
                    <button className="btn" type="button" onClick={async () => {
                      try {
                        await axios.post(`${API_URL}/auth/verify-password`, { currentPassword: passwordFlow.current }, { headers: { Authorization: `Bearer ${token}` } });
                        setPasswordFlow({ step: 2, current: passwordFlow.current, newPassword: '', confirm: '', verified: true });
                        addToast('Current password verified. Enter new password.', { type: 'success' });
                      } catch (err) {
                        console.error('Verify failed', err);
                        addToast(err.response?.data?.message || 'Verification failed', { type: 'error' });
                      }
                    }}>Verify</button>
                    <button type="button" onClick={() => setPasswordFlow({ step: 0, current: '', newPassword: '', confirm: '', verified: false })}>Cancel</button>
                  </div>
                )}
                {passwordFlow.step === 2 && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                    <input type="password" placeholder="New password" value={passwordFlow.newPassword} onChange={(e) => setPasswordFlow({ ...passwordFlow, newPassword: e.target.value })} />
                    <input type="password" placeholder="Confirm new password" value={passwordFlow.confirm} onChange={(e) => setPasswordFlow({ ...passwordFlow, confirm: e.target.value })} />
                    <button className="btn" type="button" onClick={() => {
                      if (passwordFlow.newPassword !== passwordFlow.confirm) {
                        addToast('New password and confirmation do not match', { type: 'error' });
                        return;
                      }
                      saveProfile();
                    }}>Save New Password</button>
                    <button type="button" onClick={() => setPasswordFlow({ step: 0, current: '', newPassword: '', confirm: '', verified: false })}>Cancel</button>
                  </div>
                )}
              </div>
              {passwordFlow.step !== 2 && (
                <div className="form-actions">
                  <button className="btn" type="submit">Save</button>
                  <button type="button" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              )}
            </form>
          ) : (
            <div>
              <div className="profile-meta">Email: {user.email || '—'}</div>
              <div className="profile-actions">
                <button className="btn" onClick={() => setEditing(true)}>Edit Profile</button>
              </div>
            </div>
          )}
        </aside>

        <main className="profile-card">
          <h4>Your Posts</h4>
          {posts.length ? (
            <div className="posts-list">
              {posts.map((p) => (
                <div key={p.id} className="post-item">
                  <h4>{p.title}</h4>
                  <div className="meta">{new Date(p.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="profile-meta">No posts yet.</p>
          )}
        </main>
      </div>
    </div>
  );
};

export default UserPage;
