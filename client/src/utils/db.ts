import Dexie, { Table } from "dexie";

/**
 * Interface representing a single encrypted chat message entity.
 * Stored locally in the browser's IndexedDB.
 */
export interface Message {
  id?: number;
  ownerAddress: string;
  chatId: string;
  text: string;
  isMine: boolean;
  timestamp: number;
  isImage?: boolean;
}

/**
 * Interface representing a custom decentralized relay server node.
 */
export interface RelayNode {
  id?: number;
  url: string;
  name: string;
}

/**
 * Database class managing local data persistence using Dexie.js over IndexedDB.
 * Responsible for handling offline storage of encrypted messages and custom relay configurations.
 */
export class SecureP2PDatabase extends Dexie {
  messages!: Table<Message, number>;
  relays!: Table<RelayNode, number>;

  constructor() {
    super("SecureP2PChatDB");

    console.log("[IndexedDB Manager] Initializing local database schema...");

    this.version(2).stores({
      messages: "++id, [ownerAddress+chatId], timestamp",
      relays: "++id, &url",
    });
  }
}

/**
 * Singleton instance of the application's local database.
 */
export const db = new SecureP2PDatabase();
