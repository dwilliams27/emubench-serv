import { hexToAscii, hexToFloat, hexToInt, hexToUint } from "@/shared/conditions/helpers";
import type { EmuCondition, EmuConditionPrimitiveResult, EmuConditionInputSet, EmuConditionOperand, EmuConditionInput, EmuLinkedExpressionPart, EmuRawExpressionPart, EmuConditionParentheses } from "@/shared/conditions/types";

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
    const lhsResult = operand.lhs ? emuEvaluateOperand(inputs, operand.lhs) : undefined;
    const rhsResult = operand.rhs ? emuEvaluateOperand(inputs, operand.rhs) : undefined;
    return operand.operation.func(inputs, { lhs: lhsResult, rhs: rhsResult });
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

function rawExpressionPartToOperand(part: EmuRawExpressionPart): EmuConditionOperand | EmuConditionParentheses {
  if (part.primitiveValue !== undefined) {
    return part.primitiveValue;
  } else if (part.input) {
    return { inputName: part.input?.name || '', value: part.input?.parsedValue };
  } else if (part.operation) {
    return {
      operation: part.operation,
    };
  } else if (part.parentheses) {
    return { open: part.parentheses?.open };
  }
  throw new Error('Invalid raw expression part: Must have primitiveValue, input, operation, or parentheses');
}

// ( 5 + 10 > 20 ) => ((5)+(10))>(20)
function collapseGroup(head: EmuLinkedExpressionPart) {
  let curNode: EmuLinkedExpressionPart | undefined = head;
  let collapsedGroup;
  while (curNode && (typeof curNode.value !== 'object' || (typeof curNode.value === 'object' && !('open' in curNode.value)))) {
    if (typeof curNode.value === 'object' && 'operation' in curNode.value) {
      if (curNode.value.operation.hasLeftOperand) {
        if (!curNode.prev || (typeof curNode.prev.value === 'object' && 'open' in curNode.prev.value)) {
          throw new Error('Left operand required for operation');
        }
        curNode.value.lhs = curNode.prev.value;
      }
      if (curNode.value.operation.hasRightOperand) {
        if (!curNode.next || (typeof curNode.next.value === 'object' && 'open' in curNode.next.value)) {
          throw new Error('Left operand required for operation');
        }
        curNode.value.rhs = curNode.next.value;
      }
      collapsedGroup = curNode;
    }
    curNode = curNode.next;
  }
  return collapsedGroup!;
}

// 1. Convert to linked list
// 2. Backtrack every closed paren to collapse group
export function convertEmuExpressionToCondition(expression: EmuRawExpressionPart[]): EmuCondition {
  if (expression.length === 0) {
    throw new Error('Expression cannot be empty');
  }
  
  const headNode: EmuLinkedExpressionPart = {
    next: undefined,
    value: rawExpressionPartToOperand(expression[0]),
  };
  let curNode: EmuLinkedExpressionPart | undefined = headNode;
  for (let i = 1; i < expression.length; i++) {
    const newNode: EmuLinkedExpressionPart = {
      prev: curNode,
      next: undefined,
      value: rawExpressionPartToOperand(expression[i]),
    };
    curNode.next = newNode;
    curNode = newNode;
  }

  let lastOpenParen = null;
  let lastCollapsedGroup;
  curNode = headNode;
  while (curNode) {
    if (typeof curNode.value === 'object' && 'open' in curNode.value) {
      lastOpenParen = curNode;
    } else if (typeof curNode.value === 'object' && 'close' in curNode.value) {
      if (lastOpenParen === null) {
        throw new Error('Unmatched closing parenthesis');
      }
      const collapsedGroup = collapseGroup(lastOpenParen);
      collapsedGroup.prev = lastOpenParen.prev;
      collapsedGroup.next = curNode.next;
      lastCollapsedGroup = collapsedGroup;
      lastOpenParen = null;
    }

    curNode = curNode.next;
  }

  const inputs = expression.reduce((acc, part) => {
    if (part.input) {
      acc[part.input.name!] = part.input;
    }
    return acc;
  }, {} as EmuConditionInputSet);

  if (lastCollapsedGroup === undefined) {
    throw new Error('No valid expression found');
  }
  if (typeof lastCollapsedGroup.value !== 'object' || !('operation' in lastCollapsedGroup.value)) {
    throw new Error('Expression must have an operation');
  }

  return {
    inputs,
    logic: lastCollapsedGroup!.value
  }
}
