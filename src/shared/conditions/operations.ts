import { emuEvaluateOperand } from "@/shared/conditions/evaluate";
import { type EmuConditionOperation } from "@/shared/conditions/types";

export function emuAddOperation(): EmuConditionOperation {
  return (inputs, lhs, rhs) => {
    if (rhs === undefined) {
      throw new Error('Right-hand side operand is required for + operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, lhs);
    const rhsResult = emuEvaluateOperand(inputs, rhs);
    if (typeof lhsResult === 'number' && typeof rhsResult === 'number') {
      return lhsResult + rhsResult;
    }
    if (typeof lhsResult === 'string' && typeof rhsResult === 'string') {
      return lhsResult + rhsResult;
    }
    throw new Error('Invalid operands for +');
  };
}

export function emuMultiplyOperation(): EmuConditionOperation {
  return (inputs, lhs, rhs) => {
    if (rhs === undefined) {
      throw new Error('Right-hand side operand is required for * operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, lhs);
    const rhsResult = emuEvaluateOperand(inputs, rhs);
    if (typeof lhsResult === 'number' && typeof rhsResult === 'number') {
      return lhsResult * rhsResult;
    }
    throw new Error('Invalid operands for *');
  };
}

export function emuEqualsOperation(): EmuConditionOperation {
  return (inputs, lhs, rhs) => {
    if (rhs === undefined) {
      throw new Error('Right-hand side operand is required for == operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, lhs);
    const rhsResult = emuEvaluateOperand(inputs, rhs);
    return lhsResult === rhsResult;
  };
}

export function emuAndOperation(): EmuConditionOperation {
  return (inputs, lhs, rhs) => {
    if (rhs === undefined) {
      throw new Error('Right-hand side operand is required for && operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, lhs);
    const rhsResult = emuEvaluateOperand(inputs, rhs);
    if (typeof lhsResult === 'boolean' && typeof rhsResult === 'boolean') {
      return lhsResult && rhsResult;
    }
    throw new Error('Invalid operands for &&');
  };
}

export function emuOrOperation(): EmuConditionOperation {
  return (inputs, lhs, rhs) => {
    if (rhs === undefined) {
      throw new Error('Right-hand side operand is required for || operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, lhs);
    const rhsResult = emuEvaluateOperand(inputs, rhs);
    if (typeof lhsResult === 'boolean' && typeof rhsResult === 'boolean') {
      return lhsResult || rhsResult;
    }
    throw new Error('Invalid operands for ||');
  };
}

export function emuGreaterThanOperation(): EmuConditionOperation {
  return (inputs, lhs, rhs) => {
    if (rhs === undefined) {
      throw new Error('Right-hand side operand is required for > operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, lhs);
    const rhsResult = emuEvaluateOperand(inputs, rhs);
    if (typeof lhsResult === 'number' && typeof rhsResult === 'number') {
      return lhsResult > rhsResult;
    }
    throw new Error('Invalid operands for >');
  };
}

export function emuLessThanOperation(): EmuConditionOperation {
  return (inputs, lhs, rhs) => {
    if (rhs === undefined) {
      throw new Error('Right-hand side operand is required for < operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, lhs);
    const rhsResult = emuEvaluateOperand(inputs, rhs);
    if (typeof lhsResult === 'number' && typeof rhsResult === 'number') {
      return lhsResult < rhsResult;
    }
    throw new Error('Invalid operands for <');
  };
}

export function emuNotOperation(): EmuConditionOperation {
  return (inputs, lhs, _) => {
    const lhsResult = emuEvaluateOperand(inputs, lhs);
    if (typeof lhsResult === 'boolean') {
      return !lhsResult;
    }
    throw new Error('Invalid operands for !');
  };
}

export function emuSquareOperation(): EmuConditionOperation {
  return (inputs, lhs, _) => {
    const lhsResult = emuEvaluateOperand(inputs, lhs);
    if (typeof lhsResult === 'number') {
      return lhsResult * lhsResult;
    }
    throw new Error('Invalid operands for !');
  };
}
