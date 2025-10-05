// Empty service - no mock data
// This file is kept for compatibility but returns empty data

import { Contact } from './contactService';
import { ChatData } from './chatService';

export class MockDataService {
  private static instance: MockDataService;

  static getInstance(): MockDataService {
    if (!MockDataService.instance) {
      MockDataService.instance = new MockDataService();
    }
    return MockDataService.instance;
  }

  constructor() {
    // No mock data generation
  }

  // Return empty arrays for all data
  async getContacts(): Promise<Contact[]> {
    return [];
  }

  async searchContacts(_query: string): Promise<Contact[]> {
    return [];
  }

  async getChats(): Promise<ChatData[]> {
    return [];
  }

  async getChatMessages(_chatId: string): Promise<any[]> {
    return [];
  }

  async createChat(_participantIds: string[]): Promise<ChatData> {
    throw new Error('Mock data service should not be used for creating chats');
  }

  async sendMessage(_chatId: string, _content: string): Promise<any> {
    throw new Error('Mock data service should not be used for sending messages');
  }

  // Always return false to disable mock data
  static shouldUseMockData(): boolean {
    return false;
  }
}

export const mockDataService = MockDataService.getInstance();
