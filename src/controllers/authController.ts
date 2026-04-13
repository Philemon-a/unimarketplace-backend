import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';
import { isEduEmail, extractCollegeName, isValidEmailFormat } from '../utils/emailValidator';

/**
 * POST /api/auth/signup
 * Register a new user with email and password (must be .edu email)
 */
export const signUp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, name, grad_year, avatar_url } = req.body;

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

        // Sign up with Supabase Auth — include avatar_url in metadata so the
        // handle_new_user trigger can write it to the profiles row on insert
        const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: name || null,
                    avatar_url: avatar_url || null,
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

        // Parse grad_year string (e.g. "2026") to integer for the DB column
        const graduationYear = grad_year ? parseInt(grad_year, 10) : null;

        // Update the profile row (created by the DB trigger) with graduation_year.
        // Requires the admin client since there is no active session yet.
        if (graduationYear && !isNaN(graduationYear) && supabaseAdmin) {
            await supabaseAdmin
                .from('profiles')
                .update({ graduation_year: graduationYear })
                .eq('id', data.user.id);
        }

        // Send OTP verification code to the user's email.
        // In dev mode skip the send — verifyOtp accepts hardcoded 123456 via admin client.
        if (process.env.NODE_ENV !== 'development') {
            await supabase.auth.signInWithOtp({ email });
        }

        // Fetch the completed profile so we can return college info
        const profileQuery = supabaseAdmin
            ? supabaseAdmin.from('profiles').select('*, colleges(name)').eq('id', data.user.id).single()
            : supabase.from('profiles').select('*, colleges(name)').eq('id', data.user.id).single();
        const { data: profile } = await profileQuery;

        res.status(201).json({
            status: 'success',
            message: 'User registered successfully.',
            data: {
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    name: name || null,
                    avatar_url: avatar_url || null,
                    college_name: (profile?.colleges as { name?: string } | null)?.name || null,
                    grad_year: graduationYear || null,
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
            if (supabaseAdmin) await supabaseAdmin.auth.admin.deleteUser(user.id);

            res.status(403).json({
                status: 'error',
                message: 'Only university .edu email addresses are allowed',
            });
            return;
        }

        // Extract college name
        const collegeName = extractCollegeName(user.email);

        // Use admin client to bypass RLS — the anon client has no auth.uid() context
        // after getUser(), so the "Users can view own profile" policy blocks the select.
        const dbClient = supabaseAdmin ?? supabase;

        // Check if profile exists, create if not
        const { data: profile, error: profileError } = await dbClient
            .from('profiles')
            .select('*, colleges(name)')
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

        // If profile doesn't exist, create it (trigger may have missed it)
        if (!profile) {
            const collegeDomain = user.email.toLowerCase().split('@')[1];
            const { data: college } = await dbClient
                .from('colleges')
                .select('id')
                .eq('domain', collegeDomain)
                .single();

            const { error: insertError } = await dbClient.from('profiles').insert({
                id: user.id,
                email: user.email,
                name: user.user_metadata?.name || user.user_metadata?.full_name,
                avatar_url: user.user_metadata?.avatar_url,
                college_id: college?.id || null,
            });

            if (insertError) {
                res.status(500).json({
                    status: 'error',
                    message: 'Error creating user profile',
                });
                return;
            }
        }

        // Fetch fresh profile after possible insert to get college join
        const { data: freshProfile } = profile
            ? { data: profile }
            : await dbClient.from('profiles').select('*, colleges(name)').eq('id', user.id).single();

        // Return success with user data
        res.status(200).json({
            status: 'success',
            message: 'Authentication successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: (freshProfile?.name as string | null) || user.user_metadata?.name || user.user_metadata?.full_name,
                    avatar_url: (freshProfile?.avatar_url as string | null) || user.user_metadata?.avatar_url,
                    college_name: (freshProfile?.colleges as { name?: string } | null)?.name || collegeName,
                    grad_year: freshProfile?.graduation_year ? String(freshProfile.graduation_year) : null,
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
 * POST /api/auth/request-otp
 * Send a one-time verification code to a .edu email
 */
export const requestOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({ status: 'error', message: 'Email is required' });
            return;
        }

        if (!isValidEmailFormat(email)) {
            res.status(400).json({ status: 'error', message: 'Invalid email format' });
            return;
        }

        if (!isEduEmail(email)) {
            res.status(403).json({
                status: 'error',
                message: 'Only university .edu email addresses are allowed',
            });
            return;
        }

        if (process.env.NODE_ENV === 'development') {
            res.status(200).json({
                status: 'success',
                message: 'Dev mode: use code 123456',
            });
            return;
        }

        const { error } = await supabase.auth.signInWithOtp({ email });

        if (error) {
            res.status(500).json({ status: 'error', message: error.message });
            return;
        }

        res.status(200).json({
            status: 'success',
            message: 'Verification code sent to your email',
        });
    } catch (_error) {
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

/**
 * POST /api/auth/verify-otp
 * Verify the one-time code and return a session
 */
export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, token } = req.body;

        if (!email || !token) {
            res.status(400).json({ status: 'error', message: 'Email and token are required' });
            return;
        }

        if (process.env.NODE_ENV === 'development' && token === '123456') {
            if (!supabaseAdmin) {
                res.status(500).json({ status: 'error', message: 'Admin client not configured' });
                return;
            }
            const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
            if (listError) {
                res.status(500).json({ status: 'error', message: 'Failed to look up user' });
                return;
            }
            const authUser = users.find(u => u.email === email);
            if (!authUser) {
                res.status(401).json({ status: 'error', message: 'User not found' });
                return;
            }
            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email,
            });
            if (linkError || !linkData) {
                res.status(500).json({ status: 'error', message: 'Failed to create session' });
                return;
            }
            const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
                email,
                token: linkData.properties.hashed_token,
                type: 'magiclink',
            });
            if (otpError || !otpData.session) {
                res.status(500).json({ status: 'error', message: 'Failed to verify session' });
                return;
            }
            if (supabaseAdmin) {
                await supabaseAdmin
                    .from('profiles')
                    .update({ email_verified: true })
                    .eq('id', authUser.id);
            }
            res.status(200).json({
                status: 'success',
                message: 'Email verified successfully',
                data: {
                    user: {
                        id: authUser.id,
                        email: authUser.email,
                        name: authUser.user_metadata?.name || null,
                    },
                    session: {
                        access_token: otpData.session.access_token,
                        refresh_token: otpData.session.refresh_token,
                    },
                },
            });
            return;
        }

        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'email',
        });

        if (error || !data.user || !data.session) {
            res.status(401).json({ status: 'error', message: 'Invalid or expired code' });
            return;
        }

        // Check if profile exists, create if new user
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError && profileError.code !== 'PGRST116') {
            res.status(500).json({ status: 'error', message: 'Error checking user profile' });
            return;
        }

        if (!profile) {
            const collegeName = extractCollegeName(email);
            const collegeDomain = email.toLowerCase().split('@')[1];
            const { data: college } = await supabase
                .from('colleges')
                .select('id, name')
                .eq('domain', collegeDomain)
                .single();

            await supabase.from('profiles').insert({
                id: data.user.id,
                email: data.user.email,
                name: data.user.user_metadata?.name || null,
                college_id: college?.id || null,
                college_name: college?.name || collegeName,
                avatar_url: null,
            });
        }

        if (supabaseAdmin) {
            await supabaseAdmin
                .from('profiles')
                .update({ email_verified: true })
                .eq('id', data.user.id);
        }

        res.status(200).json({
            status: 'success',
            message: 'Email verified successfully',
            data: {
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    name: data.user.user_metadata?.name || null,
                },
                session: {
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                },
            },
        });
    } catch (_error) {
        res.status(500).json({ status: 'error', message: 'Internal server error' });
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
