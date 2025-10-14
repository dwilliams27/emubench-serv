import { DocumentWithId, FirebasePathParam } from "@/shared/types/firebase";

export type EmuFirebaseTransactionFunction = (transaction: FirebaseFirestore.Transaction, metadata: Record<string, string>) => Promise<{ id: string }[] | void>;

// Enhanced payload type for field-level updates
export interface FieldUpdatePayload {
  id: string;
  fields: Record<string, any>; // dot notation field paths as keys
}

export interface EmuWriteOptions {
  payload: DocumentWithId[] | FieldUpdatePayload[];
  pathParams: FirebasePathParam[];
  update?: boolean;
  useFieldPaths?: boolean; // Flag to indicate if payload contains field paths
};

export interface EmuReadOptions {
  pathParams: FirebasePathParam[];
  where?: [string, FirebaseFirestore.WhereFilterOp, any][];
};
