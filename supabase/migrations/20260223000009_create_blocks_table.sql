-- Create blocks table (user blocking functionality)
CREATE TABLE IF NOT EXISTS blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure user can't block themselves and prevent circular blocks
    CONSTRAINT check_not_self_block CHECK (blocker_id != blocked_id),
    CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id),
    CONSTRAINT unique_block_pair UNIQUE (
        LEAST(blocker_id, blocked_id),
        GREATEST(blocker_id, blocked_id)
    )
);

-- Create indexes
CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_id);
CREATE INDEX idx_blocks_created_at ON blocks(created_at DESC);

-- Enable RLS
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- Users can view their own blocks
CREATE POLICY "Users can view own blocks"
    ON blocks FOR SELECT
    TO authenticated
    USING (auth.uid() = blocker_id);

-- Users can create blocks
CREATE POLICY "Users can create blocks"
    ON blocks FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = blocker_id);

-- Users can remove their own blocks
CREATE POLICY "Users can remove own blocks"
    ON blocks FOR DELETE
    TO authenticated
    USING (auth.uid() = blocker_id);

-- Function to check if user is blocked (restricted to current user's relationships)
CREATE OR REPLACE FUNCTION is_user_blocked(user_id UUID, potential_blocker UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Only allow checking if current user is involved in the relationship
    IF auth.uid() != user_id AND auth.uid() != potential_blocker THEN
        RETURN false;
    END IF;
    
    RETURN EXISTS (
        SELECT 1 FROM blocks
        WHERE blocker_id = potential_blocker
        AND blocked_id = user_id
    );
END;
$$ LANGUAGE plpgsql;
