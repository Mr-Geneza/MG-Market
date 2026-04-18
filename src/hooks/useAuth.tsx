import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: 'user' | 'admin' | 'superadmin' | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const ROLE_PRIORITY: Record<'user' | 'admin' | 'superadmin', number> = {
  user: 0,
  admin: 1,
  superadmin: 2,
};

const resolveHighestRole = (
  rows: Array<{ role: 'user' | 'admin' | 'superadmin' }> = []
): 'user' | 'admin' | 'superadmin' => {
  return rows.reduce<'user' | 'admin' | 'superadmin'>((highestRole, row) => {
    return ROLE_PRIORITY[row.role] > ROLE_PRIORITY[highestRole] ? row.role : highestRole;
  }, 'user');
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  userRole: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'user' | 'admin' | 'superadmin' | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user role after setting session
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user role:', error);
      } else {
        const resolvedRole = resolveHighestRole(data || []);

        if ((data?.length || 0) > 1) {
          console.warn('Multiple roles found for user, using highest priority role:', userId, data);
        }

        if (resolvedRole !== 'user') {
          setUserRole(resolvedRole);
          return;
        }
      }

      // Fallback to RPC role checks. This helps when direct reads from user_roles
      // are restricted by RLS but the role-check function is still available.
      const [{ data: isSuperAdmin, error: superAdminError }, { data: isAdmin, error: adminError }] = await Promise.all([
        supabase.rpc('has_role', { _role: 'superadmin', _user_id: userId }),
        supabase.rpc('has_role', { _role: 'admin', _user_id: userId }),
      ]);

      if (superAdminError) {
        console.error('Error checking superadmin role via RPC:', superAdminError);
      }

      if (adminError) {
        console.error('Error checking admin role via RPC:', adminError);
      }

      if (isSuperAdmin) {
        setUserRole('superadmin');
      } else if (isAdmin) {
        setUserRole('admin');
      } else {
        setUserRole('user');
      }
    } catch (err) {
      console.error('Error in fetchUserRole:', err);
      setUserRole('user');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, session, userRole, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
