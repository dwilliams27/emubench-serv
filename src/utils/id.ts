import { customAlphabet } from "nanoid";

export const TEST_ID = 'tst';
export const TEST_AUTH_KEY_ID = 'tauth';

export const ID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const ID_LENGTH = 16;
export function genId(prefix: string, length: number = ID_LENGTH): string {
  return `${prefix}_${customAlphabet(ID_ALPHABET, length)()}`;
}
