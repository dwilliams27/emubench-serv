import { emuEvaluateCondition } from '@/shared/conditions/evaluate';
import { emuAddOperationFactory, emuEqualsOperationFactory, emuLessThanOperationFactory, emuSquareOperationFactory } from '@/shared/conditions/operations';
import type { EmuCondition, EmuConditionInput } from '@/shared/conditions/types';
import { describe, it, expect } from 'vitest';

describe("EmuConditionInput", () => {
  it("1+1", () => {
    const a: EmuConditionInput = {
      name: "a",
      type: "int",
      rawValue: "00000001",
    };
    const b: EmuConditionInput = {
      name: "b",
      type: "int",
      rawValue: "00000001",
    };
    const condition: EmuCondition = {
      inputs: {
        a,
        b
      },
      logic: {
        lhs: { input: a },
        rhs: { input: b },
        operation: emuAddOperationFactory(),
      }
    }
    expect(emuEvaluateCondition(condition)).toBe(2);
  });

  it("1+1 < 2+2", () => {
    const one: EmuConditionInput = {
      name: "one",
      type: "int",
      rawValue: "00000001",
    };
    const two: EmuConditionInput = {
      name: "two",
      type: "int",
      rawValue: "00000002",
    };
    const condition: EmuCondition = {
      inputs: {
        one,
        two
      },
      logic: {
        lhs: {
          conditionPart: {
            lhs: { input: one },
            rhs: { input: one },
            operation: emuAddOperationFactory(),
          }
        },
        rhs: {
          conditionPart: {
            lhs: { input: two },
            rhs: { input: two },
            operation: emuAddOperationFactory(),
          }
        },
        operation: emuLessThanOperationFactory(),
      }
    }
    expect(emuEvaluateCondition(condition)).toBe(true);
  });

  it("5^2 < 6^2", () => {
    const five: EmuConditionInput = {
      name: "five",
      type: "int",
      rawValue: "00000005",
    };
    const six: EmuConditionInput = {
      name: "six",
      type: "int",
      rawValue: "00000006",
    };
    const condition: EmuCondition = {
      inputs: {
        five,
        six
      },
      logic: {
        lhs: {
          conditionPart: {
            lhs: { input: five },
            operation: emuSquareOperationFactory(),
          }
        },
        rhs: {
          conditionPart: {
            lhs: { input: six },
            operation: emuSquareOperationFactory(),
          }
        },
        operation: emuLessThanOperationFactory(),
      }
    }
    expect(emuEvaluateCondition(condition)).toBe(true);
  });

  it("Uint(FFFFFFFF) === 4294967295", () => {
    const maxUint: EmuConditionInput = {
      name: "maxUint",
      type: "uint",
      rawValue: "FFFFFFFF",
    };
    const condition: EmuCondition = {
      inputs: {
        maxUint,
      },
      logic: {
        lhs: { input: maxUint },
        rhs: { primitive: 4294967295 },
        operation: emuEqualsOperationFactory(),
      }
    }
    expect(emuEvaluateCondition(condition)).toBe(true);
  });

  it("Chars(475A4C453031) === GZLE01", () => {
    const GAME_ID: EmuConditionInput = {
      name: "GAME_ID",
      type: "chars",
      rawValue: "475A4C453031",
    };
    const condition: EmuCondition = {
      inputs: {
        GAME_ID,
      },
      logic: {
        lhs: { input: GAME_ID },
        rhs: { primitive: "GZLE01" },
        operation: emuEqualsOperationFactory(),
      }
    }
    expect(emuEvaluateCondition(condition)).toBe(true);
  });

  it("Float(BF800000) === -1", () => {
    const FLOAT: EmuConditionInput = {
      name: "FLOAT",
      type: "float",
      rawValue: "BF800000",
    };
    const condition: EmuCondition = {
      inputs: {
        FLOAT,
      },
      logic: {
        lhs: { input: FLOAT },
        rhs: { primitive: -1 },
        operation: emuEqualsOperationFactory(),
      }
    }
    expect(emuEvaluateCondition(condition)).toBe(true);
  });

  it("Float(BF800000) === Int(FFFFFFFF)", () => {
    const FLOAT: EmuConditionInput = {
      name: "FLOAT",
      type: "float",
      rawValue: "BF800000",
    };
    const INT: EmuConditionInput = {
      name: "INT",
      type: "int",
      rawValue: "FFFFFFFF",
    };
    const condition: EmuCondition = {
      inputs: {
        FLOAT,
        INT
      },
      logic: {
        lhs: { input: FLOAT },
        rhs: { input: INT },
        operation: emuEqualsOperationFactory(),
      }
    }
    expect(emuEvaluateCondition(condition)).toBe(true);
  });
});
