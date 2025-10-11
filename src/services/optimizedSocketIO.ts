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
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(options: SocketIOOptions) {
    this.options = {
      options: {
        transports: ['websocket'], // Force WebSocket transport
        upgrade: false, // Disable transport upgrades
        rememberUpgrade: false,
        timeout: 20000,
        forceNew: true,
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
      setTimeout(() => this.emit(event, data), 1000);
    }
  }

  on(event: string, callback: (data: any) => void): void {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (data: any) => void): void {
    this.socket?.off(event, callback);
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      logger.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect().catch(console.error);
    }, this.reconnectInterval);
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
