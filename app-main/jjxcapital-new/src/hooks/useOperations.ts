import { useCollection } from "react-firebase-hooks/firestore";
import { collection, query, where, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { firestore } from "../firebase/config";
import { Operation } from "../types";

export const useOperations = (uid: string) => {
  const opsRef = collection(firestore, "ops");
  const q = query(
    opsRef, 
    where("uid", "==", uid), 
    orderBy("createdAt", "desc")
  );
  const [snapshot, loading, error] = useCollection(q);

  const operations: Operation[] = snapshot?.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Operation)) || [];

  const addOperation = async (operationData: Omit<Operation, 'id' | 'createdAt'>) => {
    try {
      await addDoc(opsRef, {
        ...operationData,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error adding operation:", error);
      throw error;
    }
  };

  const updateOperation = async (id: string, operationData: Partial<Operation>) => {
    try {
      const docRef = doc(firestore, "ops", id);
      await updateDoc(docRef, operationData);
    } catch (error) {
      console.error("Error updating operation:", error);
      throw error;
    }
  };

  const deleteOperation = async (id: string) => {
    try {
      const docRef = doc(firestore, "ops", id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Error deleting operation:", error);
      throw error;
    }
  };

  return {
    operations,
    loading,
    error,
    addOperation,
    updateOperation,
    deleteOperation
  };
};