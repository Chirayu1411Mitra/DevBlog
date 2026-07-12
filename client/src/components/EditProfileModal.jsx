import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Camera, X } from 'lucide-react';
import { Btn, Input } from './DesignSystem';
import { cn } from '../utils';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';

const EditProfileModal = ({ isOpen, onClose, user, onUpdate }) => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        bio: '',
        avatar_url: '',
        banner_url: '',
        headline: '',
        password: '',
        currentPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState(null);
    const [feedbackType, setFeedbackType] = useState('info');

    useEffect(() => {
        if (user && isOpen) {
            setFormData({
                username: user.username || '',
                email: user.email || '',
                bio: user.bio || '',
                avatar_url: user.avatar_url || '',
                banner_url: user.banner_url || '',
                headline: user.headline || '',
                password: '',
                currentPassword: ''
            });
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [user, isOpen]);

    const handleFileChange = async (e, field) => {
        const file = e.target.files[0];
        if (!file) return;

        const uploadData = new FormData();
        const type = field === 'avatar_url' ? 'profile' : field === 'banner_url' ? 'banner' : 'other';
        uploadData.append('type', type);
        uploadData.append('image', file);

        try {
            setLoading(true);
            const res = await axios.post(`${API_URL}/posts/upload`, uploadData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });
            setFormData(prev => ({ ...prev, [field]: res.data.imageUrl }));
            setFeedbackMessage('Image uploaded successfully!');
            setFeedbackType('success');
        } catch (err) {
            console.error(err);
            setFeedbackMessage(err.response?.data?.message || 'Failed to upload image');
            setFeedbackType('error');
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
                bio: formData.bio,
                avatar_url: formData.avatar_url,
                banner_url: formData.banner_url,
                headline: formData.headline
            };

            if (formData.password) {
                payload.password = formData.password;
                payload.currentPassword = formData.currentPassword;
            }

            const res = await axios.put(`${API_URL}/auth/me`, payload);

            setFeedbackMessage('Profile updated successfully!');
            setFeedbackType('success');
            onUpdate(res.data.user);
            onClose();
        } catch (err) {
            console.error(err);
            setFeedbackMessage(err.response?.data?.message || 'Failed to update profile');
            setFeedbackType('error');
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-card z-10 flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Edit Profile</h2>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6">
                    {feedbackMessage && (
                        <div className={`mb-6 p-4 rounded text-sm font-medium ${feedbackType === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-500'}`} onClick={() => setFeedbackMessage(null)}>
                            {feedbackMessage}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Banner & Avatar section */}
                        <div>
                            <div className="relative h-32 rounded-lg bg-secondary border border-border overflow-hidden mb-12">
                                {formData.banner_url && (
                                    <img src={getImageUrl(formData.banner_url)} alt="Banner" className="w-full h-full object-cover" />
                                )}
                                <label className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white">
                                    <Camera size={24} />
                                    <input type="file" onChange={(e) => handleFileChange(e, 'banner_url')} accept="image/*" className="hidden" />
                                </label>
                            </div>

                            <div className="relative w-24 h-24 -mt-24 ml-6 mb-4 rounded-full border-4 border-card bg-secondary z-10 overflow-hidden group">
                                <img
                                    src={getImageUrl(formData.avatar_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.username)}`}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                />
                                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white">
                                    <Camera size={20} />
                                    <input type="file" onChange={(e) => handleFileChange(e, 'avatar_url')} accept="image/*" className="hidden" />
                                </label>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Input
                                label="Username"
                                value={formData.username}
                                onChange={(val) => setFormData(prev => ({ ...prev, username: val }))}
                                required
                            />
                            <Input
                                label="Headline"
                                value={formData.headline}
                                onChange={(val) => setFormData(prev => ({ ...prev, headline: val }))}
                                placeholder="e.g. Developer & Writer"
                            />
                            <Input
                                label="Bio"
                                value={formData.bio}
                                onChange={(val) => setFormData(prev => ({ ...prev, bio: val }))}
                                textarea
                                placeholder="Tell us about yourself..."
                            />
                        </div>

                        <div className="border-t border-border pt-6 mt-6">
                            <h3 className="text-sm font-semibold text-foreground mb-4">Change Password (Optional)</h3>
                            <div className="space-y-4">
                                <Input
                                    label="New Password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(val) => setFormData(prev => ({ ...prev, password: val }))}
                                    placeholder="Leave blank to keep current"
                                />
                                {formData.password && (
                                    <Input
                                        label="Current Password"
                                        type="password"
                                        value={formData.currentPassword}
                                        onChange={(val) => setFormData(prev => ({ ...prev, currentPassword: val }))}
                                        placeholder="Required to change password"
                                        required
                                    />
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end pt-2">
                            <Btn variant="ghost" onClick={onClose} type="button">Cancel</Btn>
                            <Btn variant="primary" type="submit" disabled={loading}>
                                {loading ? 'Saving…' : 'Save Changes'}
                            </Btn>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditProfileModal;
