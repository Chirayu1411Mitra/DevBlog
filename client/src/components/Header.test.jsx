import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Header from './Header';
import { describe, it, expect, vi } from 'vitest';

// Mock axios if needed, but for simple rendering tests we might skip API calls
// or mock the 'me' endpoint call if it happens on mount.
vi.mock('axios', () => ({
    default: {
        get: vi.fn(() => Promise.resolve({ data: { user: null } })),
    },
}));

describe('Header Component', () => {
    it('renders the logo text', () => {
        render(
            <BrowserRouter>
                <Header />
            </BrowserRouter>
        );
        expect(screen.getByText('DevBlog')).toBeInTheDocument();
    });

    it('renders Sign in button when not logged in', async () => {
        render(
            <BrowserRouter>
                <Header />
            </BrowserRouter>
        );
        // Wait for potential async effects
        expect(await screen.findByText('Sign in')).toBeInTheDocument();
        expect(screen.getByText('Get started')).toBeInTheDocument();
    });
});
