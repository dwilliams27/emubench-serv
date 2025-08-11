export type EmuConditionInputType = 'int' | 'uint' | 'float' | 'hex' | 'chars';

export interface EmuConditionInput {
  name: string;
  type: EmuConditionInputType;
  rawValue: string; // Hex string
  parsedValue?: EmuConditionPrimitiveResult;
}

export interface EmuCondition {
  inputs: EmuConditionInputSet;
  logic: EmuConditionPart;
};

export interface EmuConditionPart {
  lhs?: EmuConditionOperand;
  rhs?: EmuConditionOperand;
  operation: EmuConditionOperation;
}

export interface EmuConditionParentheses {
  open: boolean;
}

export type EmuConditionInputSet = Record<string, EmuConditionInput>;
export type EmuConditionPrimitiveResult = string | number | boolean;
export type EmuConditionOperand = EmuConditionPrimitiveResult | EmuConditionInput | EmuConditionPart;
export type EmuConditionOperationFunction = (inputs: EmuConditionInputSet, operands: { lhs?: EmuConditionOperand, rhs?: EmuConditionOperand }) => EmuConditionPrimitiveResult;

export interface EmuConditionOperation {
  id: string;
  name: string;
  hasLeftOperand?: boolean;
  hasRightOperand?: boolean;
  func: EmuConditionOperationFunction;
}

export interface EmuLinkedExpressionPart {
  prev?: EmuLinkedExpressionPart;
  next?: EmuLinkedExpressionPart;
  value: EmuConditionOperand | EmuConditionParentheses;
}

export interface EmuRawExpressionPart {
  primitiveValue?: string | number | boolean;
  input?: EmuConditionInput;
  operation?: EmuConditionOperation;
  parentheses?: {
    open: boolean;
  };
}
