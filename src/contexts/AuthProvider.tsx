import { useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [auth, setAuth] = useState<{ session: Session | null, user: User | null, loading: boolean }>({
        session: null, user: null, loading: true
    });

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setAuth({ session, user: session?.user ?? null, loading: false });
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setAuth({ session, user: session?.user ?? null, loading: false });
        });

        return () => subscription.unsubscribe();
    }, []);

    const signInWithEmail = async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({
            email, options: { emailRedirectTo: `${window.location.origin}/scanner` }
        });
        return { error: error ? new Error(error.message) : null };
    };

    const signInAsDemo = async () => {
        const demoUser = getDemoUser();
        setAuth({ session: getDemoSession(demoUser), user: demoUser, loading: false });
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setAuth({ session: null, user: null, loading: false });
    };

    const value = { ...auth, signInWithEmail, signOut, signInAsDemo };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function getDemoUser(): User {
    const now = new Date().toISOString();
    return {
        id: 'demo-user-123', aud: 'authenticated', role: 'authenticated', email: 'demo@example.com',
        email_confirmed_at: now, confirmed_at: now, last_sign_in_at: now, created_at: now, updated_at: now,
        app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, identities: [], phone: ''
    };
}

function getDemoSession(user: User): Session {
    return { access_token: 'demo-token', token_type: 'bearer', expires_in: 3600, refresh_token: 'demo-refresh', user };
}
