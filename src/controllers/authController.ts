import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { isEduEmail, extractCollegeName, isValidEmailFormat } from '../utils/emailValidator';

/**
 * POST /api/auth/signup
 * Register a new user with email and password (must be .edu email)
 */
export const signUp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, name } = req.body;

        // Validate required fields
        if (!email || !password) {
            res.status(400).json({
                status: 'error',
                message: 'Email and password are required',
            });
            return;
        }

        // Validate email format
        if (!isValidEmailFormat(email)) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid email format',
            });
            return;
        }

        // Validate .edu email
        if (!isEduEmail(email)) {
            res.status(403).json({
                status: 'error',
                message: 'Only university .edu email addresses are allowed',
            });
            return;
        }

        // Validate password length
        if (password.length < 6) {
            res.status(400).json({
                status: 'error',
                message: 'Password must be at least 6 characters long',
            });
            return;
        }

        // Sign up with Supabase Auth
        const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: name || null,
                },
            },
        });

        if (signUpError) {
            res.status(400).json({
                status: 'error',
                message: signUpError.message,
            });
            return;
        }

        if (!data.user) {
            res.status(500).json({
                status: 'error',
                message: 'Failed to create user',
            });
            return;
        }

        // Extract college domain and look up college
        const collegeDomain = email.toLowerCase().split('@')[1];
        const { data: college } = await supabase
            .from('colleges')
            .select('id, name')
            .eq('domain', collegeDomain)
            .single();

        // Create profile
        const collegeName = extractCollegeName(email);
        const { error: profileError } = await supabase.from('profiles').insert({
            id: data.user.id,
            email: data.user.email,
            name: name || null,
            college_id: college?.id || null,
            avatar_url: null,
        });

        if (profileError) {
            res.status(500).json({
                status: 'error',
                message: 'Error creating user profile',
            });
            return;
        }

        res.status(201).json({
            status: 'success',
            message: 'User registered successfully. Please check your email to verify your account.',
            data: {
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    name: name || null,
                    college_name: college?.name || collegeName,
                },
                session: data.session
                    ? {
                          access_token: data.session.access_token,
                          refresh_token: data.session.refresh_token,
                      }
                    : null,
            },
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
};

/**
 * POST /api/auth/signin
 * Sign in an existing user with email and password
 */
export const signIn = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            res.status(400).json({
                status: 'error',
                message: 'Email and password are required',
            });
            return;
        }

        // Sign in with Supabase Auth
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (signInError) {
            res.status(401).json({
                status: 'error',
                message: 'Invalid email or password',
            });
            return;
        }

        if (!data.user || !data.session) {
            res.status(401).json({
                status: 'error',
                message: 'Authentication failed',
            });
            return;
        }

        // Fetch user profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('*, colleges(name)')
            .eq('id', data.user.id)
            .single();

        // Update last_active_at
        await supabase
            .from('profiles')
            .update({ last_active_at: new Date().toISOString() })
            .eq('id', data.user.id);

        res.status(200).json({
            status: 'success',
            message: 'Signed in successfully',
            data: {
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    name: profile?.name || data.user.user_metadata?.name,
                    avatar_url: profile?.avatar_url || null,
                    college_id: profile?.college_id || null,
                },
                session: {
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                },
            },
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
};

/**
 * Handle OAuth callback and validate .edu email
 */
export const handleOAuthCallback = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { access_token, refresh_token } = req.body;

        if (!access_token) {
            res.status(400).json({
                status: 'error',
                message: 'Access token is required',
            });
            return;
        }

        // Get user from token
        const { data: { user }, error: userError } = await supabase.auth.getUser(
            access_token
        );

        if (userError || !user || !user.email) {
            res.status(401).json({
                status: 'error',
                message: 'Invalid token or user not found',
            });
            return;
        }

        // Validate .edu email
        if (!isEduEmail(user.email)) {
            // Delete the user if email is not .edu
            await supabase.auth.admin.deleteUser(user.id);

            res.status(403).json({
                status: 'error',
                message: 'Only university .edu email addresses are allowed',
            });
            return;
        }

        // Extract college name
        const collegeName = extractCollegeName(user.email);

        // Check if profile exists, create if not
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError && profileError.code !== 'PGRST116') {
            // Error other than "not found"
            res.status(500).json({
                status: 'error',
                message: 'Error checking user profile',
            });
            return;
        }

        // If profile doesn't exist, create it
        if (!profile) {
            const { error: insertError } = await supabase.from('profiles').insert({
                id: user.id,
                email: user.email,
                name: user.user_metadata?.name || user.user_metadata?.full_name,
                avatar_url: user.user_metadata?.avatar_url,
                college_name: collegeName,
            });

            if (insertError) {
                res.status(500).json({
                    status: 'error',
                    message: 'Error creating user profile',
                });
                return;
            }
        }

        // Return success with user data
        res.status(200).json({
            status: 'success',
            message: 'Authentication successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.user_metadata?.name || user.user_metadata?.full_name,
                    avatar_url: user.user_metadata?.avatar_url,
                    college_name: collegeName,
                },
                session: {
                    access_token,
                    refresh_token,
                },
            },
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
};

/**
 * Get current user session
 */
export const getCurrentUser = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Not authenticated',
            });
            return;
        }

        // Get full profile from database
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', req.user.id)
            .single();

        if (error) {
            res.status(500).json({
                status: 'error',
                message: 'Error fetching user profile',
            });
            return;
        }

        res.status(200).json({
            status: 'success',
            data: {
                user: profile,
            },
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
};

/**
 * Sign out user
 */
export const signOut = async (req: Request, res: Response): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(400).json({
                status: 'error',
                message: 'No token provided',
            });
            return;
        }

        const token = authHeader.replace('Bearer ', '');

        const { error } = await supabase.auth.admin.signOut(token);

        if (error) {
            res.status(500).json({
                status: 'error',
                message: 'Error signing out',
            });
            return;
        }

        res.status(200).json({
            status: 'success',
            message: 'Signed out successfully',
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
};
