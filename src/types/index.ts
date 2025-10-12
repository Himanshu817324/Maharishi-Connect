
export interface User {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
}

export interface Message {
  _id: string;
  text: string;
  createdAt: string | Date; // Allow both string and Date for flexibility
  user: {
    _id: string;
    name: string;
    avatar?: string;
  };
  status?: 'sending' | 'sent' | 'delivered' | 'seen' | 'failed';
  chatId?: string;
  senderId?: string;
}

export interface Chat {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isOnline?: boolean;
  participants?: string[];
  messages?: Message[];
}

export interface TypingUser {
  userId: string;
  chatId: string;
  isTyping: boolean;
}

export interface OnlineStatus {
  userId: string;
  isOnline: boolean;
  lastSeen?: string;
}
