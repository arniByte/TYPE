// Hand-authored types for the TYPE schema. Kept in sync with
// supabase/migrations/0001_init.sql. (You can regenerate with
// `supabase gen types typescript` if you prefer.)

export type MessageType = 'text' | 'image' | 'video' | 'file' | 'audio' | 'system';
export type ConversationType = 'direct' | 'group';
export type ContactStatus = 'pending' | 'accepted' | 'blocked';
export type MemberRole = 'admin' | 'member';

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  status: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MediaMetadata = {
  width?: number;
  height?: number;
  duration?: number;
  size?: number;
  name?: string;
  mime?: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  type: MessageType;
  media_url: string | null;
  media_metadata: MediaMetadata | null;
  reply_to: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

export type ConversationMember = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: MemberRole;
  last_read_at: string | null;
  joined_at: string;
};

export type Conversation = {
  id: string;
  type: ConversationType;
  name: string | null;
  avatar_url: string | null;
  dm_key: string | null;
  created_by: string | null;
  created_at: string;
  last_message_at: string | null;
};

// Shape returned by get_conversation_overview()
export type ConversationOverview = {
  id: string;
  type: ConversationType;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  last_message_at: string | null;
  role: MemberRole;
  unread: number;
  member_count: number;
  peer: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'last_seen_at'> | null;
  last_message: {
    content: string | null;
    type: MessageType;
    sender_id: string;
    created_at: string;
    deleted: boolean;
  } | null;
};

// Shape returned by search_users()
export type UserSearchResult = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  contact_status: ContactStatus | null;
  last_seen_at: string | null;
};

export type Contact = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: ContactStatus;
  blocked_by: string | null;
  created_at: string;
  updated_at: string;
};

// Minimal Database generic for the typed Supabase client.
type Row<T> = T;
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string; username: string }; Update: Partial<Profile> };
      contacts: { Row: Contact; Insert: Partial<Contact>; Update: Partial<Contact> };
      conversations: { Row: Conversation; Insert: Partial<Conversation>; Update: Partial<Conversation> };
      conversation_members: { Row: ConversationMember; Insert: Partial<ConversationMember>; Update: Partial<ConversationMember> };
      messages: {
        Row: Message;
        Insert: Partial<Message> & { conversation_id: string; sender_id: string };
        Update: Partial<Message>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      ensure_profile: { Args: Record<string, never>; Returns: undefined };
      heartbeat: { Args: Record<string, never>; Returns: undefined };
      mark_read: { Args: { _conv: string }; Returns: undefined };
      search_users: { Args: { _q: string }; Returns: Row<UserSearchResult>[] };
      send_contact_request: { Args: { _username: string }; Returns: string };
      respond_contact_request: { Args: { _contact_id: string; _accept: boolean }; Returns: undefined };
      set_block: { Args: { _target: string; _blocked: boolean }; Returns: undefined };
      create_direct_conversation: { Args: { _other: string }; Returns: string };
      create_group: { Args: { _name: string; _member_ids: string[] }; Returns: string };
      add_group_members: { Args: { _conv: string; _member_ids: string[] }; Returns: undefined };
      remove_group_member: { Args: { _conv: string; _target: string }; Returns: undefined };
      rename_conversation: { Args: { _conv: string; _name: string }; Returns: undefined };
      leave_conversation: { Args: { _conv: string }; Returns: undefined };
      edit_message: { Args: { _id: string; _content: string }; Returns: undefined };
      delete_message: { Args: { _id: string }; Returns: undefined };
      get_conversation_overview: { Args: Record<string, never>; Returns: ConversationOverview[] };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
