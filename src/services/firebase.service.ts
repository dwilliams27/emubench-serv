import { initializeApp, getApps } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

export const FirebaseCollection = {
  SESSIONS: 'SESSIONS'
};

export const FirebaseSubCollection = {
  AGENT_LOGS: 'AGENT_LOGS',
  STATE: 'STATE',
  DEV_LOGS: 'DEV_LOGS'
};

export const FirebaseFile = {
  AGENT_STATE: 'AGENT_STATE',
  TEST_STATE: 'TEST_STATE'
}

export class FirebaseService {
  private db: FirebaseFirestore.Firestore;

  constructor() {
    if (!getApps().length) {
      initializeApp();
    }
    this.db = getFirestore();
  }

  async write(options: {
    collection: string,
    subCollection: string,
    file?: string,
    testId: string,
    payload: any[]
  }) {
    if (options.payload.length > 1 && options.file) {
      throw Error('Can only write one object to a specific file');
    }
    const batch = this.db.batch();

    options.payload.forEach(item => {
      const collectionRef = this.db.collection(options.collection).doc(options.testId).collection(options.subCollection);
      const docRef = options.file ? collectionRef.doc(options.file) : collectionRef.doc();
      batch.set(docRef, {
        item,
        createdAt: FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
  }

  async read(options: {
    collection: string,
    subCollection: string,
    testId: string
  }) {
    const result = await this.db.collection(options.collection)
      .doc(options.testId)
      .collection(options.subCollection)
      .orderBy('createdAt', 'desc')
      .get();

    const documentsWithId = result.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return documentsWithId;
  }
}

const firebaseService = new FirebaseService();

export { firebaseService };
