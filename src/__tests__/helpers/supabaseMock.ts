/**
 * Shared mock for ../config/supabase
 *
 * Every chained Supabase query builder method returns `this` so
 * chains like  supabase.from('x').select('*').eq('id', v).single()
 * resolve naturally. The final method in a chain (.single(), .insert(), etc.)
 * returns a Promise via `mockResolvedValue`.
 *
 * Tests override behaviour with:
 *   mockSupabase.auth.signUp.mockResolvedValueOnce({ ... })
 *   mockQueryBuilder.single.mockResolvedValueOnce({ ... })
 */

const mockQueryBuilder: Record<string, jest.Mock> = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ error: null }),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
};

const mockSupabase = {
    auth: {
        signUp: jest.fn(),
        signInWithPassword: jest.fn(),
        getUser: jest.fn(),
        admin: {
            signOut: jest.fn(),
            deleteUser: jest.fn(),
        },
    },
    from: jest.fn(() => mockQueryBuilder),
};

export { mockSupabase, mockQueryBuilder };
