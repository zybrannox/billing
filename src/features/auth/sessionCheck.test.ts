import { describe, expect, it } from "vitest";
import { checkSession } from "./sessionCheck";

const me = (id: string) => async () => ({ id, label: `${id}@example.com` });
const failing = (err: unknown) => async () => {
  throw err;
};

describe("checkSession", () => {
  it("is quiet while the browser is still on the same account", async () => {
    expect(await checkSession("asha", me("asha"))).toEqual({ kind: "same" });
  });

  it("reports the new account when the browser has switched", async () => {
    expect(await checkSession("asha", me("ravi"))).toEqual({
      kind: "changed",
      now: { id: "ravi", label: "ravi@example.com" },
    });
  });

  it("reports a signed-out browser", async () => {
    expect(await checkSession("asha", failing({ response: { status: 401 } }))).toEqual({ kind: "signedOut" });
  });

  it.each([[new Error("Network Error")], [{ response: { status: 500 } }], [{ response: { status: 429 } }]])(
    "does not treat %o as a sign-out",
    async (err) => {
      expect(await checkSession("asha", failing(err))).toEqual({ kind: "unknown" });
    },
  );
});
