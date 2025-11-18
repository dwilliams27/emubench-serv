import { EmuCondition, EmuConditionOperand, EmuConditionPart } from "./types";

/**
 * Convert an EmuCondition to a human-readable preview string
 * Example: "LINK_Y < 100" or "health > 50 AND hasKey == true"
 */
export function conditionToPreview(condition: EmuCondition): string {
  if (!condition || !condition.logic) {
    return "No condition defined";
  }

  return partToPreview(condition.logic);
}

function partToPreview(part: EmuConditionPart): string {
  const lhs = part.lhs ? operandToPreview(part.lhs) : "";
  const rhs = part.rhs ? operandToPreview(part.rhs) : "";
  const op = part.operation?.name || "";

  // Handle unary operations (like NOT)
  if (!part.operation.hasLeftOperand && part.operation.hasRightOperand) {
    return `${op} ${rhs}`;
  }

  // Handle binary operations
  if (part.operation.hasLeftOperand && part.operation.hasRightOperand) {
    return `${lhs} ${op} ${rhs}`;
  }

  // Fallback
  return op || "";
}

function operandToPreview(operand: EmuConditionOperand): string {
  // Handle parentheses
  if (operand.parentheses) {
    return operand.parentheses.open ? "(" : ")";
  }

  // Handle primitive values
  if (operand.primitive !== undefined) {
    if (typeof operand.primitive === "string") {
      return `"${operand.primitive}"`;
    }
    return String(operand.primitive);
  }

  // Handle inputs (memory watches)
  if (operand.input) {
    return operand.input.name;
  }

  // Handle nested condition parts
  if (operand.conditionPart) {
    return `(${partToPreview(operand.conditionPart)})`;
  }

  return "";
}
