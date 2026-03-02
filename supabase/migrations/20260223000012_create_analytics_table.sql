-- Create analytics table for tracking user actions
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Event details
    event_type VARCHAR(100) NOT NULL, -- e.g., 'listing_view', 'search', 'message_sent'
    event_data JSONB, -- Flexible JSON for additional data
    
    -- Context
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes (partitioned by date for performance)
CREATE INDEX idx_analytics_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_listing ON analytics_events(listing_id);
CREATE INDEX idx_analytics_created_at ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_event_type_created ON analytics_events(event_type, created_at DESC);

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view analytics
CREATE POLICY "Only admins can view analytics"
    ON analytics_events FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- System can insert analytics
CREATE POLICY "System can create analytics"
    ON analytics_events FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Function to log analytics event (validates user_id matches caller)
CREATE OR REPLACE FUNCTION log_analytics_event(
    p_user_id UUID,
    p_event_type VARCHAR,
    p_event_data JSONB DEFAULT NULL,
    p_listing_id UUID DEFAULT NULL,
    p_session_id VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    -- Validate that the user_id matches the authenticated user
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Cannot log analytics events for other users';
    END IF;
    
    INSERT INTO analytics_events (user_id, event_type, event_data, listing_id, session_id)
    VALUES (p_user_id, p_event_type, p_event_data, p_listing_id, p_session_id)
    RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
