-- Update colleges policy to use profiles.is_admin (now that it exists from migration 003)
DROP POLICY IF EXISTS "Only service role can manage colleges" ON colleges;

-- Admins can now manage colleges
CREATE POLICY "Only admins can manage colleges"
    ON colleges FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.is_admin = true
        )
    );
