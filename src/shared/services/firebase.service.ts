import { ID_MAP } from '@/shared/types/firebase';
import { FID_LIST } from '@/shared/utils/id';
import { initializeApp, getApps } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

export interface FirebasePathParams {
  collection: string;
  docId?: string;
};

export class FirebaseService {
  private db: FirebaseFirestore.Firestore;

  constructor() {
    if (!getApps().length) {
      initializeApp();
    }
    this.db = getFirestore();
  }

  getDocumentByRef(id: string, additionalPathIds?: string[]) {
    const res = FID_LIST.find(prefix => id.startsWith(prefix));
    if (!res) {
      throw new Error(`Invalid ID prefix for ${id}`);
    }

    return additionalPathIds ? this.drillDownPath(ID_MAP[res](...additionalPathIds, id)) : this.drillDownPath(ID_MAP[res](id));
  }

  drillDownPath(params: FirebasePathParams[]): FirebaseFirestore.CollectionReference | FirebaseFirestore.DocumentReference {
    if (params.length === 0) {
      throw new Error('At least one path parameter is required');
    }

    // Validate that only the last parameter can omit docId
    for (let i = 0; i < params.length - 1; i++) {
      if (!params[i].docId) {
        throw new Error(`Invalid path: docId is required for parameter at index ${i} (${params[i].collection}). Only the last parameter can omit docId to target a collection.`);
      }
    }

    let ref: FirebaseFirestore.CollectionReference | FirebaseFirestore.DocumentReference = this.db.collection(params[0].collection);

    if (params[0].docId) {
      ref = ref.doc(params[0].docId);
    }

    for (let i = 1; i < params.length; i++) {
      ref = (ref as FirebaseFirestore.DocumentReference).collection(params[i].collection);
      if (params[i].docId) {
        ref = (ref as FirebaseFirestore.CollectionReference).doc(params[i].docId!);
      }
    }

    return ref;
  }

  // TODO: partial updates, considering created vs updated timestamps
  async write(options: {
    pathParams: FirebasePathParams[]
    payload: any[]
  }) {
    if (options.payload.length > 1) {
      throw Error('Can only write one object to a specific file');
    }
    if (options.pathParams.length < 1) {
      throw Error('At least one path param (collection/docId) is required');
    }
    const batch = this.db.batch();

    options.payload.forEach(item => {
      const docRef = this.drillDownPath(options.pathParams) as FirebaseFirestore.DocumentReference;
      batch.set(docRef, {
        ...item,
        createdAt: FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
  }

  // TODO: readMany
  async read(options: {
    pathParams: FirebasePathParams[]
  }) {
    if (options.pathParams.length < 1) {
      throw Error('At least one path param (collection/docId) is required');
    }

    const pathString = options.pathParams.map(p => p.docId ? `${p.collection}/${p.docId}` : p.collection).join('/');
    console.log(`[Firebase] Reading from ${pathString}`);

    const ref = this.drillDownPath(options.pathParams);
    const result = await ref.get();

    const documentsWithId = 'docs' in result ? result.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) : [{
      id: result.id,
      ...result.data()
    }];

    console.log(`[Firebase] Got document(s): ${JSON.stringify(documentsWithId)}`)
    return documentsWithId;
  }
}

const firebaseService = new FirebaseService();

export { firebaseService };
