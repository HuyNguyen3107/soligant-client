import { http } from "../lib/http";
import type {
  CustomerOrderFieldsConfig,
  CustomerOrderFieldsFormState,
} from "../pages/Dashboard/types";

export type CustomerOrderFieldsPayload = {
  title: string;
  description: string;
  fields: Array<CustomerOrderFieldsFormState["fields"][number] & { sortOrder: number }>;
  isActive: boolean;
};

export const getCustomerOrderFieldsConfig = async () => {
  const { data } = await http.get<CustomerOrderFieldsConfig>("/customer-order-fields");
  return data;
};

export const updateCustomerOrderFieldsConfig = async (
  payload: CustomerOrderFieldsPayload,
) => {
  const { data } = await http.put<CustomerOrderFieldsConfig>(
    "/customer-order-fields",
    payload,
  );
  return data;
};

export const getPublicCustomerOrderFieldsConfig = async () => {
  const { data } = await http.get<CustomerOrderFieldsConfig>(
    "/public/customer-order-fields",
  );
  return data;
};
