-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_url TEXT,
    parent_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parent_category_id);
CREATE INDEX idx_categories_active ON categories(is_active);
CREATE INDEX idx_categories_display_order ON categories(display_order);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read categories
CREATE POLICY "Anyone can view active categories"
    ON categories FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Add trigger
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO categories (name, slug, description, display_order) VALUES
    ('Furniture', 'furniture', 'Beds, desks, chairs, storage units, etc.', 1),
    ('Electronics', 'electronics', 'Laptops, phones, tablets, gaming consoles, etc.', 2),
    ('Books & Textbooks', 'books-textbooks', 'Course materials, novels, study guides, etc.', 3),
    ('Kitchen & Appliances', 'kitchen-appliances', 'Cookware, small appliances, dishes, etc.', 4),
    ('Clothing & Accessories', 'clothing-accessories', 'Apparel, shoes, bags, jewelry, etc.', 5),
    ('Sports & Fitness', 'sports-fitness', 'Exercise equipment, sports gear, bicycles, etc.', 6),
    ('Home Decor', 'home-decor', 'Lamps, rugs, wall art, decorations, etc.', 7),
    ('School Supplies', 'school-supplies', 'Stationery, calculators, backpacks, etc.', 8),
    ('Other', 'other', 'Miscellaneous items', 99);
