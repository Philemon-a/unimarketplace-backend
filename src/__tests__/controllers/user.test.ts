import request from 'supertest';
import express, { Application } from 'express';
import { mockSupabase, mockQueryBuilder } from '../helpers/supabaseMock';

// ── Mock Supabase before importing anything that uses it ──────────────────────
jest.mock('../../config/supabase', () => ({
    supabase: mockSupabase,
}));

import userRoutes from '../../routes/userRoutes';

// ── Build a minimal Express app for testing ───────────────────────────────────
const app: Application = express();
app.use(express.json());
app.use('/api/user', userRoutes);

// ── Reset mocks between tests ─────────────────────────────────────────────────
beforeEach(() => {
    jest.clearAllMocks();
    mockQueryBuilder.select.mockReturnThis();
    mockQueryBuilder.eq.mockReturnThis();
    mockQueryBuilder.update.mockReturnThis();
    mockQueryBuilder.insert.mockResolvedValue({ error: null });
    mockQueryBuilder.single.mockResolvedValue({ data: null, error: null });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/user/update-profile
// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /api/user/update-profile', () => {
    const UPDATE_URL = '/api/user/update-profile';

    it('should return 401 when no token is provided', async () => {
        const res = await request(app)
            .post(UPDATE_URL)
            .send({ name: 'New Name' });

        expect(res.status).toBe(401);
        expect(res.body.message).toBe('No authentication token provided');
    });

    it('should return 400 when no fields are provided', async () => {
        // authenticate middleware succeeds
        mockSupabase.auth.getUser.mockResolvedValueOnce({
            data: {
                user: {
                    id: 'user-uuid-1',
                    email: 'user@caldwell.edu',
                    user_metadata: { name: 'Test User' },
                },
            },
            error: null,
        });

        const res = await request(app)
            .post(UPDATE_URL)
            .set('Authorization', 'Bearer valid-token')
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('No valid fields provided to update');
    });

    it('should return 400 for invalid graduation_year', async () => {
        mockSupabase.auth.getUser.mockResolvedValueOnce({
            data: {
                user: {
                    id: 'user-uuid-1',
                    email: 'user@caldwell.edu',
                    user_metadata: {},
                },
            },
            error: null,
        });

        const res = await request(app)
            .post(UPDATE_URL)
            .set('Authorization', 'Bearer valid-token')
            .send({ graduation_year: 1990 });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe(
            'graduation_year must be a valid year between 2000 and 2100'
        );
    });

    it('should return 400 for non-boolean is_moving_out', async () => {
        mockSupabase.auth.getUser.mockResolvedValueOnce({
            data: {
                user: {
                    id: 'user-uuid-1',
                    email: 'user@caldwell.edu',
                    user_metadata: {},
                },
            },
            error: null,
        });

        const res = await request(app)
            .post(UPDATE_URL)
            .set('Authorization', 'Bearer valid-token')
            .send({ is_moving_out: 'yes' });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('is_moving_out must be a boolean');
    });

    it('should return 200 and update profile successfully', async () => {
        // authenticate middleware
        mockSupabase.auth.getUser.mockResolvedValueOnce({
            data: {
                user: {
                    id: 'user-uuid-1',
                    email: 'user@caldwell.edu',
                    user_metadata: { name: 'Test User' },
                },
            },
            error: null,
        });

        // profile update returns updated data
        const updatedProfile = {
            id: 'user-uuid-1',
            email: 'user@caldwell.edu',
            name: 'Updated Name',
            bio: 'Hello world',
            graduation_year: 2026,
        };
        mockQueryBuilder.single.mockResolvedValueOnce({
            data: updatedProfile,
            error: null,
        });

        const res = await request(app)
            .post(UPDATE_URL)
            .set('Authorization', 'Bearer valid-token')
            .send({ name: 'Updated Name', bio: 'Hello world', graduation_year: 2026 });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.message).toBe('Profile updated successfully');
        expect(res.body.data.user.name).toBe('Updated Name');
        expect(res.body.data.user.bio).toBe('Hello world');
    });

    it('should return 500 when supabase update fails', async () => {
        mockSupabase.auth.getUser.mockResolvedValueOnce({
            data: {
                user: {
                    id: 'user-uuid-1',
                    email: 'user@caldwell.edu',
                    user_metadata: {},
                },
            },
            error: null,
        });

        mockQueryBuilder.single.mockResolvedValueOnce({
            data: null,
            error: { message: 'database error' },
        });

        const res = await request(app)
            .post(UPDATE_URL)
            .set('Authorization', 'Bearer valid-token')
            .send({ name: 'Updated Name' });

        expect(res.status).toBe(500);
        expect(res.body.message).toBe('Error updating profile');
    });
});
