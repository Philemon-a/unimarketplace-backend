import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { isEduEmail, extractCollegeName } from '../utils/emailValidator';

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
