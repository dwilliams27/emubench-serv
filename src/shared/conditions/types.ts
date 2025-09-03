export type EmuConditionInputType = 'int' | 'uint' | 'float' | 'hex' | 'chars';

export interface EmuConditionInput {
  name: string;
  type: EmuConditionInputType;
  pointerOffsets?: number[];
  rawValue?: string; // Hex string
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

export interface EmuConditionOperand {
  primitive?: EmuConditionPrimitiveResult;
  input?: EmuConditionInput;
  conditionPart?: EmuConditionPart;
  parentheses?: EmuConditionParentheses;
};

export type EmuConditionInputSet = Record<string, EmuConditionInput>;
export type EmuConditionPrimitiveResult = string | number | boolean;
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
  value: EmuConditionOperand;
}
