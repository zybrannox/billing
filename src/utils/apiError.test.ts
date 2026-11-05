import { AxiosError, type AxiosResponse } from "axios";
import { describe, expect, it } from "vitest";
import { getErrorDetail, getErrorMessage } from "./apiError";

const axiosError = (data: unknown) =>
  new AxiosError("Request failed", "ERR", undefined, undefined, { data } as AxiosResponse);

describe("getErrorDetail", () => {
  it("reads a plain server message", () => {
    expect(getErrorDetail(axiosError({ detail: "Not allowed" }))).toBe("Not allowed");
    expect(getErrorDetail({ detail: "Not allowed" })).toBe("Not allowed");
  });

  it("turns a validation list into one line, not something that crashes rendering", () => {
    expect(getErrorDetail({ detail: [{ msg: "Invalid email", loc: ["body"] }] })).toBe("Invalid email");
    expect(getErrorDetail({ detail: [] })).toBeNull();
    expect(getErrorDetail({ detail: [{ nope: 1 }] })).toBeNull();
    expect(getErrorDetail({ detail: { nested: true } })).toBeNull();
  });

  it("copes with things that aren't errors at all", () => {
    expect(getErrorDetail(null)).toBeNull();
    expect(getErrorDetail("boom")).toBeNull();
    expect(getErrorDetail(undefined)).toBeNull();
  });
});

describe("getErrorMessage", () => {
  it("prefers the server's words, then the error's, then the fallback", () => {
    expect(getErrorMessage(axiosError({ detail: "Too big" }), "x")).toBe("Too big");
    expect(getErrorMessage(new AxiosError("Network Error"), "x")).toBe("Network Error");
    expect(getErrorMessage({}, "x")).toBe("x");
    expect(getErrorMessage(null, "x")).toBe("x");
  });
});
