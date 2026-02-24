-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure user can only favorite a listing once
    CONSTRAINT unique_favorite UNIQUE (user_id, listing_id)
);

-- Create indexes
CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_listing ON favorites(listing_id);
CREATE INDEX idx_favorites_created_at ON favorites(created_at DESC);
CREATE INDEX idx_favorites_user_created ON favorites(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view own favorites"
    ON favorites FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can add favorites
CREATE POLICY "Users can add favorites"
    ON favorites FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can remove their own favorites
CREATE POLICY "Users can remove own favorites"
    ON favorites FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Function to update listing favorites count
CREATE OR REPLACE FUNCTION update_listing_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE listings
        SET favorites_count = favorites_count + 1
        WHERE id = NEW.listing_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE listings
        SET favorites_count = GREATEST(favorites_count - 1, 0)
        WHERE id = OLD.listing_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_favorites_count
    AFTER INSERT OR DELETE ON favorites
    FOR EACH ROW
    EXECUTE FUNCTION update_listing_favorites_count();
