# 🚀 Backend Enhancement Plan - Slack Clone

## Phase 1: User Presence & Status (PRIORITY 1)

### Database Schema Additions:
```sql
-- Add to users table
ALTER TABLE users ADD COLUMN presence_status TEXT DEFAULT 'offline'; -- online, offline, away
ALTER TABLE users ADD COLUMN custom_status TEXT;
ALTER TABLE users ADD COLUMN status_emoji TEXT;
ALTER TABLE users ADD COLUMN last_seen DATETIME;

-- Create presence tracking table
CREATE TABLE user_presence (
  user_id TEXT PRIMARY KEY,
  status TEXT NOT NULL, -- online, offline, away, dnd
  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
  custom_status TEXT,
  status_emoji TEXT,
  status_expiration DATETIME,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
```

### Socket.io Events:
- `user-online` - When user connects
- `user-offline` - When user disconnects
- `user-away` - After 5 min inactivity
- `user-status-change` - Custom status update
- `presence-update` - Broadcast to workspace

---

## Phase 2: Unread Messages & Read Receipts

### Database Schema:
```sql
CREATE TABLE message_reads (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(message_id) REFERENCES messages(id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  UNIQUE(message_id, user_id)
);

CREATE TABLE channel_reads (
  user_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  last_read_message_id TEXT,
  last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, channel_id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(channel_id) REFERENCES channels(id)
);

CREATE TABLE dm_reads (
  user_id TEXT NOT NULL,
  dm_conversation_id TEXT NOT NULL,
  last_read_message_id TEXT,
  last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, dm_conversation_id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(dm_conversation_id) REFERENCES dm_conversations(id)
);
```

### API Endpoints:
- `POST /api/channels/:channelId/mark-read` - Mark channel as read
- `GET /api/channels/:channelId/unread-count` - Get unread count
- `GET /api/workspaces/:workspaceId/unread` - All unread counts

---

## Phase 3: Pinned Messages

### Database Schema:
```sql
CREATE TABLE pinned_messages (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  channel_id TEXT,
  dm_conversation_id TEXT,
  pinned_by_user_id TEXT NOT NULL,
  pinned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(message_id) REFERENCES messages(id),
  FOREIGN KEY(channel_id) REFERENCES channels(id),
  FOREIGN KEY(dm_conversation_id) REFERENCES dm_conversations(id),
  FOREIGN KEY(pinned_by_user_id) REFERENCES users(id)
);
```

### API Endpoints:
- `POST /api/messages/:messageId/pin` - Pin a message
- `DELETE /api/messages/:messageId/unpin` - Unpin a message
- `GET /api/channels/:channelId/pinned` - Get pinned messages

---

## Phase 4: Channel Topics & Descriptions

### Database Schema:
```sql
ALTER TABLE channels ADD COLUMN topic TEXT;
ALTER TABLE channels ADD COLUMN description TEXT;
ALTER TABLE channels ADD COLUMN created_by TEXT;
ALTER TABLE channels ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
```

### API Endpoints:
- `PUT /api/channels/:channelId/topic` - Set channel topic
- `PUT /api/channels/:channelId/description` - Set description

---

## Phase 5: Message Search

### Database Schema:
```sql
-- Enable FTS5 (Full-Text Search) for messages
CREATE VIRTUAL TABLE messages_fts USING fts5(
  message_id UNINDEXED,
  content,
  username,
  tokenize='porter'
);

-- Trigger to keep FTS index in sync
CREATE TRIGGER messages_ai AFTER INSERT ON messages BEGIN
  INSERT INTO messages_fts(message_id, content, username)
  SELECT NEW.id, NEW.content, users.username
  FROM users WHERE users.id = NEW.user_id;
END;
```

### API Endpoints:
- `GET /api/workspaces/:workspaceId/search?q=query` - Search messages
- `GET /api/channels/:channelId/search?q=query` - Search in channel

---

## Phase 6: User Roles & Permissions

### Database Schema:
```sql
ALTER TABLE workspace_members ADD COLUMN role TEXT DEFAULT 'member'; -- admin, member, guest

CREATE TABLE workspace_permissions (
  workspace_id TEXT NOT NULL,
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  PRIMARY KEY(workspace_id, role, permission),
  FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
);

-- Permissions: create_channel, invite_members, delete_messages, etc.
```

### API Endpoints:
- `PUT /api/workspaces/:workspaceId/members/:userId/role` - Change user role
- `GET /api/workspaces/:workspaceId/permissions` - Get permissions

---

## Phase 7: Workspace Settings

### Database Schema:
```sql
CREATE TABLE workspace_settings (
  workspace_id TEXT PRIMARY KEY,
  allow_public_channels BOOLEAN DEFAULT 1,
  require_approval_for_join BOOLEAN DEFAULT 0,
  retention_days INTEGER,
  default_channels TEXT, -- JSON array of channel IDs
  FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
);
```

---

## Phase 8: Notifications

### Database Schema:
```sql
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL, -- mention, dm, reaction, etc.
  content TEXT,
  related_message_id TEXT,
  related_channel_id TEXT,
  is_read BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(related_message_id) REFERENCES messages(id),
  FOREIGN KEY(related_channel_id) REFERENCES channels(id)
);
```

### Socket.io Events:
- `notification` - New notification
- `notification-read` - Mark as read

---

## Implementation Priority

### For Hackathon (Next 6 hours):
1. ✅ **User Presence** (30 min) - Show who's online
2. ✅ **Unread Counts** (45 min) - Badge counts on channels
3. ✅ **Custom Status** (20 min) - "In a meeting" etc.
4. ✅ **Pinned Messages** (30 min) - Pin important messages
5. ✅ **Channel Topics** (15 min) - Set channel purpose
6. ✅ **Basic Search** (45 min) - Search messages

**Total: ~3 hours** → High-impact features done!

### Post-Hackathon:
7. Read receipts
8. User roles & permissions
9. Advanced notifications
10. Workspace settings

---

## Expected Impact

### Before:
- Basic messaging
- No presence awareness
- No unread tracking
- No search
- No pinned messages

### After:
- **Live presence** ("John is online")
- **Unread badges** (never miss a message)
- **Custom status** ("In a meeting 🎤")
- **Pinned messages** (important info always visible)
- **Channel topics** (clear channel purpose)
- **Search** (find anything instantly)

**Result:** App feels like a real, professional collaboration tool! 🚀

