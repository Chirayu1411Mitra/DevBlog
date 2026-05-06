import React from 'react';
import { Link } from 'react-router-dom';

const UserListModal = ({ isOpen, onClose, title, users, loading, actionType, onAction }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card user-list-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button className="modal-close" onClick={onClose}><i className="fas fa-times"></i></button>
                </div>
                <div className="modal-body">
                    {loading ? (
                        <div className="loading-spinner"></div>
                    ) : users.length === 0 ? (
                        <p className="no-users-found">No users found.</p>
                    ) : (
                        <ul className="user-list">
                            {users.map(user => (
                                <li key={user.id} className="user-list-item">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '1rem' }}>
                                        <Link to={`/user/${user.username}`} className="user-link" onClick={onClose} style={{ flex: 1 }}>
                                            <img
                                                src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}&background=random`}
                                                alt={user.username}
                                                className="user-avatar-small"
                                            />
                                            <span className="user-username">{user.username}</span>
                                        </Link>
                                        {actionType && (
                                            <button
                                                className="btn btn-sm btn-outline-danger"
                                                onClick={() => onAction(user.id)}
                                                style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                                            >
                                                {actionType === 'remove' ? 'Remove' : 'Unfollow'}
                                            </button>
                                        )}
                                    </div>
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
