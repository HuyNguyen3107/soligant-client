import { isAxiosError } from "axios";

interface ApiErrorPayload {
  message?: string | string[];
}

export const getErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<ApiErrorPayload>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message) && message.length > 0) {
      return message[0] ?? fallback;
    }
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};
