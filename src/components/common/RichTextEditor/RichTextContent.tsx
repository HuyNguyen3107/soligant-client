import { toRichTextHtml } from "../../../lib/rich-text";
import "./RichTextEditor.css";

interface RichTextContentProps {
  value?: string | null;
  className?: string;
}

const RichTextContent = ({ value, className = "" }: RichTextContentProps) => {
  const html = toRichTextHtml(value);

  if (!html) return null;

  return (
    <div
      className={`rt-content ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default RichTextContent;
