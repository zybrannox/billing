import { describe, expect, it } from "vitest";
import { addCustomerSchema } from "./addCustomer.schema";

const customer = { first_name: "Bruce", contact_number: "9876543210" };

describe("addCustomerSchema", () => {
  it("accepts a customer with one name", () => {
    expect(addCustomerSchema.parse(customer).last_name).toBe("");
    expect(addCustomerSchema.safeParse({ ...customer, last_name: "" }).success).toBe(true);
  });

  it("still needs a first name", () => {
    expect(addCustomerSchema.safeParse({ ...customer, first_name: "" }).success).toBe(false);
  });
});
