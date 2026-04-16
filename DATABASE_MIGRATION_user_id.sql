-- SQL Migration: Add user_id tracking to all tables
-- Execute these queries in your Supabase SQL editor

-- Add user_id to messages table
ALTER TABLE messages ADD COLUMN user_id uuid;

-- Add user_id to events table
ALTER TABLE events ADD COLUMN user_id uuid;

-- Add user_id to directmessages table
ALTER TABLE directmessages ADD COLUMN user_id uuid;

-- Optional: Create indexes on user_id for faster queries
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_directmessages_user_id ON directmessages(user_id);

-- Optional: Add comments explaining the user_id column
COMMENT ON COLUMN messages.user_id IS 'Device/app user ID generated at first app launch and persisted in AsyncStorage';
COMMENT ON COLUMN events.user_id IS 'Device/app user ID generated at first app launch and persisted in AsyncStorage';
COMMENT ON COLUMN directmessages.user_id IS 'Device/app user ID generated at first app launch and persisted in AsyncStorage';
