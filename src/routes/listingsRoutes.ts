import { Router } from 'express';
import {
    createListing,
    getAllListings,
    getListingById,
    updateListing,
    deleteListing,
} from '../controllers/listingsController';
import { authenticate, validateEduEmail } from '../middleware/authMiddleware';

const router = Router();

/**
 * POST /api/listings/create-listing
 * Create a new listing
 */
router.post('/create-listing', authenticate, validateEduEmail, createListing);

/**
 * GET /api/listings/get-all-listings
 * Get all active listings for the user's college
 */
router.get('/get-all-listings', authenticate, validateEduEmail, getAllListings);

/**
 * GET /api/listings/:id
 * Get a single listing by ID
 */
router.get('/:id', authenticate, getListingById);

/**
 * PUT /api/listings/:id
 * Update a listing (seller only)
 */
router.put('/:id', authenticate, validateEduEmail, updateListing);

/**
 * DELETE /api/listings/:id
 * Soft delete a listing (seller only)
 */
router.delete('/:id', authenticate, deleteListing);

export default router;
