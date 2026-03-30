import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';

/**
 * POST /api/user/update-profile
 * Update the authenticated user's profile
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                message: 'Not authenticated',
            });
            return;
        }

        const {
            name,
            avatar_url,
            graduation_year,
            phone_number,
            bio,
            is_moving_out,
            move_out_date,
        } = req.body;

        // Build update object with only provided fields
        const updates: Record<string, unknown> = {};

        if (name !== undefined) updates.name = name;
        if (avatar_url !== undefined) updates.avatar_url = avatar_url;
        if (graduation_year !== undefined) {
            if (graduation_year !== null && (typeof graduation_year !== 'number' || graduation_year < 2000 || graduation_year > 2100)) {
                res.status(400).json({
                    status: 'error',
                    message: 'graduation_year must be a valid year between 2000 and 2100',
                });
                return;
            }
            updates.graduation_year = graduation_year;
        }
        if (phone_number !== undefined) updates.phone_number = phone_number;
        if (bio !== undefined) updates.bio = bio;
        if (is_moving_out !== undefined) {
            if (typeof is_moving_out !== 'boolean') {
                res.status(400).json({
                    status: 'error',
                    message: 'is_moving_out must be a boolean',
                });
                return;
            }
            updates.is_moving_out = is_moving_out;
        }
        if (move_out_date !== undefined) updates.move_out_date = move_out_date;

        // Ensure there's something to update
        if (Object.keys(updates).length === 0) {
            res.status(400).json({
                status: 'error',
                message: 'No valid fields provided to update',
            });
            return;
        }

        // Update the profile
        const dbClient = supabaseAdmin ?? supabase;
        const { data: updatedProfile, error } = await dbClient
            .from('profiles')
            .update(updates)
            .eq('id', req.user.id)
            .select('*')
            .single();

        if (error) {
            res.status(500).json({
                status: 'error',
                message: 'Error updating profile',
            });
            return;
        }

        res.status(200).json({
            status: 'success',
            message: 'Profile updated successfully',
            data: {
                user: updatedProfile,
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
 * DELETE /api/user/delete-account
 * Permanently delete the authenticated user's account
 */
export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ status: 'error', message: 'Not authenticated' });
            return;
        }

        if (!supabaseAdmin) {
            res.status(500).json({ status: 'error', message: 'Admin client not configured' });
            return;
        }

        const { error } = await supabaseAdmin.auth.admin.deleteUser(req.user.id);

        if (error) {
            res.status(500).json({ status: 'error', message: 'Error deleting account' });
            return;
        }

        res.status(200).json({ status: 'success', message: 'Account deleted successfully' });
    } catch (_error) {
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
