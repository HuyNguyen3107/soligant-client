import { http } from "../lib/http";
import type { FeedbackFormState, FeedbackRow } from "../pages/Dashboard/types";

interface UploadImageResponse {
  url?: string;
}

export interface PublicFeedbackPayload {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

export const getFeedbacks = async () => {
  const { data } = await http.get<FeedbackRow[]>("/feedbacks");
  return data;
};

export const createFeedback = async (payload: Partial<FeedbackFormState>) => {
  const { data } = await http.post<FeedbackRow>("/feedbacks", payload);
  return data;
};

export const updateFeedback = async (
  id: string,
  payload: Partial<FeedbackFormState>,
) => {
  const { data } = await http.patch<FeedbackRow>(`/feedbacks/${id}`, payload);
  return data;
};

export const deleteFeedback = async (id: string) => {
  await http.delete(`/feedbacks/${id}`);
};

export const uploadFeedbackImage = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await http.post<UploadImageResponse>(
    "/upload/image",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  const url = typeof data?.url === "string" ? data.url.trim() : "";

  if (!url) {
    throw new Error("Tải ảnh lên thất bại.");
  }

  return url;
};

export const deleteUploadedImageByUrl = async (url: string) => {
  const match = url.match(/\/uploads\/([^/?#]+)$/);
  if (!match) return;

  try {
    await http.delete(`/upload/image/${match[1]}`);
  } catch {
    // Ignore cleanup failures for temporary image uploads.
  }
};

export const createPublicFeedback = async (
  payload: PublicFeedbackPayload,
  imageFile?: File | null,
) => {
  const formData = new FormData();
  formData.append("name", payload.name);
  formData.append("email", payload.email);
  formData.append("phone", payload.phone ?? "");
  formData.append("subject", payload.subject ?? "feedback");
  formData.append("message", payload.message);

  if (imageFile) {
    formData.append("image", imageFile);
  }

  const { data } = await http.post<FeedbackRow>("/public/feedbacks", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
};

export const getPublicFeedbacks = async () => {
  const { data } = await http.get<FeedbackRow[]>("/public/feedbacks");
  return data;
};
