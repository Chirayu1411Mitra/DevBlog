import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastContext';
import PostCard from '../components/PostCard';
import Loader from '../components/Loader';
import UserListModal from '../components/UserListModal';
import EditProfileModal from '../components/EditProfileModal';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';

const UserPage = () => {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  // Modal states
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [modalUsers, setModalUsers] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalTitle, setModalTitle] = useState('');

  const navigate = useNavigate();
  const { addToast } = useToast();
  const token = sessionStorage.getItem('token');

  // Get current user info for "Edit Profile" check
  const [currentUsername, setCurrentUsername] = useState(null);

  useEffect(() => {
    const fetchMe = async () => {
      if (token) {
        try {
          const res = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setCurrentUsername(res.data.user.username);
        } catch (e) { console.error(e); }
      }
    };
    fetchMe();
  }, [token]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get(`${API_URL}/users/${username}`, { headers });
        setProfile(response.data);
        setIsFollowing(response.data.user.is_following);
        setFollowersCount(parseInt(response.data.user.followers_count, 10));
      } catch (err) {
        setError('Failed to load profile.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username, token]);

  const handleFollow = async () => {
    if (!token) {
      addToast('Please log in to follow users.', { type: 'info' });
      navigate('/login');
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/users/${profile.user.id}/follow`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsFollowing(response.data.following);
      setFollowersCount(prev => response.data.following ? prev + 1 : prev - 1);
      addToast(response.data.message, { type: 'success' });
    } catch (error) {
      addToast(error.response?.data?.message || 'Action failed', { type: 'error' });
    }
  };

  const handleEditProfile = () => {
    setShowEditProfileModal(true);
  };

  const handleProfileUpdate = (updatedUser) => {
    setProfile(prev => ({
      ...prev,
      user: {
        ...prev.user,
        ...updatedUser
      }
    }));
    if (updatedUser.username !== username) {
      navigate(`/user/${updatedUser.username}`, { replace: true });
    }
  };

  const openUserList = async (type) => {
    const userId = profile.user.id;
    setModalLoading(true);
    setModalUsers([]);
    if (type === 'followers') {
      setModalTitle('Followers');
      setShowFollowersModal(true);
    } else {
      setModalTitle('Following');
      setShowFollowingModal(true);
    }

    try {
      const endpoint = type === 'followers' ? 'followers' : 'following';
      const res = await axios.get(`${API_URL}/users/${userId}/${endpoint}`);
      setModalUsers(res.data);
    } catch (err) {
      console.error(err);
      addToast('Failed to fetch user list', { type: 'error' });
    } finally {
      setModalLoading(false);
    }
  };

  const handleUnfollowUser = async (targetUserId) => {
    try {
      await axios.post(`${API_URL}/users/${targetUserId}/follow`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setModalUsers(prev => prev.filter(u => u.id !== targetUserId));
      addToast('Unfollowed user', { type: 'success' });
    } catch (err) {
      console.error(err);
      addToast('Failed to unfollow', { type: 'error' });
    }
  };

  const handleRemoveFollower = async (followerId) => {
    try {
      await axios.delete(`${API_URL}/users/followers/${followerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setModalUsers(prev => prev.filter(u => u.id !== followerId));
      setFollowersCount(prev => prev - 1);
      addToast('Follower removed', { type: 'success' });
    } catch (err) {
      console.error(err);
      addToast('Failed to remove follower', { type: 'error' });
    }
  };

  if (loading) return <Loader />;
  if (error) return (
    <div className="main-container text-center" style={{ marginTop: '4rem' }}>
      <p style={{ color: 'var(--danger)' }}>{error}</p>
      <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => navigate('/')}>Go Home</button>
    </div>
  );

  const { user, posts } = profile;
  const isOwnProfile = currentUsername === user.username;
  if (!user) return <Loader />;

  const API_BASE_URL = API_URL.replace('/api', '');
  const getImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith('/uploads') ? `${API_BASE_URL}${url}` : url;
  };

  const renderProfileActions = () => {
    if (isOwnProfile) {
      return (
        <button className="btn btn-secondary" onClick={handleEditProfile}>
          Edit Profile
        </button>
      );
    } else {
      return (
        <button className="btn btn-primary" onClick={handleFollow}>
          {isFollowing ? 'Unfollow' : 'Follow'}
        </button>
      );
    }
  };

  return (
    <div className="main-container user-page" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div
        className="profile-header"
        style={{
          backgroundImage: getImageUrl(user.banner_url)
            ? `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.5)), url(${getImageUrl(user.banner_url)})`
            : 'linear-gradient(135deg, var(--accent), #4338ca)'
        }}
      >
        <div className="profile-info-container">
          <img
            src={getImageUrl(user.avatar_url) || `https://ui-avatars.com/api/?name=${user.username}&background=random`}
            alt={user.username}
            className="profile-avatar"
          />
          <div className="profile-details">
            <h1 className="profile-username">{user.username}</h1>
            {user.headline && <p style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.9rem', marginTop: '0.25rem' }}>{user.headline}</p>}
            {user.bio && <p className="profile-bio">{user.bio}</p>}
            <div className="profile-stats">
              <span onClick={() => openUserList('followers')} className="clickable">
                <strong>{followersCount || 0}</strong> Followers
              </span>
              <span onClick={() => openUserList('following')} className="clickable">
                <strong>{user.following_count || 0}</strong> Following
              </span>
              <span><strong>{posts.length}</strong> Posts</span>
            </div>
            <div className="profile-actions" style={{ marginTop: '0.75rem' }}>
              {renderProfileActions()}
            </div>
          </div>
        </div>
      </div>

      <div className="profile-page-body">
        <div className="post-grid-header" style={{ marginBottom: '1.5rem' }}>
          <h3>{isOwnProfile ? 'My Stories' : `${user.username}'s Stories`}</h3>
        </div>
        
        {posts.length === 0 ? (
          <div className="card text-center" style={{ padding: '5rem 2rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>No stories published yet.</p>
            {isOwnProfile && (
              <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => navigate('/create')}>Create First Story</button>
            )}
          </div>
        ) : (
          <div className="post-grid">
            {posts.map(post => (
              <PostCard key={post.id} post={{ ...post, username: user.username, avatar_url: user.avatar_url }} token={token} />
            ))}
          </div>
        )}
      </div>

      {isOwnProfile && (
        <EditProfileModal
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          user={user}
          onUpdate={handleProfileUpdate}
        />
      )}
      <UserListModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        title={modalTitle}
        users={modalUsers}
        loading={modalLoading}
        actionType={isOwnProfile ? 'remove' : null}
        onAction={handleRemoveFollower}
      />
      <UserListModal
        isOpen={showFollowingModal}
        onClose={() => setShowFollowingModal(false)}
        title={modalTitle}
        users={modalUsers}
        loading={modalLoading}
        actionType={isOwnProfile ? 'unfollow' : null}
        onAction={handleUnfollowUser}
      />
    </div>
  );
};

export default UserPage;
