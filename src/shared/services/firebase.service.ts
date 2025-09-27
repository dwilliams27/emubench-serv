import { DocumentWithId, FirebasePathParam } from '@/shared/types/firebase';
import { EmuWriteOptions } from '@/shared/types/resource-locator';
import { initializeApp, getApps } from 'firebase-admin/app';
import { FieldValue, getFirestore, CollectionReference, DocumentReference } from 'firebase-admin/firestore';

export class FirebaseService {
  private db: FirebaseFirestore.Firestore;

  constructor() {
    if (!getApps().length) {
      initializeApp();
    }
    this.db = getFirestore();
  }

  drillDownPath(params: FirebasePathParam[]): CollectionReference | DocumentReference {
    if (params.length === 0) {
      throw new Error('At least one path parameter is required');
    }

    // Validate that only the last parameter can omit docId
    for (let i = 0; i < params.length - 1; i++) {
      if (!params[i].docId) {
        throw new Error(`Invalid path: docId is required for parameter at index ${i} (${params[i].collection}). Only the last parameter can omit docId to target a collection.`);
      }
    }

    let ref: CollectionReference | DocumentReference = this.db.collection(params[0].collection);

    if (params[0].docId) {
      ref = ref.doc(params[0].docId);
    }

    for (let i = 1; i < params.length; i++) {
      ref = (ref as DocumentReference).collection(params[i].collection);
      if (params[i].docId) {
        ref = (ref as CollectionReference).doc(params[i].docId!);
      }
    }

    return ref;
  }

  async write(
    pathParams: FirebasePathParam[],
    payload: DocumentWithId[],
    options: EmuWriteOptions
  ) {
    if (payload.length > 1) {
      throw Error('Can only write one object to a specific file');
    }
    if (pathParams.length < 1) {
      throw Error('At least one path param (collection/docId) is required');
    }
    const batch = this.db.batch();

    payload.forEach(item => {
      let ref = this.drillDownPath(pathParams);
      if (ref instanceof CollectionReference) {
        ref = ref.doc(item.id);
      }
      
      if (options.update) {
        const { id, ...updateData } = item;
        batch.update(ref, {
          ...updateData,
          updatedAt: FieldValue.serverTimestamp()
        });
      } else {
        batch.set(ref, {
          ...item,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });
      }
    });

    await batch.commit();
  }

  async read(options: {
    pathParams: FirebasePathParam[],
    where?: [string, FirebaseFirestore.WhereFilterOp, any][]
  }) {
    if (options.pathParams.length < 1) {
      throw Error('At least one path param (collection/docId) is required');
    }

    const pathString = options.pathParams.map(p => p.docId ? `${p.collection}/${p.docId}` : p.collection).join('/');
    console.log(`[Firebase] Reading from ${pathString}`);

    const ref = this.drillDownPath(options.pathParams);
    if (ref instanceof CollectionReference) {
      let query: FirebaseFirestore.Query = ref;
      if (options.where) {
        options.where.forEach(condition => {
          query = query.where(...condition);
        });
      }
      
      const querySnapshot = await query.get();
      const documentsWithId = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log(`[Firebase] Got ${documentsWithId.length} document(s) from query`);
      return documentsWithId;
    } else {
      const doc = await ref.get();
      if (!doc.exists) {
        console.log(`[Firebase] No document found at ${pathString}`);
        return [];
      }
      const documentWithId = {
        id: doc.id,
        ...doc.data()
      };
      console.log(`[Firebase] Got document: ${JSON.stringify(documentWithId)}`);
      return [documentWithId];
    }
  }
}

const firebaseService = new FirebaseService();

export { firebaseService };
