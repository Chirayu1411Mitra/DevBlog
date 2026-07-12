import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Edit3 } from 'lucide-react';
import PostCard from '../components/PostCard';
import Loader from '../components/Loader';
import UserListModal from '../components/UserListModal';
import EditProfileModal from '../components/EditProfileModal';
import { Avi, Btn } from '../components/DesignSystem';
import { fmt } from '../utils';

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
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [feedbackType, setFeedbackType] = useState('info');
  const token = document.cookie.includes('isLoggedIn=true');

  // Get current user info for "Edit Profile" check
  const [currentUsername, setCurrentUsername] = useState(null);

  useEffect(() => {
    const fetchMe = async () => {
      if (token) {
        try {
          const res = await axios.get(`${API_URL}/auth/me`);
          setCurrentUsername(res.data.user.username);
        } catch (e) { console.error(e); }
      }
    };
    fetchMe();
  }, [token]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`${API_URL}/users/${username}`);
        setProfile(response.data);
        setIsFollowing(response.data.user.is_following);
        setFollowersCount(parseInt(response.data.user.followers_count, 10) || 0);
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
      setFeedbackMessage('Please log in to follow users.');
      setFeedbackType('info');
      navigate('/login');
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/users/${profile.user.id}/follow`);
      setIsFollowing(response.data.following);
      setFollowersCount(prev => response.data.following ? prev + 1 : prev - 1);
      setFeedbackMessage(response.data.message);
      setFeedbackType('success');
    } catch (error) {
      setFeedbackMessage(error.response?.data?.message || 'Action failed');
      setFeedbackType('error');
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
      setFeedbackMessage('Failed to fetch user list');
      setFeedbackType('error');
    } finally {
      setModalLoading(false);
    }
  };

  const handleUnfollowUser = async (targetUserId) => {
    try {
      await axios.post(`${API_URL}/users/${targetUserId}/follow`);
      setModalUsers(prev => prev.filter(u => u.id !== targetUserId));
      setFeedbackMessage('Unfollowed user');
      setFeedbackType('success');
    } catch (err) {
      console.error(err);
      setFeedbackMessage('Failed to unfollow');
      setFeedbackType('error');
    }
  };

  const handleRemoveFollower = async (followerId) => {
    try {
      await axios.delete(`${API_URL}/users/followers/${followerId}`);
      setModalUsers(prev => prev.filter(u => u.id !== followerId));
      setFollowersCount(prev => prev - 1);
      setFeedbackMessage('Follower removed');
      setFeedbackType('success');
    } catch (err) {
      console.error(err);
      setFeedbackMessage('Failed to remove follower');
      setFeedbackType('error');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader /></div>;
  if (error) return (
    <div className="max-w-4xl mx-auto text-center mt-16 px-4">
      <p className="text-destructive mb-4">{error}</p>
      <Btn variant="secondary" onClick={() => navigate('/')}>Go Home</Btn>
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

  const avatarUrl = getImageUrl(user.avatar_url);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {feedbackMessage && (
        <div className={`mb-6 p-4 rounded text-sm font-medium ${feedbackType === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-500'}`} onClick={() => setFeedbackMessage(null)}>
          {feedbackMessage}
        </div>
      )}

      {/* Banner */}
      {user.banner_url && (
        <div style={{
          height: '200px',
          borderRadius: 'var(--radius)',
          backgroundImage: `url(${getImageUrl(user.banner_url)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          marginBottom: '2rem',
          border: '1px solid var(--border)',
        }} />
      )}

      {/* Profile header */}
      <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-end mb-8 pb-8 border-b border-border">
        {avatarUrl ? (
          <img src={avatarUrl} alt={user.username} className="w-20 h-20 rounded-full object-cover border border-border flex-shrink-0" />
        ) : (
          <Avi initials={(user.username || '?').charAt(0).toUpperCase()} size="xl" />
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{user.username}</h1>
          {user.headline ? (
            <p className="text-sm font-mono text-muted-foreground">{user.headline}</p>
          ) : (
            <p className="text-sm font-mono text-muted-foreground">@{user.username}</p>
          )}
          {user.bio && (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-lg">{user.bio}</p>
          )}
          <div className="flex items-center gap-5 mt-3 text-sm">
            <button onClick={() => openUserList('followers')} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <strong className="text-foreground font-semibold">{fmt(followersCount)}</strong> followers
            </button>
            <button onClick={() => openUserList('following')} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <strong className="text-foreground font-semibold">{fmt(user.following_count || 0)}</strong> following
            </button>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <strong className="text-foreground font-semibold">{posts.length}</strong> stories
            </span>
          </div>
        </div>
        
        {isOwnProfile ? (
          <Btn variant="outline" icon={<Edit3 size={14} />} onClick={handleEditProfile}>Edit profile</Btn>
        ) : (
          <Btn variant={isFollowing ? "secondary" : "primary"} onClick={handleFollow}>
            {isFollowing ? 'Unfollow' : 'Follow'}
          </Btn>
        )}
      </div>

      {/* Articles */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
          {isOwnProfile ? 'My Stories' : `${user.username}'s Stories`}
        </h3>
        
        {posts.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <p className="text-muted-foreground mb-4">No stories published yet.</p>
            {isOwnProfile && (
              <Btn variant="primary" onClick={() => navigate('/create')}>Create First Story</Btn>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {posts.map(post => (
              <PostCard key={post.id} post={{ ...post, username: user.username, avatar_url: user.avatar_url }} />
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
