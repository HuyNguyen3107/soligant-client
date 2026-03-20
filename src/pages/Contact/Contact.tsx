import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  FiClock,
  FiImage,
  FiMail,
  FiMapPin,
  FiPhone,
  FiUpload,
  FiX,
} from "react-icons/fi";
import {
  ImageWithFallback,
  PageBreadcrumb,
  RichTextEditor,
  SEO,
} from "../../components/common";
import { getErrorMessage } from "../../lib/error";
import { toRichTextPlainText } from "../../lib/rich-text";
import { createPublicFeedback } from "../../services/feedbacks.service";
import "./Contact.css";

const TOPIC_OPTIONS = [
  {
    value: "tu-van-qua-ca-nhan",
    label: "Tư vấn quà cá nhân",
  },
  {
    value: "qua-doanh-nghiep",
    label: "Quà doanh nghiệp",
  },
  {
    value: "dat-so-luong-lon",
    label: "Đặt số lượng lớn",
  },
  {
    value: "khac",
    label: "Khác",
  },
];

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  topic: TOPIC_OPTIONS[0].value,
  message: "",
};

const looksLikeEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const Contact = () => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(
    null,
  );
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (attachmentPreview) {
        URL.revokeObjectURL(attachmentPreview);
      }
    };
  }, [attachmentPreview]);

  const clearAttachmentPreview = () => {
    setAttachmentPreview((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return null;
    });
  };

  const resetAttachment = () => {
    clearAttachmentPreview();
    setAttachmentFile(null);
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }
  };

  const updateField = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setIsSubmitted(false);
    setSubmitError("");
  };

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    clearAttachmentPreview();
    setAttachmentFile(file);
    setAttachmentPreview(URL.createObjectURL(file));
    setIsSubmitted(false);
    setSubmitError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = form.name.trim().replace(/\s+/g, " ");
    const phone = form.phone.trim();
    const email = form.email.trim().toLowerCase();
    const message = toRichTextPlainText(form.message).trim();
    const topicLabel =
      TOPIC_OPTIONS.find((option) => option.value === form.topic)?.label ??
      form.topic;

    setSubmitError("");
    setIsSubmitted(false);

    if (!name) {
      setSubmitError("Vui lòng nhập họ và tên.");
      return;
    }

    if (!phone) {
      setSubmitError("Vui lòng nhập số điện thoại.");
      return;
    }

    if (!email || !looksLikeEmail(email)) {
      setSubmitError("Vui lòng nhập email hợp lệ.");
      return;
    }

    if (!message) {
      setSubmitError("Vui lòng nhập nội dung cần hỗ trợ.");
      return;
    }

    if (message.length > 3000) {
      setSubmitError("Nội dung tối đa 3000 ký tự.");
      return;
    }

    setIsSubmitting(true);

    try {
      await createPublicFeedback(
        {
          name,
          phone,
          email,
          subject: topicLabel,
          message,
        },
        attachmentFile,
      );

      setForm(EMPTY_FORM);
      resetAttachment();
      setIsSubmitted(true);
    } catch (error) {
      setSubmitError(
        getErrorMessage(
          error,
          "Không thể gửi thông tin lúc này. Vui lòng thử lại.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEO
        title="Liên hệ"
        description="Liên hệ Soligant để được tư vấn chọn quà theo nhu cầu cá nhân hoặc doanh nghiệp."
        keywords="liên hệ soligant, tư vấn quà tặng, đặt quà theo yêu cầu"
      />

      <section className="contact-page__hero">
        <div className="container contact-page__hero-content">
          <PageBreadcrumb
            tone="dark"
            items={[{ label: "Trang chủ", to: "/" }, { label: "Liên hệ" }]}
          />
          <p className="contact-page__eyebrow">Talk To Soligant</p>
          <h1>
            Cần đội ngũ tư vấn đồng hành? Chúng tôi luôn sẵn sàng nghe bạn.
          </h1>
          <p>
            Gửi thông tin cho Soligant để nhận gợi ý bộ quà phù hợp với dịp
            tặng, người nhận và ngân sách trong thời gian nhanh nhất.
          </p>
        </div>
      </section>

      <section className="contact-page__body">
        <div className="container contact-page__grid">
          <aside className="contact-page__info">
            <h2>Thông tin liên hệ</h2>

            <article className="contact-page__info-item">
              <span className="contact-page__info-icon">
                <FiMapPin size={18} />
              </span>
              <div>
                <h3>Địa chỉ</h3>
                <p>123 Đường ABC, Quận 1, TP. Hồ Chí Minh</p>
              </div>
            </article>

            <article className="contact-page__info-item">
              <span className="contact-page__info-icon">
                <FiPhone size={18} />
              </span>
              <div>
                <h3>Hotline</h3>
                <p>
                  <a href="tel:1900123456">1900 1234 56</a>
                </p>
              </div>
            </article>

            <article className="contact-page__info-item">
              <span className="contact-page__info-icon">
                <FiMail size={18} />
              </span>
              <div>
                <h3>Email</h3>
                <p>
                  <a href="mailto:info@soligant.vn">info@soligant.vn</a>
                </p>
              </div>
            </article>

            <article className="contact-page__info-item">
              <span className="contact-page__info-icon">
                <FiClock size={18} />
              </span>
              <div>
                <h3>Giờ hỗ trợ</h3>
                <p>08:00 - 22:00 (Thứ 2 đến Chủ nhật)</p>
              </div>
            </article>
          </aside>

          <form className="contact-page__form" onSubmit={handleSubmit}>
            <h2>Gửi yêu cầu tư vấn</h2>

            <div className="contact-page__field-grid">
              <label className="contact-page__field">
                <span>Họ và tên *</span>
                <input
                  type="text"
                  name="name"
                  placeholder="Nguyễn Văn A"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  required
                />
              </label>
              <label className="contact-page__field">
                <span>Số điện thoại *</span>
                <input
                  type="tel"
                  name="phone"
                  placeholder="0901 234 567"
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  required
                />
              </label>
            </div>

            <div className="contact-page__field-grid">
              <label className="contact-page__field">
                <span>Email *</span>
                <input
                  type="email"
                  name="email"
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  required
                />
              </label>
              <label className="contact-page__field">
                <span>Nhu cầu</span>
                <select
                  name="topic"
                  value={form.topic}
                  onChange={(event) => updateField("topic", event.target.value)}
                >
                  {TOPIC_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="contact-page__field">
              <span>Nội dung *</span>
              <RichTextEditor
                value={form.message}
                onChange={(value) => updateField("message", value)}
                placeholder="Mô tả nhanh dịp tặng quà, đối tượng nhận quà và ngân sách dự kiến..."
                minHeight={150}
              />
            </label>

            <label className="contact-page__field">
              <span>Ảnh đính kèm (không bắt buộc)</span>

              <input
                ref={attachmentInputRef}
                type="file"
                accept="image/*"
                className="contact-page__file-input"
                onChange={handleAttachmentChange}
              />

              <div className="contact-page__file-actions">
                <button
                  type="button"
                  className="contact-page__file-btn"
                  onClick={() => attachmentInputRef.current?.click()}
                >
                  <FiUpload size={15} />
                  {attachmentFile ? "Đổi ảnh" : "Tải ảnh lên"}
                </button>
                {attachmentFile && (
                  <button
                    type="button"
                    className="contact-page__file-btn contact-page__file-btn--danger"
                    onClick={resetAttachment}
                  >
                    <FiX size={15} />
                    Bỏ ảnh
                  </button>
                )}
              </div>

              {attachmentPreview ? (
                <div className="contact-page__file-preview">
                  <ImageWithFallback
                    src={attachmentPreview}
                    alt="Ảnh đính kèm feedback"
                    width={120}
                    height={120}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
              ) : (
                <div className="contact-page__file-placeholder">
                  <FiImage size={16} />
                  <span>Chưa chọn ảnh</span>
                </div>
              )}

              <p className="contact-page__file-hint">
                Ảnh tối đa 5MB (JPG, PNG, GIF, WEBP, SVG).
              </p>
            </label>

            <button
              type="submit"
              className="contact-page__submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang gửi..." : "Gửi thông tin"}
            </button>

            {submitError && (
              <p className="contact-page__error">{submitError}</p>
            )}

            {isSubmitted && (
              <p className="contact-page__success">
                Cảm ơn bạn! Soligant đã nhận feedback và sẽ liên hệ sớm nhất.
              </p>
            )}
          </form>
        </div>
      </section>
    </>
  );
};

export default Contact;
