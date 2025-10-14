import { EmuError } from "@/shared/types";

export function formatError(error: unknown) {
  if (!error) {
    return 'Unknown error occurred';
  }
  
  const errorObj = error as any;
  const parts: string[] = [];
  
  // Add error message if available
  if (errorObj.message && typeof errorObj.message === 'string') {
    parts.push(errorObj.message);
  }
  
  // Add response data if available
  if (errorObj.response?.data && typeof errorObj.response.data === 'string') {
    parts.push(errorObj.response.data);
  }
  
  // If no useful information found, convert error to string
  if (parts.length === 0) {
    if (typeof error === 'string') {
      parts.push(error);
    } else if (error instanceof Error) {
      parts.push(error.toString());
    } else {
      parts.push(JSON.stringify(error));
    }
  }
  
  return parts.join(' ').trim() || 'Unknown error occurred';
}

export function createEmuError(payload: unknown) {
  if (typeof payload === 'string') {
    return new EmuError(payload);
  }
  if (payload instanceof Error) {
    return new EmuError(payload.message);
  }
  return new Error('An unknown error occurred');
}
