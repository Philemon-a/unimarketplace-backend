-- Create listing status enum
CREATE TYPE listing_status AS ENUM ('active', 'sold', 'expired', 'deleted');

-- Create listing condition enum
CREATE TYPE item_condition AS ENUM ('new', 'like_new', 'good', 'fair', 'poor');

-- Create listings table
CREATE TABLE IF NOT EXISTS listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    
    -- Listing details
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    condition item_condition NOT NULL,
    status listing_status DEFAULT 'active',
    
    -- Location details
    location_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    
    -- Move-out mode
    is_urgent BOOLEAN DEFAULT false,
    move_out_deadline TIMESTAMP WITH TIME ZONE,
    
    -- Images (array of URLs)
    images TEXT[] DEFAULT '{}',
    
    -- Metadata
    views_count INTEGER DEFAULT 0,
    favorites_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    sold_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_listings_seller ON listings(seller_id);
CREATE INDEX idx_listings_college ON listings(college_id);
CREATE INDEX idx_listings_category ON listings(category_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX idx_listings_expires_at ON listings(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_listings_urgent ON listings(is_urgent) WHERE is_urgent = true;
CREATE INDEX idx_listings_active ON listings(status, college_id, created_at DESC) WHERE status = 'active';
CREATE INDEX idx_listings_search ON listings USING GIN (to_tsvector('english', title || ' ' || description));

-- Composite indexes for common queries
CREATE INDEX idx_listings_college_status_created ON listings(college_id, status, created_at DESC);
CREATE INDEX idx_listings_category_status_created ON listings(category_id, status, created_at DESC);
CREATE INDEX idx_listings_seller_status ON listings(seller_id, status);

-- Enable RLS
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Users can view active listings from verified sellers
CREATE POLICY "Users can view active listings"
    ON listings FOR SELECT
    TO authenticated
    USING (
        status = 'active' 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = listings.seller_id 
            AND profiles.email_verified = true 
            AND profiles.is_blocked = false
        )
    );

-- Sellers can view their own listings (all statuses)
CREATE POLICY "Sellers can view own listings"
    ON listings FOR SELECT
    TO authenticated
    USING (auth.uid() = seller_id);

-- Users can create listings
CREATE POLICY "Users can create listings"
    ON listings FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = seller_id 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.email_verified = true
            AND profiles.is_blocked = false
        )
    );

-- Sellers can update their own listings
CREATE POLICY "Sellers can update own listings"
    ON listings FOR UPDATE
    TO authenticated
    USING (auth.uid() = seller_id)
    WITH CHECK (auth.uid() = seller_id);

-- Sellers can delete their own listings (soft delete by status)
CREATE POLICY "Sellers can delete own listings"
    ON listings FOR DELETE
    TO authenticated
    USING (auth.uid() = seller_id);

-- Add trigger
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-expire listings
CREATE OR REPLACE FUNCTION expire_old_listings()
RETURNS void AS $$
BEGIN
    UPDATE listings
    SET status = 'expired'
    WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a function to increment view count
CREATE OR REPLACE FUNCTION increment_listing_views(listing_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE listings
    SET views_count = views_count + 1
    WHERE id = listing_id
    AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
