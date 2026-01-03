import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from './ToastContext';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';

const EditProfileModal = ({ isOpen, onClose, user, onUpdate }) => {
    const [formData, setFormData] = useState({
        username: '',
        email: '', // Read-only or editable? Let's generic update supports it, but maybe safer to keep read-only for now or just prefill
        bio: '',
        avatar_url: '',
        banner_url: '',
        password: '',
        currentPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();
    const token = sessionStorage.getItem('token');

    useEffect(() => {
        if (user && isOpen) {
            setFormData({
                username: user.username || '',
                email: user.email || '',
                bio: user.bio || '',
                avatar_url: user.avatar_url || '',
                banner_url: user.banner_url || '',
                password: '',
                currentPassword: ''
            });
        }
    }, [user, isOpen]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = async (e, field) => {
        const file = e.target.files[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('image', file);

        try {
            setLoading(true);
            const res = await axios.post(`${API_URL}/posts/upload`, uploadData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            setFormData(prev => ({ ...prev, [field]: res.data.imageUrl }));
            addToast('Image uploaded', { type: 'success' });
        } catch (err) {
            console.error(err);
            addToast(err.response?.data?.message || 'Failed to upload image', { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                username: formData.username,
                // email: formData.email, // Avoiding email change for simplicity unless requested
                bio: formData.bio,
                avatar_url: formData.avatar_url,
                banner_url: formData.banner_url
            };

            // Only send password fields if user is trying to change password
            if (formData.password) {
                payload.password = formData.password;
                payload.currentPassword = formData.currentPassword;
            }

            const res = await axios.put(`${API_URL}/auth/me`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            addToast('Profile updated successfully', { type: 'success' });
            onUpdate(res.data.user);
            onClose();
        } catch (err) {
            console.error(err);
            addToast(err.response?.data?.message || 'Failed to update profile', { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const API_BASE_URL = API_URL.replace('/api', '');

    const getImageUrl = (url) => {
        if (!url) return null;
        return url.startsWith('/uploads') ? `${API_BASE_URL}${url}` : url;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content edit-profile-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Edit Profile</h3>
                    <button className="btn-close" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <form onSubmit={handleSubmit} className="edit-profile-form">
                        <div className="modal-profile-header-preview">
                            <div
                                className="modal-banner-preview"
                                style={{
                                    backgroundImage: formData.banner_url ? `url(${getImageUrl(formData.banner_url)})` : 'none',
                                    backgroundColor: formData.banner_url ? 'transparent' : 'var(--bg-color)'
                                }}
                            >
                                <label className="upload-overlay banner-overlay">
                                    <span className="overlay-icon">📷</span>
                                    <span>Change Banner</span>
                                    <input type="file" onChange={(e) => handleFileChange(e, 'banner_url')} accept="image/*" hidden />
                                </label>
                            </div>

                            <div className="modal-avatar-wrapper">
                                <img
                                    src={getImageUrl(formData.avatar_url) || `https://ui-avatars.com/api/?name=${formData.username}`}
                                    alt="Avatar Preview"
                                    className="modal-avatar-preview"
                                />
                                <label className="upload-overlay avatar-overlay">
                                    <span className="overlay-icon">📷</span>
                                    <input type="file" onChange={(e) => handleFileChange(e, 'avatar_url')} accept="image/*" hidden />
                                </label>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Username</label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    className="form-input"
                                    required
                                />
                            </div>
                            {/* Email could go here if editable */}
                        </div>

                        <div className="form-group">
                            <label>Bio</label>
                            <textarea
                                name="bio"
                                value={formData.bio}
                                onChange={handleChange}
                                className="form-input"
                                rows="3"
                                placeholder="Tell us about yourself..."
                            />
                        </div>

                        <hr className="divider" />
                        <h4>Change Password <span className="optional-text">(Optional)</span></h4>

                        <div className="form-group">
                            <label>New Password</label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="form-input"
                            />
                        </div>
                        {formData.password && (
                            <div className="form-group">
                                <label>Current Password</label>
                                <input
                                    type="password"
                                    name="currentPassword"
                                    value={formData.currentPassword}
                                    onChange={handleChange}
                                    className="form-input"
                                    required
                                />
                            </div>
                        )}

                        <div className="modal-actions">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditProfileModal;
