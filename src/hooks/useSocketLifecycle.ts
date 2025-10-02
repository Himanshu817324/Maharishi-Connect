import React, { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import socketService from '../services/socketService';

interface SocketLifecycleOptions {
    connectOnFocus?: boolean;
    disconnectOnBlur?: boolean;
    disconnectDelay?: number; // Delay before disconnecting (ms)
}

export const useSocketLifecycle = (options: SocketLifecycleOptions = {}) => {
    const {
        connectOnFocus = true,
        disconnectOnBlur = true,
        disconnectDelay = 5000, // 5 seconds delay before disconnecting
    } = options;

    const navigation = useNavigation();
    const disconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isInChatContextRef = useRef(false);

    // Track when user is in chat-related screens
    useFocusEffect(
        React.useCallback(() => {
            console.log('🔌 [useSocketLifecycle] Screen focused - chat context active');
            isInChatContextRef.current = true;

            // Clear any pending disconnection
            if (disconnectTimeoutRef.current) {
                clearTimeout(disconnectTimeoutRef.current);
                disconnectTimeoutRef.current = null;
                console.log('🔌 [useSocketLifecycle] Cancelled pending socket disconnection');
            }

            // Connect socket if needed and option is enabled
            if (connectOnFocus && !socketService.getConnectionStatus()) {
                console.log('🔌 [useSocketLifecycle] Connecting socket on screen focus');
                // Note: Actual connection will be handled by the specific screen
            }

            return () => {
                console.log('🔌 [useSocketLifecycle] Screen unfocused - scheduling socket disconnection');
                isInChatContextRef.current = false;

                // Schedule disconnection with delay
                if (disconnectOnBlur) {
                    disconnectTimeoutRef.current = setTimeout(() => {
                        // Only disconnect if user is not in any chat context
                        if (!isInChatContextRef.current) {
                            console.log('🔌 [useSocketLifecycle] Disconnecting socket after delay');
                            socketService.disconnect();
                        }
                    }, disconnectDelay);
                }
            };
        }, [connectOnFocus, disconnectOnBlur, disconnectDelay])
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (disconnectTimeoutRef.current) {
                clearTimeout(disconnectTimeoutRef.current);
            }
        };
    }, []);

    return {
        isInChatContext: isInChatContextRef.current,
        cancelDisconnection: () => {
            if (disconnectTimeoutRef.current) {
                clearTimeout(disconnectTimeoutRef.current);
                disconnectTimeoutRef.current = null;
                console.log('🔌 [useSocketLifecycle] Socket disconnection cancelled');
            }
        }
    };
};
