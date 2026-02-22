import Dexie, { Table } from "dexie";

/**
 * Represents a single chat message entity in the database.
 * @interface Message
 */
export interface Message {
  id?: number;
  chatId: string;
  text: string;
  isMine: boolean;
  timestamp: number;
}

/**
 * Database class for SecureP2P Chat leveraging Dexie.js.
 * Manages local storage for end-to-end encrypted messages.
 * @class SecureP2PDatabase
 * @extends {Dexie}
 */
export class SecureP2PDatabase extends Dexie {
  messages!: Table<Message, number>;

  constructor() {
    super("SecureP2PChatDB");

    this.version(1).stores({
      messages: "++id, chatId, text, isMine, timestamp",
    });
  }
}

/**
 * Singleton instance of the SecureP2P database.
 */
export const db = new SecureP2PDatabase();
