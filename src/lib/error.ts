import { isAxiosError } from "axios";

interface ApiErrorPayload {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

const TECHNICAL_MESSAGE_PATTERNS = [
  /request entity too large/i,
  /payload too large/i,
  /request failed with status code\s*\d+/i,
  /^network error$/i,
  /failed to fetch/i,
  /cannot\s+(get|post|put|patch|delete)\s+/i,
  /internal server error/i,
  /unexpected token/i,
  /invalid json/i,
  /(econn|enotfound|etimedout|socket|cors)/i,
];

const isTechnicalMessage = (message: string) => {
  const normalized = message.trim();

  if (!normalized) {
    return false;
  }

  return TECHNICAL_MESSAGE_PATTERNS.some((pattern) => pattern.test(normalized));
};

const getStatusFallbackMessage = (
  status: number | undefined,
  fallback: string,
) => {
  switch (status) {
    case 400:
      return fallback;
    case 401:
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    case 403:
      return "Bạn không có quyền thực hiện thao tác này.";
    case 404:
      return "Không tìm thấy dữ liệu yêu cầu.";
    case 408:
      return "Kết nối bị gián đoạn. Vui lòng thử lại.";
    case 413:
      return "Dữ liệu gửi lên quá lớn. Vui lòng giảm dung lượng ảnh hoặc nội dung rồi thử lại.";
    case 422:
      return "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại thông tin.";
    case 429:
      return "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.";
    default:
      if (status && status >= 500) {
        return "Hệ thống đang bận. Vui lòng thử lại sau.";
      }

      return fallback;
  }
};

const getPayloadMessage = (message: ApiErrorPayload["message"]) => {
  if (Array.isArray(message) && message.length > 0) {
    return String(message[0] ?? "").trim();
  }

  if (typeof message === "string") {
    return message.trim();
  }

  return "";
};

export const getErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<ApiErrorPayload>(error)) {
    const status = error.response?.status;
    const payloadMessage = getPayloadMessage(error.response?.data?.message);

    if (payloadMessage) {
      if (isTechnicalMessage(payloadMessage)) {
        return getStatusFallbackMessage(status, fallback);
      }

      return payloadMessage;
    }

    const axiosMessage = String(error.message ?? "").trim();
    if (axiosMessage && !isTechnicalMessage(axiosMessage)) {
      return axiosMessage;
    }

    return getStatusFallbackMessage(status, fallback);
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    if (!message) {
      return fallback;
    }

    if (isTechnicalMessage(message)) {
      return fallback;
    }

    return message;
  }

  return fallback;
};
