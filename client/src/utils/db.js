// src/utils/db.js
import Dexie from "dexie";

export const db = new Dexie("SecureP2PChatDB");

db.version(1).stores({
  messages: "++id, chatId, text, isMine, timestamp",
});
