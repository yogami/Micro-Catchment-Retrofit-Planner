import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider } from '../../../src/contexts/AuthProvider';
import { useAuth } from '../../../src/contexts/AuthContext';
import { supabase } from '../../../src/services/supabaseClient';

// Mock Supabase client
jest.mock('../../../src/services/supabaseClient', () => ({
    supabase: {
        auth: {
            getSession: jest.fn(),
            onAuthStateChange: jest.fn(),
            signInWithOtp: jest.fn(),
            signOut: jest.fn()
        }
    }
}));

const TestComponent = () => {
    const { user, loading, signInWithEmail, signInAsDemo, signOut } = useAuth();
    if (loading) return <div data-testid="loading">Loading...</div>;
    return (
        <div>
            <div data-testid="user-email">{user?.email ?? 'no-user'}</div>
            <button onClick={() => signInWithEmail('test@example.com')}>Sign In Email</button>
            <button onClick={signInAsDemo}>Sign In Demo</button>
            <button onClick={signOut}>Sign Out</button>
        </div>
    );
};

describe('AuthContext', () => {
    const mockUnsubscribe = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
        (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
            data: { subscription: { unsubscribe: mockUnsubscribe } }
        });
    });

    it('starts in loading state and then shows no-user', async () => {
        render(<AuthProvider><TestComponent /></AuthProvider>);

        expect(screen.getByTestId('loading')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
        });

        expect(screen.getByTestId('user-email')).toHaveTextContent('no-user');
    });

    it('loads existing session on mount', async () => {
        const mockSession = { user: { email: 'existing@example.com' } };
        (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: mockSession } });

        render(<AuthProvider><TestComponent /></AuthProvider>);

        await waitFor(() => {
            expect(screen.getByTestId('user-email')).toHaveTextContent('existing@example.com');
        });
    });

    it('handles signInWithEmail', async () => {
        (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({ error: null });
        render(<AuthProvider><TestComponent /></AuthProvider>);

        await waitFor(() => screen.getByText('Sign In Email'));

        await act(async () => {
            screen.getByText('Sign In Email').click();
        });

        expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
            email: 'test@example.com',
            options: expect.objectContaining({ emailRedirectTo: expect.any(String) })
        });
    });

    it('handles signInAsDemo', async () => {
        render(<AuthProvider><TestComponent /></AuthProvider>);

        await waitFor(() => screen.getByText('Sign In Demo'));

        await act(async () => {
            screen.getByText('Sign In Demo').click();
        });

        expect(screen.getByTestId('user-email')).toHaveTextContent('demo@example.com');
    });

    it('handles signOut', async () => {
        const mockSession = { user: { email: 'logout@example.com' } };
        (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: mockSession } });

        render(<AuthProvider><TestComponent /></AuthProvider>);

        await waitFor(() => expect(screen.getByTestId('user-email')).toHaveTextContent('logout@example.com'));

        await act(async () => {
            screen.getByText('Sign Out').click();
        });

        expect(supabase.auth.signOut).toHaveBeenCalled();
        expect(screen.getByTestId('user-email')).toHaveTextContent('no-user');
    });

    it('unsubscribes from auth changes on unmount', async () => {
        const { unmount } = render(<AuthProvider><TestComponent /></AuthProvider>);
        unmount();
        expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('throws error when useAuth is used outside of AuthProvider', () => {
        // Suppress console.error for expected error
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        expect(() => render(<TestComponent />)).toThrow('useAuth must be used within an AuthProvider');

        consoleSpy.mockRestore();
    });
});
