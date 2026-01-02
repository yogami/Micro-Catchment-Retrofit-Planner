import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    signInWithEmail: (email: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    signInAsDemo: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const signInWithEmail = async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/scanner`,
            },
        });
        return { error: error ? new Error(error.message) : null };
    };

    const signInAsDemo = async () => {
        // Create a fake demo user
        const demoUser: User = {
            id: 'demo-user-123',
            aud: 'authenticated',
            role: 'authenticated',
            email: 'demo@example.com',
            email_confirmed_at: new Date().toISOString(),
            phone: '',
            confirmed_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
            app_metadata: { provider: 'email', providers: ['email'] },
            user_metadata: {},
            identities: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        setUser(demoUser);
        setSession({
            access_token: 'demo-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'demo-refresh',
            user: demoUser
        });
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        // Also clear local demo state
        setUser(null);
        setSession(null);
    };

    return (
        <AuthContext.Provider value={{ session, user, loading, signInWithEmail, signOut, signInAsDemo }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
