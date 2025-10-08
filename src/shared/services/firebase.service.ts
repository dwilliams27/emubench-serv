import { FirebasePathParam } from '@/shared/types/firebase';
import { EmuFirebaseTransactionFunction, EmuReadOptions, EmuWriteOptions } from '@/shared/types/resource-locator';
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

  drillDownPath(params: FirebasePathParam[]): CollectionReference | DocumentReference | DocumentReference[] {
    if (params.length === 0) {
      throw new Error('At least one path parameter is required');
    }

    for (let i = 0; i < params.length - 1; i++) {
      if (!params[i].docIds || params[i].docIds!.length === 0) {
        throw new Error(`Invalid path: docIds is required for parameter at index ${i} (${params[i].collection}). Only the last parameter can omit docIds to target a collection.`);
      }
      if (params[i].docIds!.length > 1) {
        throw new Error(`Invalid path: multiple docIds are only allowed for the last parameter at index ${i} (${params[i].collection}).`);
      }
    }

    let ref: CollectionReference | DocumentReference = this.db.collection(params[0].collection);

    if (params[0].docIds && params[0].docIds.length > 0) {
      if (params[0].docIds.length === 1) {
        ref = ref.doc(params[0].docIds[0]);
      } else if (params.length === 1) {
        return params[0].docIds.map(id => (ref as CollectionReference).doc(id));
      }
    }

    for (let i = 1; i < params.length; i++) {
      ref = (ref as DocumentReference).collection(params[i].collection);
      const docIds = params[i].docIds;
      if (docIds && docIds.length > 0) {
        if (docIds.length === 1) {
          ref = (ref as CollectionReference).doc(docIds[0]);
        } else if (i === params.length - 1) {
          return docIds.map(id => (ref as CollectionReference).doc(id));
        }
      }
    }

    return ref;
  }

  async getData(
    ref: CollectionReference | DocumentReference | DocumentReference[],
    transaction?: FirebaseFirestore.Transaction,
    whereConditions?: Array<[string, FirebaseFirestore.WhereFilterOp, any]>
  ) {
    if (Array.isArray(ref)) {
      const docs = transaction
        ? await Promise.all(ref.map(docRef => transaction.get(docRef)))
        : await Promise.all(ref.map(docRef => docRef.get()));

      return docs
        .filter(doc => doc.exists)
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
    } else if (ref instanceof CollectionReference) {
      let query: FirebaseFirestore.Query = ref;
      if (whereConditions) {
        whereConditions.forEach(condition => {
          query = query.where(...condition);
        });
      }

      const querySnapshot = transaction
        ? await transaction.get(query)
        : await query.get();

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } else {
      const doc = transaction
        ? await transaction.get(ref)
        : await ref.get();

      if (!doc.exists) {
        return [];
      }
      return [{
        id: doc.id,
        ...doc.data()
      }];
    }
  }

  async writeTransaction(
    transaction: FirebaseFirestore.Transaction,
    options: EmuWriteOptions
  ) {
    const refs = this.drillDownPath(options.pathParams);

    if (Array.isArray(refs)) {
      options.payload.forEach(item => {
        const ref = refs.find(r => r.id === item.id);
        if (!ref) {
          throw new Error(`No matching document reference found for id: ${item.id}`);
        }

        if (options.update) {
          const { id, ...updateData } = item;
          transaction.update(ref, {
            ...updateData,
            updatedAt: FieldValue.serverTimestamp()
          });
        } else {
          transaction.set(ref, {
            ...item,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          });
        }
      });
    } else {
      options.payload.forEach(item => {
        let ref: DocumentReference = refs instanceof CollectionReference
          ? refs.doc(item.id)
          : refs;

        if (options.update) {
          const { id, ...updateData } = item;
          transaction.update(ref, {
            ...updateData,
            updatedAt: FieldValue.serverTimestamp()
          });
        } else {
          transaction.set(ref, {
            ...item,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          });
        }
      });
    }
  }

  async write(options: EmuWriteOptions) {
    const { pathParams, payload } = options;
    if (pathParams.length < 1) {
      throw Error('At least one path param (collection/docId) is required');
    }

    if (options.atomic) {
      await this.db.runTransaction(async (transaction) => {
        await this.writeTransaction(transaction, options);
      });
    } else {
      const batch = this.db.batch();
      const refs = this.drillDownPath(pathParams);

      if (Array.isArray(refs)) {
        payload.forEach(item => {
          const ref = refs.find(r => r.id === item.id);
          if (!ref) {
            throw new Error(`No matching document reference found for id: ${item.id}`);
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
      } else {
        payload.forEach(item => {
          let ref: DocumentReference = refs instanceof CollectionReference
            ? refs.doc(item.id)
            : refs;

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
      }

      await batch.commit();
    }
    return true;
  }

  async readTransaction(
    transaction: FirebaseFirestore.Transaction,
    options: EmuReadOptions
  ) {
    const ref = this.drillDownPath(options.pathParams);
    return await this.getData(ref, transaction, options.where);
  }

  async runTransactions(
    transactionFunctions: EmuFirebaseTransactionFunction[]
  ) {
    let results: { id: string }[] = [];
    await this.db.runTransaction(async (transaction) => {
      let metadata: Record<string, any> = {};
      for (let i = 0; i < transactionFunctions.length; i++) {
        results.push(...(await transactionFunctions[i](transaction, metadata) || []));
      }
    });
    return results;
  }

  async read(options: EmuReadOptions) {
    if (options.pathParams.length < 1) {
      throw Error('At least one path param (collection/docId) is required');
    }

    if (options.atomic) {
      return await this.db.runTransaction(async (transaction) => {
        return await this.readTransaction(transaction, options);
      });
    }

    const ref = this.drillDownPath(options.pathParams);
    return await this.getData(ref, undefined, options.where);
  }

  async delete(options: EmuReadOptions) {
    const refs = this.drillDownPath(options.pathParams);

    const batch = this.db.batch();

    if (Array.isArray(refs)) {
      refs.forEach(ref => {
        batch.delete(ref);
      });
    } else {
      if (refs instanceof CollectionReference) {
        throw new Error('Not deleting a collection buddy');
      }
      batch.delete(refs);
    }

    await batch.commit();
    return true;
  }
}

const firebaseService = new FirebaseService();

export { firebaseService };
