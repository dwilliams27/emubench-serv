import { emuEvaluateCondition } from '@/shared/conditions/evaluate';
import { emuAddOperation, emuEqualsOperation, emuLessThanOperation, emuSquareOperation } from '@/shared/conditions/operations';
import type { EmuCondition } from '@/shared/conditions/types';
import { describe, it, expect } from 'vitest';

describe("EmuConditionInput", () => {
  it("1+1", () => {
    const condition: EmuCondition = {
      inputs: {
        a: {
          type: "int",
          pointerDepth: 0,
          rawValue: "00000001",
        },
        b: {
          type: "int",
          pointerDepth: 0,
          rawValue: "00000001",
        }
      },
      logic: {
        lhs: { inputName: "a" },
        rhs: { inputName: "b" },
        operation: emuAddOperation(),
      }
    }
    expect(emuEvaluateCondition(condition)).toBe(2);
  });

  it("1+1 < 2+2", () => {
    const condition: EmuCondition = {
      inputs: {
        one: {
          type: "int",
          pointerDepth: 0,
          rawValue: "00000001",
        },
        two: {
          type: "int",
          pointerDepth: 0,
          rawValue: "00000002",
        }
      },
      logic: {
        lhs: {
          lhs: { inputName: "one" },
          rhs: { inputName: "one" },
          operation: emuAddOperation(),
        },
        rhs: {
          lhs: { inputName: "two" },
          rhs: { inputName: "two" },
          operation: emuAddOperation(),
        },
        operation: emuLessThanOperation(),
      }
    }
    expect(emuEvaluateCondition(condition)).toBe(true);
  });

  it("5^2 < 6^2", () => {
    const condition: EmuCondition = {
      inputs: {
        five: {
          type: "int",
          pointerDepth: 0,
          rawValue: "00000005",
        },
        six: {
          type: "int",
          pointerDepth: 0,
          rawValue: "00000006",
        }
      },
      logic: {
        lhs: {
          lhs: { inputName: "five" },
          operation: emuSquareOperation(),
        },
        rhs: {
          lhs: { inputName: "six" },
          operation: emuSquareOperation(),
        },
        operation: emuLessThanOperation(),
      }
    }
    expect(emuEvaluateCondition(condition)).toBe(true);
  });

  it("Uint(FFFFFFFF) === 4294967295", () => {
    const condition: EmuCondition = {
      inputs: {
        maxUint: {
          type: "uint",
          pointerDepth: 0,
          rawValue: "FFFFFFFF",
        },
      },
      logic: {
        lhs: { inputName: "maxUint" },
        rhs: 4294967295,
        operation: emuEqualsOperation(),
      }
    }
    expect(emuEvaluateCondition(condition)).toBe(true);
  });

  it("Chars(475A4C453031) === GZLE01", () => {
    const condition: EmuCondition = {
      inputs: {
        GAME_ID: {
          type: "chars",
          pointerDepth: 0,
          rawValue: "475A4C453031",
        },
      },
      logic: {
        lhs: { inputName: "GAME_ID" },
        rhs: "GZLE01",
        operation: emuEqualsOperation(),
      }
    }
    expect(emuEvaluateCondition(condition)).toBe(true);
  });

  it("Float(BF800000) === -1", () => {
    const condition: EmuCondition = {
      inputs: {
        FLOAT: {
          type: "float",
          pointerDepth: 0,
          rawValue: "BF800000",
        },
      },
      logic: {
        lhs: { inputName: "FLOAT" },
        rhs: -1,
        operation: emuEqualsOperation(),
      }
    }
    expect(emuEvaluateCondition(condition)).toBe(true);
  });

  it("Float(BF800000) === Int(FFFFFFFF)", () => {
    const condition: EmuCondition = {
      inputs: {
        FLOAT: {
          type: "float",
          pointerDepth: 0,
          rawValue: "BF800000",
        },
        INT: {
          type: "int",
          pointerDepth: 0,
          rawValue: "FFFFFFFF",
        }
      },
      logic: {
        lhs: { inputName: "FLOAT" },
        rhs: { inputName: "INT" },
        operation: emuEqualsOperation(),
      }
    }
    expect(emuEvaluateCondition(condition)).toBe(true);
  });
});
