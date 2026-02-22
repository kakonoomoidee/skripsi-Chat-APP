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
  isImage?: boolean;
}

/**
 * Represents a custom relay server node.
 * @interface RelayNode
 */
export interface RelayNode {
  id?: number;
  url: string;
  name: string;
}

/**
 * Database class for SecureP2P Chat leveraging Dexie.js.
 * @class SecureP2PDatabase
 * @extends {Dexie}
 */
export class SecureP2PDatabase extends Dexie {
  messages!: Table<Message, number>;
  relays!: Table<RelayNode, number>;

  constructor() {
    super("SecureP2PChatDB");

    this.version(1).stores({
      messages: "++id, chatId, timestamp",
      relays: "++id, &url",
    });
  }
}

/**
 * Singleton instance of the SecureP2P database.
 */
export const db = new SecureP2PDatabase();
