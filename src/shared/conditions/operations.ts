import { emuEvaluateOperand } from "@/shared/conditions/evaluate";
import { type EmuConditionOperation } from "@/shared/conditions/types";
import { EMU_OPERATION_ID, genId } from "@/shared/utils/id";

export const emuAddOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '+',
  func: (inputs, lhs, rhs) => {
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
  }
});

export const emuMultiplyOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '*',
  func: (inputs, lhs, rhs) => {
    if (rhs === undefined) {
      throw new Error('Right-hand side operand is required for * operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, lhs);
    const rhsResult = emuEvaluateOperand(inputs, rhs);
    if (typeof lhsResult === 'number' && typeof rhsResult === 'number') {
      return lhsResult * rhsResult;
    }
    throw new Error('Invalid operands for *');
  }
});

export const emuEqualsOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '==',
  func: (inputs, lhs, rhs) => {
    if (rhs === undefined) {
      throw new Error('Right-hand side operand is required for == operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, lhs);
    const rhsResult = emuEvaluateOperand(inputs, rhs);
    return lhsResult === rhsResult;
  }
});

export const emuAndOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '&&',
  func: (inputs, lhs, rhs) => {
    if (rhs === undefined) {
      throw new Error('Right-hand side operand is required for && operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, lhs);
    const rhsResult = emuEvaluateOperand(inputs, rhs);
    if (typeof lhsResult === 'boolean' && typeof rhsResult === 'boolean') {
      return lhsResult && rhsResult;
    }
    throw new Error('Invalid operands for &&');
  }
});

export const emuOrOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '||',
  func: (inputs, lhs, rhs) => {
    if (rhs === undefined) {
      throw new Error('Right-hand side operand is required for || operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, lhs);
    const rhsResult = emuEvaluateOperand(inputs, rhs);
    if (typeof lhsResult === 'boolean' && typeof rhsResult === 'boolean') {
      return lhsResult || rhsResult;
    }
    throw new Error('Invalid operands for ||');
  }
});

export const emuGreaterThanOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '>',
  func: (inputs, lhs, rhs) => {
    if (rhs === undefined) {
      throw new Error('Right-hand side operand is required for > operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, lhs);
    const rhsResult = emuEvaluateOperand(inputs, rhs);
    if (typeof lhsResult === 'number' && typeof rhsResult === 'number') {
      return lhsResult > rhsResult;
    }
    throw new Error('Invalid operands for >');
  }
});

export const emuLessThanOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '<',
  func: (inputs, lhs, rhs) => {
    if (rhs === undefined) {
      throw new Error('Right-hand side operand is required for < operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, lhs);
    const rhsResult = emuEvaluateOperand(inputs, rhs);
    if (typeof lhsResult === 'number' && typeof rhsResult === 'number') {
      return lhsResult < rhsResult;
    }
    throw new Error('Invalid operands for <');
  }
});

export const emuNotOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '!',
  func: (inputs, lhs, _) => {
    const lhsResult = emuEvaluateOperand(inputs, lhs);
    if (typeof lhsResult === 'boolean') {
      return !lhsResult;
    }
    throw new Error('Invalid operands for !');
  }
});

export const emuSquareOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '^2',
  func: (inputs, lhs, _) => {
    const lhsResult = emuEvaluateOperand(inputs, lhs);
    if (typeof lhsResult === 'number') {
      return lhsResult * lhsResult;
    }
    throw new Error('Invalid operands for ^2');
  }
});
