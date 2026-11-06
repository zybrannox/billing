import { describe, expect, it } from "vitest";
import { addProjectSchema, cleanPhone, isValidPhone } from "./addProject.schema";

const now = new Date().toISOString();
const base = { project_type: "Flex", assigned_to: "ravi", start_date: now, delivery_date: now, client_status: "Confirmed" };
const errorPaths = (data: object) => {
  const result = addProjectSchema.safeParse({ ...base, ...data });
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
};

describe("phone numbers", () => {
  it("drops what people type between the digits", () => {
    expect(cleanPhone("+91 98765-43210")).toBe("+919876543210");
    expect(isValidPhone("(987) 654-3210")).toBe(true);
  });

  it("refuses numbers that are too short, too long or not numbers", () => {
    expect(isValidPhone("12345")).toBe(false);
    expect(isValidPhone("1234567890123456")).toBe(false);
    expect(isValidPhone("not a phone")).toBe(false);
  });
});

describe("the customer on a new project", () => {
  it("needs a pick when using an existing customer", () => {
    expect(errorPaths({ customer_mode: "existing", customer_id: "" })).toEqual(["customer_id"]);
    expect(errorPaths({ customer_mode: "existing", customer_id: 5 })).toEqual([]);
  });

  it("needs a name and phone for a new customer, and no pick", () => {
    expect(errorPaths({ customer_mode: "new" })).toEqual(["new_customer_name", "new_customer_phone"]);
    expect(errorPaths({ customer_mode: "new", new_customer_name: "   ", new_customer_phone: "9876543210" })).toEqual(["new_customer_name"]);
    expect(errorPaths({ customer_mode: "new", new_customer_name: "Bruce", new_customer_phone: "98765 43210" })).toEqual([]);
  });
});

it("still refuses a delivery before the start", () => {
  const paths = errorPaths({ customer_mode: "existing", customer_id: 5, delivery_date: "2020-01-01T00:00:00.000Z" });
  expect(paths).toEqual(["delivery_date"]);
});
