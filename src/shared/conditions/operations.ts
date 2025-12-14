import { emuEvaluateOperand } from "@/shared/conditions/evaluate";
import { EmuConditionOperationFunction, type EmuConditionOperation } from "@/shared/conditions/types";
import { EMU_OPERATION_ID, genId } from "@/shared/utils/id";

export const EmuOperationNameToFunctionMap: Record<string, EmuConditionOperationFunction> = {
  '+': (inputs, operands) => {
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
  },
  '*': (inputs, operands) => {
    if (operands.lhs === undefined || operands.rhs === undefined) {
      throw new Error('2 operands required for * operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, operands.lhs);
    const rhsResult = emuEvaluateOperand(inputs, operands.rhs);
    if (typeof lhsResult === 'number' && typeof rhsResult === 'number') {
      return lhsResult * rhsResult;
    }
    throw new Error('Invalid operands for *');
  },
  '==': (inputs, operands) => {
    if (operands.lhs === undefined || operands.rhs === undefined) {
      throw new Error('2 operands required for == operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, operands.lhs);
    const rhsResult = emuEvaluateOperand(inputs, operands.rhs);
    return lhsResult === rhsResult;
  },
  '!=': (inputs, operands) => {
    if (operands.lhs === undefined || operands.rhs === undefined) {
      throw new Error('2 operands required for == operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, operands.lhs);
    const rhsResult = emuEvaluateOperand(inputs, operands.rhs);
    return lhsResult !== rhsResult;
  },
  '&&': (inputs, operands) => {
    if (operands.lhs === undefined || operands.rhs === undefined) {
      throw new Error('2 operands required for && operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, operands.lhs);
    const rhsResult = emuEvaluateOperand(inputs, operands.rhs);
    if (typeof lhsResult === 'boolean' && typeof rhsResult === 'boolean') {
      return lhsResult && rhsResult;
    }
    throw new Error('Invalid operands for &&');
  },
  '||': (inputs, operands) => {
    if (operands.lhs === undefined || operands.rhs === undefined) {
      throw new Error('2 operands required for || operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, operands.lhs);
    const rhsResult = emuEvaluateOperand(inputs, operands.rhs);
    if (typeof lhsResult === 'boolean' && typeof rhsResult === 'boolean') {
      return lhsResult || rhsResult;
    }
    throw new Error('Invalid operands for ||');
  },
  '>': (inputs, operands) => {
    if (operands.lhs === undefined || operands.rhs === undefined) {
      throw new Error('2 operands required for > operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, operands.lhs);
    const rhsResult = emuEvaluateOperand(inputs, operands.rhs);
    if (typeof lhsResult === 'number' && typeof rhsResult === 'number') {
      return lhsResult > rhsResult;
    }
    throw new Error('Invalid operands for >');
  },
  '<': (inputs, operands) => {
    if (operands.lhs === undefined || operands.rhs === undefined) {
      throw new Error('2 operands required for < operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, operands.lhs);
    const rhsResult = emuEvaluateOperand(inputs, operands.rhs);
    if (typeof lhsResult === 'number' && typeof rhsResult === 'number') {
      return lhsResult < rhsResult;
    }
    throw new Error('Invalid operands for <');
  },
  '!': (inputs, operands) => {
    if (operands.rhs === undefined) {
      throw new Error('Right operand required for ! operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, operands.rhs);
    if (typeof lhsResult === 'boolean') {
      return !lhsResult;
    }
    throw new Error('Invalid operands for !');
  },
  '^2': (inputs, operands) => {
    if (operands.lhs === undefined) {
      throw new Error('Left operand required for ^2 operation');
    }
    const lhsResult = emuEvaluateOperand(inputs, operands.lhs);
    if (typeof lhsResult === 'number') {
      return lhsResult * lhsResult;
    }
    throw new Error('Invalid operands for ^2');
  },
  'identity': (inputs, operands) => {
    if (operands.lhs === undefined) {
      throw new Error('Left operand required for left identity operation');
    }
    return emuEvaluateOperand(inputs, operands.lhs);
  }
};

export const emuAddOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '+',
  hasLeftOperand: true,
  hasRightOperand: true,
});

export const emuMultiplyOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '*',
  hasLeftOperand: true,
  hasRightOperand: true,
});

export const emuEqualsOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '==',
  hasLeftOperand: true,
  hasRightOperand: true,
});

export const emuNotEqualsOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '!=',
  hasLeftOperand: true,
  hasRightOperand: true,
});

export const emuAndOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '&&',
  hasLeftOperand: true,
  hasRightOperand: true,
});

export const emuOrOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '||',
  hasLeftOperand: true,
  hasRightOperand: true,
});

export const emuGreaterThanOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '>',
  hasLeftOperand: true,
  hasRightOperand: true,
});

export const emuLessThanOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '<',
  hasLeftOperand: true,
  hasRightOperand: true,
});

export const emuNotOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '!',
  hasLeftOperand: false,
  hasRightOperand: true,
});

export const emuSquareOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: '^2',
  hasLeftOperand: true,
  hasRightOperand: false,
});

export const emuLeftIdentityOperationFactory: () => EmuConditionOperation = () => ({
  id: genId(EMU_OPERATION_ID),
  name: 'identity',
  hasLeftOperand: true,
  hasRightOperand: false,
});
