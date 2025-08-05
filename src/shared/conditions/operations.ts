import { emuEvaluateOperand } from "@/shared/conditions/evaluate";
import { type EmuConditionOperation } from "@/shared/conditions/types";
import { EMU_OPERATION_ID, genId } from "@/shared/utils/id";

export const emuAddOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '+',
  hasLeftOperand: true,
  hasRightOperand: true,
  func: (inputs, operands) => {
    if (operands.lhs === undefined || operands.rhs === undefined) {
      throw new Error('2 operands required for + operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, operands.lhs);
    const rhsResult = emuEvaluateOperand(inputs, operands.rhs);
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
  hasLeftOperand: true,
  hasRightOperand: true,
  func: (inputs, operands) => {
    if (operands.lhs === undefined || operands.rhs === undefined) {
      throw new Error('2 operands required for * operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, operands.lhs);
    const rhsResult = emuEvaluateOperand(inputs, operands.rhs);
    if (typeof lhsResult === 'number' && typeof rhsResult === 'number') {
      return lhsResult * rhsResult;
    }
    throw new Error('Invalid operands for *');
  }
});

export const emuEqualsOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '==',
  hasLeftOperand: true,
  hasRightOperand: true,
  func: (inputs, operands) => {
    if (operands.lhs === undefined || operands.rhs === undefined) {
      throw new Error('2 operands required for == operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, operands.lhs);
    const rhsResult = emuEvaluateOperand(inputs, operands.rhs);
    return lhsResult === rhsResult;
  }
});

export const emuAndOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '&&',
  hasLeftOperand: true,
  hasRightOperand: true,
  func: (inputs, operands) => {
    if (operands.lhs === undefined || operands.rhs === undefined) {
      throw new Error('2 operands required for && operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, operands.lhs);
    const rhsResult = emuEvaluateOperand(inputs, operands.rhs);
    if (typeof lhsResult === 'boolean' && typeof rhsResult === 'boolean') {
      return lhsResult && rhsResult;
    }
    throw new Error('Invalid operands for &&');
  }
});

export const emuOrOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '||',
  hasLeftOperand: true,
  hasRightOperand: true,
  func: (inputs, operands) => {
    if (operands.lhs === undefined || operands.rhs === undefined) {
      throw new Error('2 operands required for || operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, operands.lhs);
    const rhsResult = emuEvaluateOperand(inputs, operands.rhs);
    if (typeof lhsResult === 'boolean' && typeof rhsResult === 'boolean') {
      return lhsResult || rhsResult;
    }
    throw new Error('Invalid operands for ||');
  }
});

export const emuGreaterThanOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '>',
  hasLeftOperand: true,
  hasRightOperand: true,
  func: (inputs, operands) => {
    if (operands.lhs === undefined || operands.rhs === undefined) {
      throw new Error('2 operands required for > operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, operands.lhs);
    const rhsResult = emuEvaluateOperand(inputs, operands.rhs);
    if (typeof lhsResult === 'number' && typeof rhsResult === 'number') {
      return lhsResult > rhsResult;
    }
    throw new Error('Invalid operands for >');
  }
});

export const emuLessThanOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '<',
  hasLeftOperand: true,
  hasRightOperand: true,
  func: (inputs, operands) => {
    if (operands.lhs === undefined || operands.rhs === undefined) {
      throw new Error('2 operands required for < operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, operands.lhs);
    const rhsResult = emuEvaluateOperand(inputs, operands.rhs);
    if (typeof lhsResult === 'number' && typeof rhsResult === 'number') {
      return lhsResult < rhsResult;
    }
    throw new Error('Invalid operands for <');
  }
});

export const emuNotOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '!',
  hasLeftOperand: false,
  hasRightOperand: true,
  func: (inputs, operands) => {
    if (operands.rhs === undefined) {
      throw new Error('Right operand required for ! operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, operands.rhs);
    if (typeof lhsResult === 'boolean') {
      return !lhsResult;
    }
    throw new Error('Invalid operands for !');
  }
});

export const emuSquareOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '^2',
  hasLeftOperand: true,
  hasRightOperand: false,
  func: (inputs, operands) => {
    if (operands.lhs === undefined) {
      throw new Error('Left operand required for ^2 operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, operands.lhs);
    if (typeof lhsResult === 'number') {
      return lhsResult * lhsResult;
    }
    throw new Error('Invalid operands for ^2');
  }
});
