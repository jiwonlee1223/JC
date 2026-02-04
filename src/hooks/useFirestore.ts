// Firestore 데이터 관리 훅
import { useState, useEffect, useCallback } from 'react';
import {
  getDocument,
  getCollection,
  createDocument,
  updateDocument,
  deleteDocument,
  subscribeToDocument,
  subscribeToCollection,
  type QueryConstraint,
} from '../lib/firestore';
import { type DocumentData } from 'firebase/firestore';

// 단일 문서 조회 훅
export const useDocument = <T>(
  collectionName: string,
  docId: string | null,
  realtime: boolean = false
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!docId) {
      setData(null);
      setLoading(false);
      return;
    }

    if (realtime) {
      const unsubscribe = subscribeToDocument<T>(
        collectionName,
        docId,
        (doc) => {
          setData(doc);
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } else {
      getDocument<T>(collectionName, docId)
        .then(setData)
        .catch(setError)
        .finally(() => setLoading(false));
    }
  }, [collectionName, docId, realtime]);

  return { data, loading, error };
};

// 컬렉션 조회 훅
export const useCollection = <T>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  realtime: boolean = false
) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (realtime) {
      const unsubscribe = subscribeToCollection<T>(
        collectionName,
        (docs) => {
          setData(docs);
          setLoading(false);
        },
        ...constraints
      );
      return () => unsubscribe();
    } else {
      getCollection<T>(collectionName, ...constraints)
        .then(setData)
        .catch(setError)
        .finally(() => setLoading(false));
    }
  }, [collectionName, realtime, JSON.stringify(constraints)]);

  return { data, loading, error };
};

// Firestore CRUD 작업 훅
export const useFirestoreMutation = <T extends DocumentData>(
  collectionName: string
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(
    async (data: T): Promise<string | null> => {
      setLoading(true);
      setError(null);
      try {
        const id = await createDocument(collectionName, data);
        return id;
      } catch (err) {
        setError(err as Error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [collectionName]
  );

  const update = useCallback(
    async (docId: string, data: Partial<T>): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await updateDocument(collectionName, docId, data);
        return true;
      } catch (err) {
        setError(err as Error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [collectionName]
  );

  const remove = useCallback(
    async (docId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await deleteDocument(collectionName, docId);
        return true;
      } catch (err) {
        setError(err as Error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [collectionName]
  );

  return { create, update, remove, loading, error };
};
