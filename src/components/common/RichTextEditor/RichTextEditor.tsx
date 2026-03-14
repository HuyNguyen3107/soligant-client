import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiBold,
  FiItalic,
  FiLink,
  FiList,
  FiRotateCcw,
  FiUnderline,
} from "react-icons/fi";
import { sanitizeRichTextHtml, toRichTextHtml } from "../../../lib/rich-text";
import "./RichTextEditor.css";

interface RichTextEditorProps {
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const RichTextEditor = ({
  value,
  onChange,
  placeholder = "Nhập nội dung...",
  minHeight = 120,
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);

  const normalizedValue = useMemo(() => toRichTextHtml(value), [value]);

  useEffect(() => {
    if (!editorRef.current) return;

    if (editorRef.current.innerHTML !== normalizedValue) {
      editorRef.current.innerHTML = normalizedValue;
    }
  }, [normalizedValue]);

  const emitChange = () => {
    const html = sanitizeRichTextHtml(editorRef.current?.innerHTML ?? "");
    onChange(html);
  };

  const runCommand = (command: string, valueArg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, valueArg);
    emitChange();
  };

  const handleInsertLink = () => {
    const link = window.prompt("Nhập URL liên kết");
    if (!link) return;
    runCommand("createLink", link.trim());
  };

  return (
    <div className={`rte${focused ? " is-focused" : ""}`}>
      <div className="rte__toolbar">
        <button type="button" className="rte__tool-btn" onClick={() => runCommand("bold")} title="In đậm">
          <FiBold size={14} />
        </button>
        <button type="button" className="rte__tool-btn" onClick={() => runCommand("italic")} title="In nghiêng">
          <FiItalic size={14} />
        </button>
        <button type="button" className="rte__tool-btn" onClick={() => runCommand("underline")} title="Gạch chân">
          <FiUnderline size={14} />
        </button>
        <button type="button" className="rte__tool-btn" onClick={() => runCommand("insertUnorderedList")} title="Danh sách chấm">
          <FiList size={14} />
        </button>
        <button type="button" className="rte__tool-btn" onClick={() => runCommand("insertOrderedList")} title="Danh sách số">
          <span style={{ fontSize: 11 }}>1.</span>
          <FiList size={14} />
        </button>
        <button type="button" className="rte__tool-btn" onClick={handleInsertLink} title="Chèn liên kết">
          <FiLink size={14} />
        </button>
        <button type="button" className="rte__tool-btn" onClick={() => runCommand("removeFormat")} title="Xóa định dạng">
          <FiRotateCcw size={14} />
        </button>
      </div>

      <div
        ref={editorRef}
        className="rte__editor"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        style={{ minHeight }}
        onInput={emitChange}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          emitChange();
        }}
      />
    </div>
  );
};

export default RichTextEditor;
