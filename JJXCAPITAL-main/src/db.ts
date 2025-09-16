// src/db.ts
import { getFirestore, collection, addDoc, query, where, orderBy, getDocs, serverTimestamp } from "firebase/firestore";
import { app } from "./firebase";

const db = getFirestore(app);

export async function saveOperation(uid: string, base: string, quote: string, priceBuy: number, priceSell: number) {
  const profit = priceSell - priceBuy;
  await addDoc(collection(db, "operations"), {
    uid,
    base,
    quote,
    priceBuy,
    priceSell,
    profit,
    ts: serverTimestamp(),
  });
}

export async function loadOperations(uid: string) {
  const q = query(
    collection(db, "operations"),
    where("uid", "==", uid),
    orderBy("ts", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}