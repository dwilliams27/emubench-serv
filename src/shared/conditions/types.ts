export interface EmuConditionInput {
  type: 'int' | 'uint' | 'float' | 'hex' | 'chars';
  pointerDepth: number;

  rawValue: string; // Hex string
  parsedValue?: EmuConditionPrimitiveResult;
}

export interface EmuCondition {
  inputs: EmuConditionInputSet;
  logic: EmuConditionPart;
};

export interface EmuConditionPart {
  lhs: EmuConditionOperand;
  rhs?: EmuConditionOperand;
  operation: EmuConditionOperation;
}

export type EmuConditionInputSet = Record<string, EmuConditionInput>;
export type EmuConditionPrimitiveResult = string | number | boolean;
export type EmuConditionLookupValue = { inputName: string, value?: EmuConditionPrimitiveResult };
export type EmuConditionOperand = EmuConditionPrimitiveResult | EmuConditionLookupValue | EmuConditionPart;
export type EmuConditionOperation = (inputs: EmuConditionInputSet, lhs: EmuConditionOperand, rhs?: EmuConditionOperand) => EmuConditionPrimitiveResult;
