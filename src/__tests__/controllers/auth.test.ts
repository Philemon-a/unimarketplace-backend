import request from 'supertest';
import express, { Application } from 'express';
import { mockSupabase, mockQueryBuilder } from '../helpers/supabaseMock';

// ── Mock Supabase before importing anything that uses it ──────────────────────
jest.mock('../../config/supabase', () => ({
    supabase: mockSupabase,
}));

import authRoutes from '../../routes/authRoutes';

// ── Build a minimal Express app for testing ───────────────────────────────────
const app: Application = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// ── Reset mocks between tests ─────────────────────────────────────────────────
beforeEach(() => {
    jest.clearAllMocks();
    // Reset chainable defaults
    mockQueryBuilder.select.mockReturnThis();
    mockQueryBuilder.eq.mockReturnThis();
    mockQueryBuilder.update.mockReturnThis();
    mockQueryBuilder.insert.mockResolvedValue({ error: null });
    mockQueryBuilder.single.mockResolvedValue({ data: null, error: null });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/auth/signup
// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /api/auth/signup', () => {
    const SIGNUP_URL = '/api/auth/signup';

    it('should return 400 when email is missing', async () => {
        const res = await request(app)
            .post(SIGNUP_URL)
            .send({ password: 'Test123456' });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Email and password are required');
    });

    it('should return 400 when password is missing', async () => {
        const res = await request(app)
            .post(SIGNUP_URL)
            .send({ email: 'user@caldwell.edu' });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Email and password are required');
    });

    it('should return 400 for invalid email format', async () => {
        const res = await request(app)
            .post(SIGNUP_URL)
            .send({ email: 'not-an-email', password: 'Test123456' });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Invalid email format');
    });

    it('should return 403 for non-.edu email', async () => {
        const res = await request(app)
            .post(SIGNUP_URL)
            .send({ email: 'user@gmail.com', password: 'Test123456' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Only university .edu email addresses are allowed');
    });

    it('should return 400 when password is too short', async () => {
        const res = await request(app)
            .post(SIGNUP_URL)
            .send({ email: 'user@caldwell.edu', password: '123' });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Password must be at least 6 characters long');
    });

    it('should return 400 when Supabase auth returns an error', async () => {
        mockSupabase.auth.signUp.mockResolvedValueOnce({
            data: { user: null, session: null },
            error: { message: 'User already registered' },
        });

        const res = await request(app)
            .post(SIGNUP_URL)
            .send({ email: 'user@caldwell.edu', password: 'Test123456' });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('User already registered');
    });

    it('should return 201 on successful signup', async () => {
        // Supabase auth.signUp succeeds
        mockSupabase.auth.signUp.mockResolvedValueOnce({
            data: {
                user: { id: 'user-uuid-1', email: 'user@caldwell.edu', user_metadata: {} },
                session: { access_token: 'at-123', refresh_token: 'rt-123' },
            },
            error: null,
        });

        // colleges lookup returns a match
        mockQueryBuilder.single.mockResolvedValueOnce({
            data: { id: 'college-uuid-1', name: 'Caldwell University' },
            error: null,
        });

        // profiles insert succeeds
        mockQueryBuilder.insert.mockResolvedValueOnce({ error: null });

        const res = await request(app)
            .post(SIGNUP_URL)
            .send({ email: 'user@caldwell.edu', password: 'Test123456', name: 'Test User' });

        expect(res.status).toBe(201);
        expect(res.body.status).toBe('success');
        expect(res.body.data.user.email).toBe('user@caldwell.edu');
        expect(res.body.data.user.name).toBe('Test User');
        expect(res.body.data.session.access_token).toBe('at-123');
    });

    it('should return 500 when profile creation fails', async () => {
        mockSupabase.auth.signUp.mockResolvedValueOnce({
            data: {
                user: { id: 'user-uuid-2', email: 'user2@caldwell.edu', user_metadata: {} },
                session: null,
            },
            error: null,
        });

        // colleges lookup
        mockQueryBuilder.single.mockResolvedValueOnce({ data: null, error: null });

        // profiles insert fails
        mockQueryBuilder.insert.mockResolvedValueOnce({
            error: { message: 'duplicate key' },
        });

        const res = await request(app)
            .post(SIGNUP_URL)
            .send({ email: 'user2@caldwell.edu', password: 'Test123456' });

        expect(res.status).toBe(500);
        expect(res.body.message).toBe('Error creating user profile');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/auth/signin
// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /api/auth/signin', () => {
    const SIGNIN_URL = '/api/auth/signin';

    it('should return 400 when email is missing', async () => {
        const res = await request(app)
            .post(SIGNIN_URL)
            .send({ password: 'Test123456' });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Email and password are required');
    });

    it('should return 400 when password is missing', async () => {
        const res = await request(app)
            .post(SIGNIN_URL)
            .send({ email: 'user@caldwell.edu' });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Email and password are required');
    });

    it('should return 401 for wrong credentials', async () => {
        mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
            data: { user: null, session: null },
            error: { message: 'Invalid login credentials' },
        });

        const res = await request(app)
            .post(SIGNIN_URL)
            .send({ email: 'user@caldwell.edu', password: 'WrongPass' });

        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Invalid email or password');
    });

    it('should return 200 on successful signin', async () => {
        mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
            data: {
                user: {
                    id: 'user-uuid-1',
                    email: 'user@caldwell.edu',
                    user_metadata: { name: 'Test User' },
                },
                session: { access_token: 'at-456', refresh_token: 'rt-456' },
            },
            error: null,
        });

        // profile select
        mockQueryBuilder.single.mockResolvedValueOnce({
            data: {
                name: 'Test User',
                avatar_url: 'https://example.com/avatar.png',
                college_id: 'college-uuid-1',
            },
            error: null,
        });

        const res = await request(app)
            .post(SIGNIN_URL)
            .send({ email: 'user@caldwell.edu', password: 'Test123456' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data.user.email).toBe('user@caldwell.edu');
        expect(res.body.data.session.access_token).toBe('at-456');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/auth/me
// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /api/auth/me', () => {
    const ME_URL = '/api/auth/me';

    it('should return 401 when no token is provided', async () => {
        const res = await request(app).get(ME_URL);

        expect(res.status).toBe(401);
        expect(res.body.message).toBe('No authentication token provided');
    });

    it('should return 401 for an invalid token', async () => {
        mockSupabase.auth.getUser.mockResolvedValueOnce({
            data: { user: null },
            error: { message: 'invalid token' },
        });

        const res = await request(app)
            .get(ME_URL)
            .set('Authorization', 'Bearer bad-token');

        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Invalid or expired token');
    });

    it('should return 200 with the user profile', async () => {
        // authenticate middleware — getUser succeeds
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

        // getCurrentUser — profile select
        const fakeProfile = {
            id: 'user-uuid-1',
            email: 'user@caldwell.edu',
            name: 'Test User',
            avatar_url: null,
            college_id: 'college-uuid-1',
            bio: null,
        };
        mockQueryBuilder.single.mockResolvedValueOnce({
            data: fakeProfile,
            error: null,
        });

        const res = await request(app)
            .get(ME_URL)
            .set('Authorization', 'Bearer valid-token');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data.user.id).toBe('user-uuid-1');
        expect(res.body.data.user.email).toBe('user@caldwell.edu');
    });
});
