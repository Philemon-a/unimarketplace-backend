import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';

export const getConversations = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const dbClient = supabaseAdmin ?? supabase;

        const { data: rawConversations, error } = await dbClient
            .from('conversations')
            .select(`
                id, listing_id, buyer_id, seller_id, is_active, last_message_at, created_at,
                messages(id, content, sender_id, created_at, is_read),
                listing:listings(id, title, images),
                buyer:profiles!buyer_id(id, name, avatar_url),
                seller:profiles!seller_id(id, name, avatar_url)
            `)
            .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
            .order('last_message_at', { ascending: false, nullsFirst: false });

        if (error) {
            res.status(500).json({ status: 'error', message: 'Error fetching conversations' });
            return;
        }

        const conversations = (rawConversations ?? []) as any[];

        if (conversations.length === 0) {
            res.status(200).json({ status: 'success', data: { conversations: [] } });
            return;
        }

        const convIds = conversations.map((c) => c.id);
        const { data: unreadRows } = await dbClient
            .from('messages')
            .select('conversation_id')
            .in('conversation_id', convIds)
            .neq('sender_id', userId)
            .eq('is_read', false);

        const unreadMap = new Map<string, number>();
        for (const row of unreadRows ?? []) {
            unreadMap.set(row.conversation_id, (unreadMap.get(row.conversation_id) ?? 0) + 1);
        }

        const result = conversations.map((c) => {
            const isBuyer = c.buyer_id === userId;
            const otherUser = isBuyer
                ? { id: c.seller?.id ?? c.seller_id, name: c.seller?.name ?? null, avatar_url: c.seller?.avatar_url ?? null }
                : { id: c.buyer?.id ?? c.buyer_id, name: c.buyer?.name ?? null, avatar_url: c.buyer?.avatar_url ?? null };

            const sortedMessages = (c.messages ?? []).slice().sort(
                (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            const lastMessage = sortedMessages.length > 0 ? sortedMessages[sortedMessages.length - 1] : null;

            return {
                id: c.id,
                listing_id: c.listing_id,
                buyer_id: c.buyer_id,
                seller_id: c.seller_id,
                is_active: c.is_active,
                last_message_at: c.last_message_at,
                created_at: c.created_at,
                otherUser,
                listing: c.listing ? { id: c.listing.id, title: c.listing.title, images: c.listing.images ?? [] } : null,
                lastMessage,
                unreadCount: unreadMap.get(c.id) ?? 0,
            };
        });

        res.status(200).json({ status: 'success', data: { conversations: result } });
    } catch (_error) {
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

export const getOrCreateConversation = async (req: Request, res: Response): Promise<void> => {
    try {
        const { listing_id } = req.body;
        const userId = req.user!.id;

        if (!listing_id) {
            res.status(400).json({ status: 'error', message: 'listing_id is required' });
            return;
        }

        const dbClient = supabaseAdmin ?? supabase;

        const { data: listing, error: listingError } = await dbClient
            .from('listings')
            .select('id, seller_id, status')
            .eq('id', listing_id)
            .single();

        if (listingError || !listing) {
            res.status(404).json({ status: 'error', message: 'Listing not found' });
            return;
        }

        if (listing.seller_id === userId) {
            res.status(400).json({ status: 'error', message: 'You cannot message yourself about your own listing' });
            return;
        }

        if (listing.status === 'deleted') {
            res.status(400).json({ status: 'error', message: 'This listing is no longer available' });
            return;
        }

        const { data: conversation, error: upsertError } = await dbClient
            .from('conversations')
            .upsert(
                { listing_id, buyer_id: userId, seller_id: listing.seller_id, is_active: true },
                { onConflict: 'listing_id,buyer_id' }
            )
            .select()
            .single();

        if (upsertError || !conversation) {
            res.status(500).json({ status: 'error', message: 'Error creating conversation' });
            return;
        }

        res.status(200).json({ status: 'success', data: { conversation } });
    } catch (_error) {
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

export const getConversationById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const dbClient = supabaseAdmin ?? supabase;

        const { data: raw, error } = await dbClient
            .from('conversations')
            .select(`
                id, listing_id, buyer_id, seller_id, is_active, last_message_at, created_at,
                messages(id, conversation_id, sender_id, content, is_read, read_at, created_at),
                listing:listings(id, title, images, price, status),
                buyer:profiles!buyer_id(id, name, avatar_url),
                seller:profiles!seller_id(id, name, avatar_url)
            `)
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                res.status(404).json({ status: 'error', message: 'Conversation not found' });
                return;
            }
            res.status(500).json({ status: 'error', message: 'Error fetching conversation' });
            return;
        }

        const r = raw as any;

        if (r.buyer_id !== userId && r.seller_id !== userId) {
            res.status(403).json({ status: 'error', message: 'You do not have access to this conversation' });
            return;
        }

        const messages = (r.messages ?? []).slice().sort(
            (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        const conversation = {
            id: r.id,
            listing_id: r.listing_id,
            buyer_id: r.buyer_id,
            seller_id: r.seller_id,
            is_active: r.is_active,
            last_message_at: r.last_message_at,
            created_at: r.created_at,
            listing: r.listing
                ? { id: r.listing.id, title: r.listing.title, images: r.listing.images ?? [], price: r.listing.price, status: r.listing.status }
                : null,
            buyer: r.buyer
                ? { id: r.buyer.id, name: r.buyer.name, avatar_url: r.buyer.avatar_url }
                : { id: r.buyer_id, name: null, avatar_url: null },
            seller: r.seller
                ? { id: r.seller.id, name: r.seller.name, avatar_url: r.seller.avatar_url }
                : { id: r.seller_id, name: null, avatar_url: null },
        };

        res.status(200).json({ status: 'success', data: { conversation, messages } });
    } catch (_error) {
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

export const sendMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user!.id;

        if (!content || typeof content !== 'string' || !content.trim()) {
            res.status(400).json({ status: 'error', message: 'Message content is required' });
            return;
        }

        const dbClient = supabaseAdmin ?? supabase;

        const { data: conversation, error: convError } = await dbClient
            .from('conversations')
            .select('id, buyer_id, seller_id, is_active')
            .eq('id', id)
            .single();

        if (convError || !conversation) {
            if (convError?.code === 'PGRST116') {
                res.status(404).json({ status: 'error', message: 'Conversation not found' });
                return;
            }
            res.status(500).json({ status: 'error', message: 'Error fetching conversation' });
            return;
        }

        if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
            res.status(403).json({ status: 'error', message: 'You do not have access to this conversation' });
            return;
        }

        if (!conversation.is_active) {
            res.status(400).json({ status: 'error', message: 'This conversation has been closed' });
            return;
        }

        const { data: message, error: insertError } = await dbClient
            .from('messages')
            .insert({ conversation_id: id, sender_id: userId, content: content.trim(), is_read: false })
            .select()
            .single();

        if (insertError || !message) {
            res.status(500).json({ status: 'error', message: 'Error sending message' });
            return;
        }

        res.status(201).json({ status: 'success', data: { message } });
    } catch (_error) {
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

export const markConversationRead = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const dbClient = supabaseAdmin ?? supabase;

        const { data: conversation, error: convError } = await dbClient
            .from('conversations')
            .select('id, buyer_id, seller_id')
            .eq('id', id)
            .single();

        if (convError || !conversation) {
            if (convError?.code === 'PGRST116') {
                res.status(404).json({ status: 'error', message: 'Conversation not found' });
                return;
            }
            res.status(500).json({ status: 'error', message: 'Error fetching conversation' });
            return;
        }

        if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
            res.status(403).json({ status: 'error', message: 'You do not have access to this conversation' });
            return;
        }

        const { error: updateError } = await dbClient
            .from('messages')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('conversation_id', id)
            .neq('sender_id', userId)
            .eq('is_read', false);

        if (updateError) {
            res.status(500).json({ status: 'error', message: 'Error marking messages as read' });
            return;
        }

        res.status(200).json({ status: 'success', data: { updated: true } });
    } catch (_error) {
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
