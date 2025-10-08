import { DocumentWithId, FirebasePathParam } from "@/shared/types/firebase";

export type EmuFirebaseTransactionFunction = (transaction: FirebaseFirestore.Transaction, metadata: Record<string, string>) => Promise<{ id: string }[] | void>;
export interface EmuWriteOptions {
  payload: DocumentWithId[];
  pathParams: FirebasePathParam[];
  update?: boolean;
  atomic?: boolean;
};

export interface EmuReadOptions {
  pathParams: FirebasePathParam[];
  where?: [string, FirebaseFirestore.WhereFilterOp, any][];
  atomic?: boolean;
};
