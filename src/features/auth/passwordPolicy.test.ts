import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, passwordTooShortMessage } from "./passwordPolicy";

describe("password policy", () => {
  it("matches the backend minimum", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(10);
  });

  it("names the limit in its message", () => {
    expect(passwordTooShortMessage).toContain(String(MIN_PASSWORD_LENGTH));
  });
});
