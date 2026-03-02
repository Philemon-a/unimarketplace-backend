-- Update profiles table with college relationship and additional fields
ALTER TABLE profiles
    DROP COLUMN IF EXISTS college_name,
    ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES colleges(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS graduation_year INTEGER,
    ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
    ADD COLUMN IF NOT EXISTS bio TEXT,
    ADD COLUMN IF NOT EXISTS is_moving_out BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS move_out_date TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_college_id ON profiles(college_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_moving_out ON profiles(is_moving_out);
CREATE INDEX IF NOT EXISTS idx_profiles_move_out_date ON profiles(move_out_date) WHERE is_moving_out = true;
CREATE INDEX IF NOT EXISTS idx_profiles_is_blocked ON profiles(is_blocked);
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON profiles(last_active_at);

-- Create updated_at trigger function (used by later migrations)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Update RLS policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Users can view all verified profiles (for marketplace browsing)
CREATE POLICY "Users can view verified profiles"
    ON profiles FOR SELECT
    TO authenticated
    USING (email_verified = true AND is_blocked = false);

-- Users can view own profile even if not verified
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Users can update their own profile (but cannot grant themselves admin rights)
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        AND (is_admin = (SELECT is_admin FROM profiles WHERE id = auth.uid()) OR is_admin IS NULL)
    );

-- Service role can fully manage profiles, including admin flag
CREATE POLICY "Service role can manage profiles"
    ON profiles FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);
