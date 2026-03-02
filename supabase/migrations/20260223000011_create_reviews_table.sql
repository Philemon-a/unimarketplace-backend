-- Create reviews table (optional for future)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reviewed_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    
    -- Review details
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure user can't review themselves
    CONSTRAINT check_not_self_review CHECK (reviewer_id != reviewed_user_id)
);

-- Create indexes
CREATE INDEX idx_reviews_reviewer ON reviews(reviewer_id);
CREATE INDEX idx_reviews_reviewed_user ON reviews(reviewed_user_id);
CREATE INDEX idx_reviews_listing ON reviews(listing_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- Enforce uniqueness for listing-specific reviews
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_review_with_listing
    ON reviews(reviewer_id, reviewed_user_id, listing_id)
    WHERE listing_id IS NOT NULL;

-- Enforce uniqueness for general (non-listing) reviews
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_review_without_listing
    ON reviews(reviewer_id, reviewed_user_id)
    WHERE listing_id IS NULL;

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Users can view all reviews
CREATE POLICY "Users can view reviews"
    ON reviews FOR SELECT
    TO authenticated
    USING (true);

-- Users can create reviews (after transaction)
CREATE POLICY "Users can create reviews"
    ON reviews FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = reviewer_id);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
    ON reviews FOR UPDATE
    TO authenticated
    USING (auth.uid() = reviewer_id)
    WITH CHECK (auth.uid() = reviewer_id);

-- Add trigger
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add average rating to profiles (denormalized for performance)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3, 2) DEFAULT 0 CHECK (average_rating >= 0 AND average_rating <= 5);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Function to update user's average rating
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Determine which user to update
    IF TG_OP = 'DELETE' THEN
        target_user_id := OLD.reviewed_user_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.reviewed_user_id = OLD.reviewed_user_id AND NEW.rating = OLD.rating THEN
        -- No need to update if user and rating haven't changed
        RETURN NEW;
    ELSE
        target_user_id := NEW.reviewed_user_id;
    END IF;
    
    -- Update the profile
    UPDATE profiles
    SET 
        average_rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM reviews
            WHERE reviewed_user_id = target_user_id
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM reviews
            WHERE reviewed_user_id = target_user_id
        )
    WHERE id = target_user_id;
    
    -- If UPDATE changed the reviewed_user_id, update old user too
    IF TG_OP = 'UPDATE' AND NEW.reviewed_user_id != OLD.reviewed_user_id THEN
        UPDATE profiles
        SET 
            average_rating = (
                SELECT COALESCE(AVG(rating), 0)
                FROM reviews
                WHERE reviewed_user_id = OLD.reviewed_user_id
            ),
            total_reviews = (
                SELECT COUNT(*)
                FROM reviews
                WHERE reviewed_user_id = OLD.reviewed_user_id
            )
        WHERE id = OLD.reviewed_user_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_rating
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_user_rating();
