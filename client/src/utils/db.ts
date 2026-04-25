import Dexie, { Table } from "dexie";

/**
 * Interface representing a single encrypted chat message entity.
 * Stored locally in the browser's IndexedDB.
 */
/**
 * Union type representing the delivery status of a sent message.
 * - `pending`   — Created locally while the WebRTC DataChannel is closed.
 * - `delivered` — Successfully transmitted over the DataChannel.
 * - `read`      — The peer actively opened the chat UI and acknowledged it.
 */
export type MessageStatus = "pending" | "delivered" | "read";

export interface Message {
  id?: number;
  ownerAddress: string;
  chatId: string;
  text: string;
  isMine: boolean;
  timestamp: number;
  isImage?: boolean;
  status?: MessageStatus;
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
 * Union type representing the privacy status of a contact.
 * - `pending`  — Offer received but not yet reviewed by the user.
 * - `accepted` — User explicitly trusted this peer.
 * - `blocked`  — All future offers from this peer are silently dropped.
 */
export type ContactStatus = "pending" | "accepted" | "blocked";

/**
 * Interface representing an application-layer contact record.
 * Stored in the local IndexedDB alongside message history.
 */
export interface Contact {
  address: string;
  status: ContactStatus;
  isArchived: boolean;
  username?: string;
  avatar?: string;
}

/**
 * Database class managing local data persistence using Dexie.js over IndexedDB.
 * Responsible for handling offline storage of encrypted messages and custom relay configurations.
 */
export class SecureP2PDatabase extends Dexie {
  messages!: Table<Message, number>;
  relays!: Table<RelayNode, number>;
  contacts!: Table<Contact, string>;

  constructor() {
    super("SecureP2PChatDB");

    console.log("[IndexedDB Manager] Initializing local database schema...");

    this.version(2).stores({
      messages: "++id, [ownerAddress+chatId], timestamp",
      relays: "++id, &url",
    });

    this.version(3).stores({
      messages: "++id, [ownerAddress+chatId], timestamp, status",
      relays: "++id, &url",
    });

    /**
     * Version 4 — Adds the `contacts` table for the application-layer
     * privacy management system (Accept / Block / Archive).
     */
    this.version(4).stores({
      messages: "++id, [ownerAddress+chatId], timestamp, status",
      relays: "++id, &url",
      contacts: "&address, status, isArchived",
    });

    /**
     * Version 5 — Extends the `contacts` table with an optional `avatar`
     * field for P2P profile picture synchronisation. Non-indexed because
     * it holds large Base64 payloads; queried by primary key only.
     */
    this.version(5).stores({
      messages: "++id, [ownerAddress+chatId], timestamp, status",
      relays: "++id, &url",
      contacts: "&address, status, isArchived",
    });
  }
}

/**
 * Singleton instance of the application's local database.
 */
export const db = new SecureP2PDatabase();
