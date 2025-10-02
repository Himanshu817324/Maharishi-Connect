// Enhanced logging utility for both debug and release builds
declare var __DEV__: boolean;

interface LogLevel {
    DEBUG: 0;
    INFO: 1;
    WARN: 2;
    ERROR: 3;
}

class Logger {
    private logLevel: number = __DEV__ ? 0 : 1; // Debug shows all, Release shows info and above
    private logs: Array<{ timestamp: string; level: string; message: string; data?: any }> = [];
    private maxLogs = 100; // Keep last 100 logs for debugging

    debug(message: string, data?: any) {
        if (this.logLevel <= 0) {
            console.log(`🐛 [DEBUG] ${message}`, data || '');
        }
        this.addToHistory('DEBUG', message, data);
    }

    info(message: string, data?: any) {
        if (this.logLevel <= 1) {
            console.log(`ℹ️ [INFO] ${message}`, data || '');
        }
        this.addToHistory('INFO', message, data);
    }

    warn(message: string, data?: any) {
        if (this.logLevel <= 2) {
            console.warn(`⚠️ [WARN] ${message}`, data || '');
        }
        this.addToHistory('WARN', message, data);
    }

    error(message: string, data?: any) {
        console.error(`❌ [ERROR] ${message}`, data || '');
        this.addToHistory('ERROR', message, data);
    }

    // Network-specific logging
    network(url: string, method: string, status?: number, error?: any) {
        const message = `${method.toUpperCase()} ${url} ${status ? `- ${status}` : ''}`;
        if (error) {
            this.error(`Network Error: ${message}`, error);
        } else {
            this.debug(`Network: ${message}`);
        }
    }

    // Socket-specific logging
    socket(event: string, data?: any, error?: any) {
        const message = `Socket ${event}`;
        if (error) {
            this.error(`Socket Error: ${message}`, error);
        } else {
            this.debug(`Socket: ${message}`, data);
        }
    }

    // Chat-specific logging
    chat(action: string, chatId?: string, data?: any) {
        const message = `Chat ${action}${chatId ? ` (${chatId})` : ''}`;
        this.info(message, data);
    }

    // Message-specific logging
    message(action: string, messageId?: string, data?: any) {
        const message = `Message ${action}${messageId ? ` (${messageId})` : ''}`;
        this.info(message, data);
    }

    private addToHistory(level: string, message: string, data?: any) {
        this.logs.push({
            timestamp: new Date().toISOString(),
            level,
            message,
            data
        });

        // Keep only the most recent logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
    }

    // Get recent logs for debugging
    getRecentLogs(count = 20): Array<{ timestamp: string; level: string; message: string; data?: any }> {
        return this.logs.slice(-count);
    }

    // Get logs as formatted string for sharing
    getLogsAsString(count = 50): string {
        return this.logs
            .slice(-count)
            .map(log => `[${log.timestamp}] ${log.level}: ${log.message}${log.data ? ` - ${JSON.stringify(log.data)}` : ''}`)
            .join('\n');
    }

    // Clear log history
    clearLogs() {
        this.logs = [];
    }

    // Set log level (0=DEBUG, 1=INFO, 2=WARN, 3=ERROR)
    setLogLevel(level: number) {
        this.logLevel = level;
    }
}

export default new Logger();
