-- Create colleges table
CREATE TABLE IF NOT EXISTS colleges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(100) NOT NULL UNIQUE, -- e.g., "nyu.edu", "mit.edu"
    location_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'USA',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_colleges_domain ON colleges(domain);
CREATE INDEX idx_colleges_location ON colleges(city, state, country);
CREATE INDEX idx_colleges_coordinates ON colleges(latitude, longitude);
CREATE INDEX idx_colleges_verified ON colleges(is_verified);

-- Add RLS policies
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read colleges
CREATE POLICY "Anyone can view colleges"
    ON colleges FOR SELECT
    TO authenticated
    USING (true);

-- Only service role can manage colleges initially (admin check will be added in migration 003)
CREATE POLICY "Only service role can manage colleges"
    ON colleges FOR ALL
    TO service_role
    USING (true);

-- Create updated_at trigger (uses function from migration 001)
CREATE TRIGGER update_colleges_updated_at BEFORE UPDATE ON colleges
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Insert sample colleges for testing
INSERT INTO colleges (name, domain, city, state, latitude, longitude, is_verified) VALUES
    ('New York University', 'nyu.edu', 'New York', 'NY', 40.7295, -73.9965, true),
    ('Massachusetts Institute of Technology', 'mit.edu', 'Cambridge', 'MA', 42.3601, -71.0942, true),
    ('Stanford University', 'stanford.edu', 'Stanford', 'CA', 37.4275, -122.1697, true),
    ('University of California Berkeley', 'berkeley.edu', 'Berkeley', 'CA', 37.8719, -122.2585, true),
    ('Columbia University', 'columbia.edu', 'New York', 'NY', 40.8075, -73.9626, true);
