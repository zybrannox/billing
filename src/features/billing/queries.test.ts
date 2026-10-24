import { describe, expect, it } from "vitest";
import { isSameList } from "./queries";

describe("isSameList", () => {
  it("treats another page of the same customer as the same list", () => {
    expect(isSameList({ customer_id: 5, page: 1, page_size: 10 }, { customer_id: 5, page: 2, page_size: 10 })).toBe(true);
  });
  it("never reuses one customer's rows for another", () => {
    expect(isSameList({ customer_id: 5, page: 1, page_size: 10 }, { customer_id: 6, page: 1, page_size: 10 })).toBe(false);
    expect(isSameList({ company_id: 5, page: 1, page_size: 10 }, { customer_id: 5, page: 1, page_size: 10 })).toBe(false);
  });
  it("has no previous list on first load", () => {
    expect(isSameList(undefined, { customer_id: 5, page: 1, page_size: 10 })).toBe(false);
  });
});
