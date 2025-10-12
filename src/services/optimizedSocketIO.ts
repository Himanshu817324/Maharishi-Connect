// Optimized Socket.IO service with better performance
// This keeps Socket.IO but optimizes its usage

import { io, Socket } from 'socket.io-client';
import { logger } from '@/utils/logger';

interface SocketIOOptions {
  url: string;
  options?: {
    auth?: {
      token?: string;
    };
    transports?: string[];
    upgrade?: boolean;
    rememberUpgrade?: boolean;
    timeout?: number;
    forceNew?: boolean;
  };
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
  onMessage?: (event: string, data: any) => void;
}

class OptimizedSocketIO {
  private socket: Socket | null = null;
  private options: SocketIOOptions;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10; // Increased from 5 to 10
  private reconnectInterval = 2000; // Increased from 1000 to 2000 for better stability
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageQueue: Array<{ event: string; data: any; timestamp: number }> = [];

  constructor(options: SocketIOOptions) {
    this.options = {
      options: {
        transports: ['websocket', 'polling'], // WebSocket first, polling fallback
        upgrade: true, // Enable transport upgrades
        rememberUpgrade: true, // Remember successful upgrades
        timeout: 10000, // Faster timeout for real-time delivery
        forceNew: false, // Don't force new connections unnecessarily
        reconnection: true, // Enable automatic reconnection
        reconnectionAttempts: 10, // Increased from 5 to 10
        reconnectionDelay: 2000, // Increased from 1000 to 2000
        reconnectionDelayMax: 10000, // Increased from 5000 to 10000
        maxReconnectionAttempts: 10,
        // Optimize for real-time performance
        pingTimeout: 60000,
        pingInterval: 25000,
        ...options.options,
        // Ensure auth is properly merged
        auth: {
          ...options.options?.auth
        }
      },
      ...options
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.options.url, this.options.options);

        this.socket.on('connect', () => {
          this.reconnectAttempts = 0;
          logger.info('Socket.IO connected');
          
          // Process queued messages
          this.processQueuedMessages();
          
          this.options.onConnect?.();
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          logger.warn('Socket.IO disconnected:', reason);
          this.options.onDisconnect?.();
          this.handleReconnect();
        });

        this.socket.on('connect_error', (error) => {
          logger.error('Socket.IO connection error:', error);
          this.options.onError?.(error);
          reject(error);
        });

        // Generic message handler
        this.socket.onAny((event, data) => {
          this.options.onMessage?.(event, data);
        });

      } catch (error) {
        logger.error('Failed to create Socket.IO connection:', error);
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      logger.warn('Socket not connected, message queued');
      // Queue message for when connection is restored
      this.messageQueue.push({
        event,
        data,
        timestamp: Date.now()
      });
      
      // Clean old messages (older than 1 minute for real-time)
      this.messageQueue = this.messageQueue.filter(
        msg => Date.now() - msg.timestamp < 60000
      );
    }
  }

  on(event: string, callback: (data: any) => void): void {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (data: any) => void): void {
    this.socket?.off(event, callback);
  }

  private processQueuedMessages(): void {
    if (this.messageQueue.length > 0) {
      logger.info(`Processing ${this.messageQueue.length} queued messages`);
      
      // Process messages immediately without delay
      const messagesToProcess = [...this.messageQueue];
      this.messageQueue = []; // Clear queue first to prevent duplicates
      
      messagesToProcess.forEach(({ event, data }) => {
        if (this.socket?.connected) {
          this.socket.emit(event, data);
        }
      });
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached. Resetting attempts and trying again...');
      // Reset attempts and try again after a longer delay
      this.reconnectAttempts = 0;
      setTimeout(() => {
        this.handleReconnect();
      }, 30000); // Wait 30 seconds before trying again
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectInterval * this.reconnectAttempts, 10000); // Max 10 seconds
    
    this.reconnectTimer = setTimeout(() => {
      logger.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect().catch((error) => {
        logger.error('Reconnection failed:', error);
        // Continue trying if we haven't reached max attempts
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.handleReconnect();
        }
      });
    }, delay);
  }

  get isConnected(): boolean {
    return this.socket?.connected || false;
  }

  get id(): string | undefined {
    return this.socket?.id;
  }
}

// Factory function
export const createOptimizedSocketIO = (options: SocketIOOptions): OptimizedSocketIO => {
  return new OptimizedSocketIO(options);
};

// Singleton instance
let globalSocket: OptimizedSocketIO | null = null;

export const getGlobalSocket = (): OptimizedSocketIO | null => {
  return globalSocket;
};

export const setGlobalSocket = (socket: OptimizedSocketIO): void => {
  globalSocket = socket;
};

export default OptimizedSocketIO;
