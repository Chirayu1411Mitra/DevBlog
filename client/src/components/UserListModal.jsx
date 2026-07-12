import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, UserMinus } from 'lucide-react';
import { Avi, Btn } from './DesignSystem';
import Loader from './Loader';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';

const UserListModal = ({ isOpen, onClose, title, users, loading, actionType, onAction }) => {
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'auto';
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen]);

    if (!isOpen) return null;

    const API_BASE_URL = API_URL.replace('/api', '');
    const getImageUrl = (url) => {
        if (!url) return null;
        return url.startsWith('/uploads') ? `${API_BASE_URL}${url}` : url;
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-card border border-border rounded-xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card z-10">
                    <h3 className="text-base font-semibold text-foreground">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                        <X size={16} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader /></div>
                    ) : users.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-10">No users found.</p>
                    ) : (
                        <ul className="space-y-3">
                            {users.map(user => (
                                <li key={user.id} className="flex items-center justify-between gap-3">
                                    <Link to={`/user/${user.username}`} className="flex items-center gap-3 flex-1 min-w-0 group" onClick={onClose}>
                                        {user.avatar_url ? (
                                            <img
                                                src={getImageUrl(user.avatar_url)}
                                                alt={user.username}
                                                className="w-10 h-10 rounded-full object-cover border border-border group-hover:border-primary transition-colors flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="group-hover:opacity-80 transition-opacity">
                                                <Avi initials={(user.username || '?').charAt(0).toUpperCase()} size="sm" />
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{user.username}</div>
                                            {user.headline && <div className="text-xs text-muted-foreground truncate">{user.headline}</div>}
                                        </div>
                                    </Link>
                                    
                                    {actionType && (
                                        <Btn
                                            variant="outline"
                                            size="sm"
                                            className="text-xs py-1 px-2 h-auto text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive flex-shrink-0"
                                            onClick={() => onAction(user.id)}
                                        >
                                            {actionType === 'remove' ? 'Remove' : 'Unfollow'}
                                        </Btn>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserListModal;
