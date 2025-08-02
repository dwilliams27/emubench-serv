import { hexToAscii, hexToFloat, hexToInt, hexToUint } from "@/shared/conditions/helpers";
import type { EmuCondition, EmuConditionPrimitiveResult, EmuConditionInputSet, EmuConditionOperand, EmuConditionInput } from "@/shared/conditions/types";

export function emuEvaluateCondition(condition?: EmuCondition): EmuConditionPrimitiveResult {
  if (!condition?.logic) {
    throw new Error('Invalid condition: Logic must be defined');
  }

  // TODO: Handle pointers
  for (const inputName in condition.inputs) {
    const input = condition.inputs[inputName];
    input.parsedValue = emuParseAndPopulateConditionInput(input);
  }

  const result = emuEvaluateOperand(
    condition.inputs,
    condition.logic
  );

  return result;
}

export function emuEvaluateOperand(inputs: EmuConditionInputSet, operand: EmuConditionOperand): EmuConditionPrimitiveResult {
   if (typeof operand === 'object' && 'lhs' in operand && 'operation' in operand) {
    // If part
    const lhsResult = emuEvaluateOperand(inputs, operand.lhs);
    const rhsResult = operand.rhs ? emuEvaluateOperand(inputs, operand.rhs) : undefined;
    return operand.operation(inputs, lhsResult, rhsResult);
  } else if (typeof operand === 'number' || typeof operand === 'string' || typeof operand === 'boolean') {
    // If primitive
    return operand;
  } else if (typeof operand === 'object' && 'inputName' in operand) {
    // If lookup value
    const parsedValue = inputs[operand.inputName]?.parsedValue;
    if (parsedValue === undefined) {
      throw new Error(`Input ${operand.inputName} not found in inputs`);
    }
    return parsedValue;
  }
  throw new Error(`Invalid operand type ${JSON.stringify(operand)}`);
}

export function emuParseAndPopulateConditionInput(input: EmuConditionInput): EmuConditionPrimitiveResult {
  if (input.parsedValue !== undefined) {
    return input.parsedValue;
  }
  switch (input.type) {
    case 'int': {
      return hexToInt(input.rawValue);
    }
    case 'uint': {
      return hexToUint(input.rawValue);
    }
    case 'float': {
      return hexToFloat(input.rawValue);
    }
    case 'chars': {
      return hexToAscii(input.rawValue);
    }
    case 'hex': {
      return input.rawValue;
    }
    default:
      throw new Error(`Unknown type: ${input.type}`);
  }
}
