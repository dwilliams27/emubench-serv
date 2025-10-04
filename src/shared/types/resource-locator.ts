import { DocumentWithId, FirebasePathParam } from "@/shared/types/firebase";

export type EmuFirebaseTransactionFunction = (transaction: FirebaseFirestore.Transaction) => Promise<{ id: string }[] | void>;
export interface EmuWriteOptions {
  payload: DocumentWithId[];
  pathParams: FirebasePathParam[];
  update?: boolean;
  atomic?: boolean;
  transactionFunctions?: EmuFirebaseTransactionFunction[];
  runTransaction?: boolean;
};

export interface EmuReadOptions {
  pathParams: FirebasePathParam[];
  where?: [string, FirebaseFirestore.WhereFilterOp, any][];
  atomic?: boolean;
  transactionFunctions?: EmuFirebaseTransactionFunction[];
  runTransaction?: boolean;
};
