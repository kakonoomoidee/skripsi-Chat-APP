import { db } from "@/utils/db";

/**
 * Fetches blocked contacts from local database.
 *
 * @returns {Promise<Array<any>>} Blocked contact records.
 */
export const getBlockedContacts = async () =>
  db.contacts.where("status").equals("blocked").toArray();

/**
 * Resets blocked contact status back to pending.
 *
 * @param {string} peerAddress - Peer wallet address.
 * @returns {Promise<void>} Completion promise.
 */
export const unblockContactToPending = async (
  peerAddress: string,
): Promise<void> => {
  const existing = await db.contacts.get(peerAddress);
  if (!existing) return;
  await db.contacts.put({ ...existing, status: "pending" });
};
