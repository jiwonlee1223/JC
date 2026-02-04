// Journey Firestore Service (Subcollection Structure)
// Path: users/{userId}/journeys/{journeyId}
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
  type Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Journey } from '../types/journey';

// Get user's journeys collection path
const getUserJourneysCollection = (userId: string) => 
  collection(db, 'users', userId, 'journeys');

// Get specific journey document path
const getJourneyDoc = (userId: string, journeyId: string) =>
  doc(db, 'users', userId, 'journeys', journeyId);

// Firestore Journey type (with Firestore timestamps)
interface FirestoreJourney extends Omit<Journey, 'createdAt' | 'updatedAt'> {
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Convert Firestore document to Journey
const toJourney = (data: FirestoreJourney): Journey => ({
  ...data,
  createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
});

// Save journey to Firestore
export const saveJourney = async (
  userId: string,
  journey: Journey
): Promise<void> => {
  const docRef = getJourneyDoc(userId, journey.id);
  
  // Remove ISO string dates, will use serverTimestamp
  const { createdAt, updatedAt, ...journeyData } = journey;
  
  await setDoc(docRef, {
    ...journeyData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

// Update journey in Firestore
export const updateJourneyInFirestore = async (
  userId: string,
  journeyId: string,
  updates: Partial<Journey>
): Promise<void> => {
  const docRef = getJourneyDoc(userId, journeyId);
  
  // Remove dates from updates
  const { createdAt, updatedAt, ...updateData } = updates;
  
  await setDoc(docRef, {
    ...updateData,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

// Get single journey by ID
export const getJourneyById = async (
  userId: string,
  journeyId: string
): Promise<Journey | null> => {
  const docRef = getJourneyDoc(userId, journeyId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return toJourney(docSnap.data() as FirestoreJourney);
  }
  return null;
};

// Get all journeys for a user
export const getUserJourneys = async (userId: string): Promise<Journey[]> => {
  const q = query(
    getUserJourneysCollection(userId),
    orderBy('updatedAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => 
    toJourney(doc.data() as FirestoreJourney)
  );
};

// Subscribe to user's journeys (realtime)
export const subscribeToUserJourneys = (
  userId: string,
  callback: (journeys: Journey[]) => void
): Unsubscribe => {
  const q = query(
    getUserJourneysCollection(userId),
    orderBy('updatedAt', 'desc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const journeys = querySnapshot.docs.map((doc) =>
      toJourney(doc.data() as FirestoreJourney)
    );
    callback(journeys);
  });
};

// Delete journey
export const deleteJourneyFromFirestore = async (
  userId: string,
  journeyId: string
): Promise<void> => {
  const docRef = getJourneyDoc(userId, journeyId);
  await deleteDoc(docRef);
};
