import { describe, expect, it } from "vitest";
import { customerChoicePayload, customerChoiceProblem, emptyCustomerChoice } from "./customerChoiceRules";

const newCustomer = { mode: "new" as const, name: "  Bruce  ", phone: "98765 43210" };

describe("customerChoiceProblem", () => {
  it("needs a pick for an existing customer", () => {
    expect(customerChoiceProblem(emptyCustomerChoice())).toBe("Pick a customer before generating.");
    expect(customerChoiceProblem(emptyCustomerChoice(5))).toBeNull();
  });

  it("needs a name and a real phone number for a new one", () => {
    expect(customerChoiceProblem({ ...newCustomer, name: "   " })).toBe("Enter the customer's name.");
    expect(customerChoiceProblem({ ...newCustomer, name: "x".repeat(101) })).toContain("under 100");
    expect(customerChoiceProblem({ ...newCustomer, phone: "12345" })).toBe("Enter a valid phone number.");
    expect(customerChoiceProblem(newCustomer)).toBeNull();
  });
});

describe("customerChoicePayload", () => {
  it("sends the id for an existing customer", () => {
    expect(customerChoicePayload(emptyCustomerChoice(5))).toEqual({ customer_id: 5 });
  });

  it("sends a tidied name and number for a new one, ignoring an earlier pick", () => {
    expect(customerChoicePayload({ ...newCustomer, customerId: 5 })).toEqual({
      new_customer: { name: "Bruce", contact_number: "9876543210" },
    });
  });
});
