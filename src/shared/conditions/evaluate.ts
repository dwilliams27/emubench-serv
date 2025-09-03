import { hexToAscii, hexToFloat, hexToInt, hexToUint } from "@/shared/conditions/helpers";
import { emuLeftIdentityOperationFactory } from "@/shared/conditions/operations";
import type { EmuCondition, EmuConditionPrimitiveResult, EmuConditionInputSet, EmuConditionOperand, EmuConditionInput, EmuLinkedExpressionPart } from "@/shared/conditions/types";

export function emuFlattenCondition(condition: EmuCondition): EmuConditionOperand[] {
  emuParseAndPopulateCondition(condition);

  return emuFlattenConditionHelper({ conditionPart: condition.logic }, []);
}

function emuFlattenConditionHelper(currentNode: EmuConditionOperand, currentResult: EmuConditionOperand[]): EmuConditionOperand[] {
  if (currentNode.conditionPart) {
    if (currentNode.conditionPart.lhs) {
      currentResult = emuFlattenConditionHelper(currentNode.conditionPart.lhs, currentResult);
    }
    currentResult.push({ conditionPart: { operation: currentNode.conditionPart.operation } });
    if (currentNode.conditionPart.rhs) {
      currentResult = emuFlattenConditionHelper(currentNode.conditionPart.rhs, currentResult);
    }
  } else {
    currentResult.push(currentNode);
  }

  return currentResult;
}

export function emuEvaluateCondition(condition?: EmuCondition): EmuConditionPrimitiveResult {
  if (!condition?.logic) {
    throw new Error('Invalid condition: Logic must be defined');
  }

  // TODO: Handle pointers
  emuParseAndPopulateCondition(condition);

  const result = emuEvaluateOperand(
    condition.inputs,
    { conditionPart: condition.logic }
  );

  return result;
}

export function emuParseAndPopulateCondition(condition: EmuCondition) {
  for (const inputName in condition.inputs) {
    const input = condition.inputs[inputName];
    input.parsedValue = emuParseAndPopulateConditionInput(input);
  }
}

export function emuEvaluateOperand(inputs: EmuConditionInputSet, operand: EmuConditionOperand): EmuConditionPrimitiveResult {
  if (operand.conditionPart) {
    const lhsResult = operand.conditionPart.lhs ? { primitive: emuEvaluateOperand(inputs, operand.conditionPart.lhs) } : undefined;
    const rhsResult = operand.conditionPart.rhs ? { primitive: emuEvaluateOperand(inputs, operand.conditionPart.rhs) } : undefined;
    return operand.conditionPart.operation.func(inputs, { lhs: lhsResult, rhs: rhsResult });
  } else if (operand.primitive) {
    return operand.primitive;
  } else if (operand.input) {
    // If lookup value
    const parsedValue = inputs[operand.input.name]?.parsedValue;
    if (parsedValue === undefined) {
      throw new Error(`Input ${operand.input.name} not found in inputs`);
    }
    return parsedValue;
  }
  throw new Error(`Invalid operand type ${JSON.stringify(operand)}`);
}

export function emuParseAndPopulateConditionInput(input: EmuConditionInput): EmuConditionPrimitiveResult {
  if (input.parsedValue !== undefined) {
    return input.parsedValue;
  }
  if (!input.rawValue) {
    throw new Error(`Input ${input.name} has no raw value`);
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

// ( 5 + 10 > 20 ) => ((5)+(10))>(20)
function collapseGroup(head: EmuLinkedExpressionPart): { result?: EmuLinkedExpressionPart, error?: string } {
  if (!head.next) {
    return { result: head };
  }

  let curNode: EmuLinkedExpressionPart | undefined = head;
  let collapsedGroup;
  while (curNode && (typeof curNode.value !== 'object' || (typeof curNode.value === 'object' && !('open' in curNode.value && !curNode.value.open)))) {
    if (curNode.value.conditionPart?.operation && !isFilledOperation(curNode)) {
      if (curNode.value.conditionPart.operation.hasLeftOperand && !curNode.value.conditionPart.lhs) {
        if (!curNode.prev || curNode.prev.value.parentheses) {
          return { error: 'Left operand required for operation' };
        }
        curNode.value.conditionPart.lhs = curNode.prev.value;
      }
      if (curNode.value.conditionPart.operation.hasRightOperand && !curNode.value.conditionPart.rhs) {
        if (!curNode.next || curNode.next.value.parentheses) {
          return { error: 'Right operand required for operation' };
        }
        curNode.value.conditionPart.rhs = curNode.next.value;
      }
      collapsedGroup = curNode;
    }
    curNode = curNode.next;
  }
  if (!collapsedGroup) {
    return { error: 'No operation found in group' };
  }
  return { result: collapsedGroup };
}

export function validateEmuExpression(expression: EmuConditionOperand[]): { error?: string } {
  if (expression.length === 0) {
    return { error: 'Expression cannot be empty' };
  }
  if (expression.length === 1 && (!expression[0].primitive || (expression[0].primitive && typeof expression[0].primitive !== 'boolean'))) {
    return { error: 'Expression must have at least one valid part' };
  }
  let openParenCount = 0;
  for (const part of expression) {
    if (part.parentheses) {
      if (part.parentheses.open) {
        openParenCount++;
      } else {
        openParenCount--;
        if (openParenCount < 0) {
          return { error: 'Too many closing parenthesis' };
        }
      }
    }
  }
  if (openParenCount !== 0) {
    return { error: 'Unmatched opening parenthesis' };
  }
  for (let i = 0; i < expression.length; i++) {
    const part = expression[i];
    if (part.conditionPart?.operation) {
      if ((part.conditionPart.operation.hasLeftOperand && i === 0) || // needs left but no left
        (part.conditionPart.operation.hasLeftOperand && !( // has left that is NOT....
          expression[i-1].primitive || // value
          expression[i-1].input || // input
          (expression[i-1].conditionPart?.operation && expression[i-1].conditionPart?.operation?.hasLeftOperand) || // operation that will eval on left
          (expression[i-1].parentheses && !expression[i-1].parentheses?.open) // paren group that will eval
        ))
      ) {
        return { error: `Operation ${part.conditionPart?.operation.name} requires a valid left operand` };
      }
      if ((part.conditionPart.operation.hasRightOperand && i === expression.length - 1) ||
        (part.conditionPart.operation.hasRightOperand && !(
          i < expression.length ||
          expression[i+1].primitive ||
          expression[i+1].input ||
          (expression[i+1].conditionPart?.operation && expression[i+1].conditionPart?.operation?.hasRightOperand) ||
          (expression[i+1].parentheses && expression[i+1].parentheses?.open)
        ))
      ) {
        return { error: `Operation ${part.conditionPart.operation.name} requires a valid right operand` };
      }
    }
  }
  
  return {};
}

// 1. Convert to linked list
// 2. Backtrack every closed paren to collapse group
export function convertEmuExpressionToCondition(expression: EmuConditionOperand[]): { result?: EmuCondition, error?: string } {
  console.log("Converting expression to condition:", expression);
  if (!expression[0].parentheses?.open || expression[expression.length - 1].parentheses?.open === undefined) {
    expression.unshift({ parentheses: { open: true } });
    expression.push({ parentheses: { open: false } });
  }

  const validationResult = validateEmuExpression(expression);
  if (validationResult.error) {
   console.log(`Invalid expression: ${validationResult.error}`);
   return { error: validationResult.error };
  }
  
  const headNode: EmuLinkedExpressionPart = {
    next: undefined,
    value: expression[0],
  };
  let curNode: EmuLinkedExpressionPart | undefined = headNode;
  for (let i = 1; i < expression.length; i++) {
    const newNode: EmuLinkedExpressionPart = {
      prev: curNode,
      next: undefined,
      value: expression[i],
    };
    curNode.next = newNode;
    curNode = newNode;
  }

  let lastOpenParenStack: EmuLinkedExpressionPart[] = [];
  let lastCollapsedGroup;
  curNode = headNode;
  while (curNode) {
    if (curNode.value.parentheses?.open) {
      lastOpenParenStack.push(curNode);
    } else if (curNode.value.parentheses?.open === false) {
      if (lastOpenParenStack.length === 0) {
        return { error: 'Parsing error on close parenthesis' };
      }
      const lastOpenParen = lastOpenParenStack.pop()!;
      const collapsedGroup = collapseGroup(lastOpenParen);
      if (collapsedGroup.error) {
        return { error: collapsedGroup.error };
      }
      if (!collapsedGroup.result) {
        return { error: 'Collapsed group is undefined' };
      }
      collapsedGroup.result.prev = lastOpenParen.prev;
      lastCollapsedGroup = collapsedGroup;
      if (lastOpenParen.prev) {
        lastOpenParen.prev.next = collapsedGroup.result;
      }
      collapsedGroup.result.next = curNode.next;
      if (curNode.next) {
        curNode.next.prev = collapsedGroup.result;
      }
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
    return {
      result: {
        inputs,
        logic: { operation: emuLeftIdentityOperationFactory(), lhs: { primitive: expression[0].primitive, input: expression[0].input }}
      }
    };
  }
  if (!lastCollapsedGroup.result?.value.conditionPart?.operation) {
    return { error: 'Expression must have an operation' };
  }

  return {
    result: {
      inputs,
      // TODO: undef check?
      logic: lastCollapsedGroup.result?.value.conditionPart!
    }
  };
}

function logLinkedList(head: EmuLinkedExpressionPart): void {
  let curNode: EmuLinkedExpressionPart | undefined = head;
  let vals = '';
  while (curNode) {
    vals += JSON.stringify(curNode.value) + ' ';
    curNode = curNode.next;
  }
  console.log("Linked list values:", vals);
}

function isFilledOperation(part: EmuLinkedExpressionPart): boolean {
  if (typeof part.value !== 'object' || !('operation' in part.value)) {
    return false;
  }
  if (part.value.conditionPart?.operation.hasLeftOperand && !part.value.conditionPart.lhs) {
    return false;
  }
  if (part.value.conditionPart?.operation.hasRightOperand && !part.value.conditionPart.rhs) {
    return false;
  }
  return true;
}
