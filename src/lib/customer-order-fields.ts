import { isRichTextEmpty, toRichTextPlainText } from "./rich-text";

export type CustomerOrderFieldType =
  | "short_text"
  | "long_text"
  | "select"
  | "image_upload"
  | "number"
  | "date";

export type CustomerOrderFieldSelectType = "dropdown" | "radio" | "checkbox";

export type CustomerOrderFieldValue = string | string[];

export interface CustomerOrderFieldOption {
  label: string;
  value: string;
}

export interface CustomerOrderFieldDefinition {
  label: string;
  fieldType: CustomerOrderFieldType;
  placeholder: string;
  required: boolean;
  options: CustomerOrderFieldOption[];
  sortOrder: number;
  selectType?: CustomerOrderFieldSelectType;
}

export interface CustomerOrderFieldEntry extends CustomerOrderFieldDefinition {
  key: string;
  value: CustomerOrderFieldValue;
}

export const buildCustomerOrderFieldKey = (
  index: number,
  fieldLabel: string,
  fieldType: CustomerOrderFieldType,
) => `${index}-${fieldType}-${fieldLabel}`;

export const isCustomerOrderFieldValueEmpty = (
  field: Pick<CustomerOrderFieldDefinition, "fieldType" | "selectType">,
  value: CustomerOrderFieldValue | undefined,
) => {
  if (field.fieldType === "select" && field.selectType === "checkbox") {
    return !Array.isArray(value) || value.length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (field.fieldType === "long_text") {
    return isRichTextEmpty(typeof value === "string" ? value : "");
  }

  return !String(value ?? "").trim();
};

export const formatCustomerOrderFieldValue = (
  entry: Pick<
    CustomerOrderFieldEntry,
    "fieldType" | "selectType" | "options" | "value"
  >,
) => {
  if (entry.fieldType === "select" && entry.selectType === "checkbox") {
    const selectedValues = Array.isArray(entry.value) ? entry.value : [];

    if (selectedValues.length === 0) {
      return "";
    }

    return selectedValues
      .map(
        (selectedValue) =>
          entry.options.find((option) => option.value === selectedValue)?.label ??
          selectedValue,
      )
      .join(", ");
  }

  const normalizedValue = Array.isArray(entry.value)
    ? entry.value[0] ?? ""
    : entry.value;

  if (entry.fieldType === "select") {
    return (
      entry.options.find((option) => option.value === normalizedValue)?.label ??
      String(normalizedValue ?? "")
    );
  }

  if (entry.fieldType === "long_text") {
    return toRichTextPlainText(String(normalizedValue ?? ""));
  }

  return String(normalizedValue ?? "");
};

export const normalizeCustomerOrderFieldValue = (
  field: Pick<CustomerOrderFieldDefinition, "fieldType" | "selectType">,
  rawValue: CustomerOrderFieldValue | undefined,
): CustomerOrderFieldValue => {
  if (field.fieldType === "select" && field.selectType === "checkbox") {
    if (!Array.isArray(rawValue)) {
      return [];
    }

    return rawValue.filter((value) => value.trim().length > 0);
  }

  if (Array.isArray(rawValue)) {
    return rawValue[0] ?? "";
  }

  return typeof rawValue === "string" ? rawValue : "";
};
