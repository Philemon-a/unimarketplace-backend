-- Create report type enum
CREATE TYPE report_type AS ENUM ('listing', 'user', 'message');

-- Create report reason enum
CREATE TYPE report_reason AS ENUM (
    'spam',
    'scam',
    'inappropriate_content',
    'misleading_info',
    'duplicate',
    'harassment',
    'counterfeit',
    'other'
);

-- Create report status enum
CREATE TYPE report_status AS ENUM ('pending', 'reviewing', 'resolved', 'dismissed');

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- What is being reported
    report_type report_type NOT NULL,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    reported_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    
    -- Report details
    reason report_reason NOT NULL,
    description TEXT CHECK (length(description) <= 2000),
    status report_status DEFAULT 'pending',
    
    -- Admin review
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT CHECK (length(admin_notes) <= 2000),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure at least one target is specified
    CONSTRAINT check_report_target CHECK (
        (report_type = 'listing' AND listing_id IS NOT NULL) OR
        (report_type = 'user' AND reported_user_id IS NOT NULL) OR
        (report_type = 'message' AND message_id IS NOT NULL)
    )
);

-- Create indexes
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_listing ON reports(listing_id);
CREATE INDEX idx_reports_user ON reports(reported_user_id);
CREATE INDEX idx_reports_message ON reports(message_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_type ON reports(report_type);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_reports_pending ON reports(status, created_at DESC) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
    ON reports FOR SELECT
    TO authenticated
    USING (auth.uid() = reporter_id);

-- Users can create reports
CREATE POLICY "Users can create reports"
    ON reports FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = reporter_id);

-- Admins can view and manage all reports (will be refined with admin role)
CREATE POLICY "Admins can manage reports"
    ON reports FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- Add trigger
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
