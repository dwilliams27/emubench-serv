import { emuEvaluateCondition } from '@/shared/conditions/evaluate';
import { emuAddOperationFactory, emuEqualsOperationFactory, emuLessThanOperationFactory, emuSquareOperationFactory } from '@/shared/conditions/operations';
import type { EmuCondition } from '@/shared/conditions/types';
import { describe, it, expect } from 'vitest';

describe("EmuConditionInput", () => {
  it("1+1", () => {
    const condition: EmuCondition = {
      inputs: {
        a: {
          type: "int",
          rawValue: "00000001",
        },
        b: {
          type: "int",
          rawValue: "00000001",
        }
      },
      logic: {
        lhs: { inputName: "a" },
        rhs: { inputName: "b" },
        operation: emuAddOperationFactory(),
      }
    }
    expect(emuEvaluateCondition(condition)).toBe(2);
  });

  it("1+1 < 2+2", () => {
    const condition: EmuCondition = {
      inputs: {
        one: {
          type: "int",
          rawValue: "00000001",
        },
        two: {
          type: "int",
          rawValue: "00000002",
        }
      },
      logic: {
        lhs: {
          lhs: { inputName: "one" },
          rhs: { inputName: "one" },
          operation: emuAddOperationFactory(),
        },
        rhs: {
          lhs: { inputName: "two" },
          rhs: { inputName: "two" },
          operation: emuAddOperationFactory(),
        },
        operation: emuLessThanOperationFactory(),
      }
    }
    expect(emuEvaluateCondition(condition)).toBe(true);
  });

  it("5^2 < 6^2", () => {
    const condition: EmuCondition = {
      inputs: {
        five: {
          type: "int",
          rawValue: "00000005",
        },
        six: {
          type: "int",
          rawValue: "00000006",
        }
      },
      logic: {
        lhs: {
          lhs: { inputName: "five" },
          operation: emuSquareOperationFactory(),
        },
        rhs: {
          lhs: { inputName: "six" },
          operation: emuSquareOperationFactory(),
        },
        operation: emuLessThanOperationFactory(),
      }
    }
    expect(emuEvaluateCondition(condition)).toBe(true);
  });

  it("Uint(FFFFFFFF) === 4294967295", () => {
    const condition: EmuCondition = {
      inputs: {
        maxUint: {
          type: "uint",
          rawValue: "FFFFFFFF",
        },
      },
      logic: {
        lhs: { inputName: "maxUint" },
        rhs: 4294967295,
        operation: emuEqualsOperationFactory(),
      }
    }
    expect(emuEvaluateCondition(condition)).toBe(true);
  });

  it("Chars(475A4C453031) === GZLE01", () => {
    const condition: EmuCondition = {
      inputs: {
        GAME_ID: {
          type: "chars",
          rawValue: "475A4C453031",
        },
      },
      logic: {
        lhs: { inputName: "GAME_ID" },
        rhs: "GZLE01",
        operation: emuEqualsOperationFactory(),
      }
    }
    expect(emuEvaluateCondition(condition)).toBe(true);
  });

  it("Float(BF800000) === -1", () => {
    const condition: EmuCondition = {
      inputs: {
        FLOAT: {
          type: "float",
          rawValue: "BF800000",
        },
      },
      logic: {
        lhs: { inputName: "FLOAT" },
        rhs: -1,
        operation: emuEqualsOperationFactory(),
      }
    }
    expect(emuEvaluateCondition(condition)).toBe(true);
  });

  it("Float(BF800000) === Int(FFFFFFFF)", () => {
    const condition: EmuCondition = {
      inputs: {
        FLOAT: {
          type: "float",
          rawValue: "BF800000",
        },
        INT: {
          type: "int",
          rawValue: "FFFFFFFF",
        }
      },
      logic: {
        lhs: { inputName: "FLOAT" },
        rhs: { inputName: "INT" },
        operation: emuEqualsOperationFactory(),
      }
    }
    expect(emuEvaluateCondition(condition)).toBe(true);
  });
});
