// ─── Enums ────────────────────────────────────────────────────────────────────

export type ListingStatus = 'active' | 'sold' | 'expired' | 'deleted';
export type ItemCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';
export type ReportType = 'listing' | 'user' | 'message';
export type ReportReason =
    | 'spam'
    | 'scam'
    | 'inappropriate_content'
    | 'misleading_info'
    | 'duplicate'
    | 'harassment'
    | 'counterfeit'
    | 'other';
export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';
export type NotificationType =
    | 'new_message'
    | 'listing_sold'
    | 'listing_expired'
    | 'new_favorite'
    | 'price_drop'
    | 'system_announcement';

// ─── Tables ───────────────────────────────────────────────────────────────────

export interface College {
    id: string;
    name: string;
    domain: string;
    location_address: string | null;
    city: string | null;
    state: string | null;
    country: string;
    latitude: number | null;
    longitude: number | null;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
}

export interface Profile {
    id: string;
    name: string | null;
    email: string;
    college_id: string | null;
    avatar_url: string | null;
    email_verified: boolean;
    graduation_year: number | null;
    phone_number: string | null;
    bio: string | null;
    is_moving_out: boolean;
    move_out_date: string | null;
    is_blocked: boolean;
    is_admin: boolean;
    last_active_at: string;
    average_rating: number;
    total_reviews: number;
    created_at: string;
    updated_at: string;
}

export interface Category {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon_url: string | null;
    parent_category_id: string | null;
    display_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Listing {
    id: string;
    seller_id: string;
    college_id: string;
    category_id: string;
    title: string;
    description: string;
    price: number;
    condition: ItemCondition;
    status: ListingStatus;
    location_address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    is_urgent: boolean;
    move_out_deadline: string | null;
    images: string[];
    views_count: number;
    favorites_count: number;
    expires_at: string | null;
    sold_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface Conversation {
    id: string;
    listing_id: string;
    buyer_id: string;
    seller_id: string;
    is_active: boolean;
    closed_at: string | null;
    closed_by: string | null;
    last_message_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    is_read: boolean;
    read_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface Favorite {
    id: string;
    user_id: string;
    listing_id: string;
    created_at: string;
}

export interface Report {
    id: string;
    reporter_id: string;
    report_type: ReportType;
    listing_id: string | null;
    reported_user_id: string | null;
    message_id: string | null;
    reason: ReportReason;
    description: string | null;
    status: ReportStatus;
    reviewed_by: string | null;
    reviewed_at: string | null;
    admin_notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface Block {
    id: string;
    blocker_id: string;
    blocked_id: string;
    reason: string | null;
    created_at: string;
}

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    listing_id: string | null;
    conversation_id: string | null;
    is_read: boolean;
    read_at: string | null;
    created_at: string;
}

export interface Review {
    id: string;
    reviewer_id: string;
    reviewed_user_id: string;
    listing_id: string | null;
    rating: number;
    comment: string | null;
    created_at: string;
    updated_at: string;
}

export interface AnalyticsEvent {
    id: string;
    user_id: string | null;
    event_type: string;
    event_data: Record<string, unknown> | null;
    listing_id: string | null;
    session_id: string | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
}
