import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';
import { ItemCondition } from '../types/database';

const CONDITION_MAP: Record<string, ItemCondition> = {
    'New': 'new',
    'Like New': 'like_new',
    'Good': 'good',
    'Fair': 'fair',
};

const CATEGORY_SLUG_MAP: Record<string, string> = {
    'Furniture': 'furniture',
    'Electronics': 'electronics',
    'Books': 'books-textbooks',
    'Kitchen': 'kitchen-appliances',
    'Decor': 'home-decor',
    'Clothing': 'clothing-accessories',
    'Sports': 'sports-fitness',
    'Other': 'other',
};

/**
 * POST /api/listings/create-listing
 * Create a new listing
 */
export const createListing = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, price, category, condition, move_out_date, images } = req.body;

        // Validate required fields
        if (!title || !description || price === undefined || !category || !condition) {
            res.status(400).json({
                status: 'error',
                message: 'title, description, price, category, and condition are required',
            });
            return;
        }

        if (typeof price !== 'number' || price <= 0) {
            res.status(400).json({
                status: 'error',
                message: 'price must be a number greater than 0',
            });
            return;
        }

        // Map condition label → DB enum
        const mappedCondition = CONDITION_MAP[condition];
        if (!mappedCondition) {
            res.status(400).json({
                status: 'error',
                message: `Invalid condition. Must be one of: ${Object.keys(CONDITION_MAP).join(', ')}`,
            });
            return;
        }

        // Map category label → DB slug
        const categorySlug = CATEGORY_SLUG_MAP[category];
        if (!categorySlug) {
            res.status(400).json({
                status: 'error',
                message: `Invalid category. Must be one of: ${Object.keys(CATEGORY_SLUG_MAP).join(', ')}`,
            });
            return;
        }

        // Get user's college_id from their profile
        const dbClient = supabaseAdmin ?? supabase;

        // Look up category_id by slug
        const { data: categoryRow, error: categoryError } = await dbClient
            .from('categories')
            .select('id')
            .eq('slug', categorySlug)
            .single();

        if (categoryError || !categoryRow) {
            res.status(400).json({
                status: 'error',
                message: 'Category not found',
            });
            return;
        }
        const { data: profile, error: profileError } = await dbClient
            .from('profiles')
            .select('college_id')
            .eq('id', req.user!.id)
            .single();

        if (profileError || !profile) {
            res.status(500).json({
                status: 'error',
                message: 'Error fetching user profile',
            });
            return;
        }

        if (!profile.college_id) {
            res.status(400).json({
                status: 'error',
                message: 'User profile is not associated with a college',
            });
            return;
        }

        // Build insert payload
        const insertPayload = {
            seller_id: req.user!.id,
            college_id: profile.college_id,
            category_id: categoryRow.id,
            title,
            description,
            price,
            condition: mappedCondition,
            status: 'active',
            images: Array.isArray(images) ? images : [],
            is_urgent: !!move_out_date,
            move_out_deadline: move_out_date || null,
        };

        const { data: listing, error: insertError } = await dbClient
            .from('listings')
            .insert(insertPayload)
            .select()
            .single();

        if (insertError) {
            res.status(500).json({
                status: 'error',
                message: insertError.message,
            });
            return;
        }

        res.status(201).json({
            status: 'success',
            message: 'Listing created successfully',
            data: { listing },
        });
    } catch (_error) {
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
};

/**
 * GET /api/listings/get-all-listings
 * Get all active listings for the authenticated user's college
 */
export const getAllListings = async (req: Request, res: Response): Promise<void> => {
    try {
        // Get user's college_id
        const dbClient = supabaseAdmin ?? supabase;
        const { data: profile, error: profileError } = await dbClient
            .from('profiles')
            .select('college_id')
            .eq('id', req.user!.id)
            .single();

        if (profileError || !profile) {
            res.status(500).json({
                status: 'error',
                message: 'Error fetching user profile',
            });
            return;
        }

        if (!profile.college_id) {
            res.status(400).json({
                status: 'error',
                message: 'User profile is not associated with a college',
            });
            return;
        }

        const { q, category, condition, min_price, max_price } = req.query;

        let query = dbClient
            .from('listings')
            .select('*')
            .eq('college_id', profile.college_id)
            .eq('status', 'active');

        if (q) {
            query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
        }

        if (category) {
            const categorySlug = CATEGORY_SLUG_MAP[category as string];
            if (categorySlug) {
                const { data: categoryRow } = await supabase
                    .from('categories')
                    .select('id')
                    .eq('slug', categorySlug)
                    .single();
                if (categoryRow) {
                    query = query.eq('category_id', categoryRow.id);
                }
            }
        }

        if (condition) {
            const mappedCondition = CONDITION_MAP[condition as string];
            if (mappedCondition) {
                query = query.eq('condition', mappedCondition);
            }
        }

        if (min_price) {
            query = query.gte('price', Number(min_price));
        }

        if (max_price) {
            query = query.lte('price', Number(max_price));
        }

        const { data: listings, error: listingsError } = await query
            .order('created_at', { ascending: false });

        if (listingsError) {
            res.status(500).json({
                status: 'error',
                message: 'Error fetching listings',
            });
            return;
        }

        res.status(200).json({
            status: 'success',
            data: { listings },
        });
    } catch (_error) {
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
};

/**
 * GET /api/listings/:id
 * Get a single listing by ID
 */
export const getListingById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const dbClient = supabaseAdmin ?? supabase;

        const { data: listing, error } = await dbClient
            .from('listings')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                res.status(404).json({
                    status: 'error',
                    message: 'Listing not found',
                });
                return;
            }
            res.status(500).json({
                status: 'error',
                message: 'Error fetching listing',
            });
            return;
        }

        const { data: seller } = await dbClient
            .from('profiles')
            .select('id, name, avatar_url, college_id')
            .eq('id', listing.seller_id)
            .single();

        res.status(200).json({
            status: 'success',
            data: { listing, seller },
        });
    } catch (_error) {
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
};

/**
 * PUT /api/listings/:id
 * Update a listing (seller only)
 */
export const updateListing = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, description, price, condition, status, move_out_date, images } = req.body;

        // Build update object from only provided fields
        const updates: Record<string, unknown> = {};

        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (status !== undefined) updates.status = status;

        if (price !== undefined) {
            if (typeof price !== 'number' || price <= 0) {
                res.status(400).json({
                    status: 'error',
                    message: 'price must be a number greater than 0',
                });
                return;
            }
            updates.price = price;
        }

        if (condition !== undefined) {
            const mappedCondition = CONDITION_MAP[condition];
            if (!mappedCondition) {
                res.status(400).json({
                    status: 'error',
                    message: `Invalid condition. Must be one of: ${Object.keys(CONDITION_MAP).join(', ')}`,
                });
                return;
            }
            updates.condition = mappedCondition;
        }

        if (move_out_date !== undefined) {
            updates.is_urgent = true;
            updates.move_out_deadline = move_out_date;
        }

        if (images !== undefined) {
            updates.images = Array.isArray(images) ? images : [];
        }

        if (Object.keys(updates).length === 0) {
            res.status(400).json({
                status: 'error',
                message: 'No fields provided to update',
            });
            return;
        }

        const { data: listing, error } = await supabase
            .from('listings')
            .update(updates)
            .eq('id', id)
            .eq('seller_id', req.user!.id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                res.status(404).json({
                    status: 'error',
                    message: 'Listing not found or you do not have permission to update it',
                });
                return;
            }
            res.status(500).json({
                status: 'error',
                message: 'Error updating listing',
            });
            return;
        }

        res.status(200).json({
            status: 'success',
            message: 'Listing updated successfully',
            data: { listing },
        });
    } catch (_error) {
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
};

/**
 * DELETE /api/listings/:id
 * Soft delete a listing by setting status to 'deleted' (seller only)
 */
export const deleteListing = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const { data: listing, error } = await supabase
            .from('listings')
            .update({ status: 'deleted' })
            .eq('id', id)
            .eq('seller_id', req.user!.id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                res.status(404).json({
                    status: 'error',
                    message: 'Listing not found or you do not have permission to delete it',
                });
                return;
            }
            res.status(500).json({
                status: 'error',
                message: 'Error deleting listing',
            });
            return;
        }

        res.status(200).json({
            status: 'success',
            message: 'Listing deleted successfully',
            data: { listing },
        });
    } catch (_error) {
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
};
