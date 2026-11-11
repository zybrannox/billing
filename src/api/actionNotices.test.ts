import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "../store/useAppStore";
import { notify, useNoticeStore } from "../store/useNoticeStore";
import { describeError, failureNotice, pathOf, successNotice } from "./actionNotices";

const httpError = (status?: number, detail?: unknown, code?: string) => {
  const config = { headers: new AxiosHeaders() };
  const response = status
    ? { status, data: detail === undefined ? {} : { detail }, statusText: "", headers: {}, config }
    : undefined;
  return new AxiosError("Request failed", code, config, {}, response);
};

describe("which action a request is", () => {
  it("reads the path without server, query or trailing slash", () => {
    expect(pathOf("https://api.example.com/projects/?x=1")).toBe("/projects");
    expect(pathOf("/projects/12/delivered?on_credit=true")).toBe("/projects/12/delivered");
  });

  it("says what was done", () => {
    useAppStore.setState({ user: { role: "admin" } as never });
    expect(successNotice("post", "/projects/", "{}", { id: 9 })).toMatchObject({
      tone: "success",
      title: "Project added",
      action: { label: "Show project", to: "/admin/projects?projectId=9" },
    });
    expect(successNotice("post", "/files/attach/9", JSON.stringify({ files: [{}, {}, {}] }), {})?.title).toBe("3 files added to the project");
    expect(successNotice("patch", "/invoices/4", JSON.stringify({ status: "cancelled" }), {})?.title).toBe("Invoice cancelled");
    expect(successNotice("patch", "/notes/2", JSON.stringify({ is_done: true }), {})?.title).toBe("Note marked done");
  });

  it("sends staff to their own projects page", () => {
    useAppStore.setState({ user: { role: "user" } as never });
    expect(successNotice("post", "/projects", "{}", { id: 3 })?.action?.to).toBe("/?projectId=3");
  });

  it("stays quiet where the screen reports for itself", () => {
    expect(successNotice("post", "/files/upload/chunk", null, {})).toBeNull();
    expect(successNotice("post", "/auth/login", "{}", {})).toBeNull();
    expect(successNotice("post", "/something/new", "{}", {})).toBeNull();
    expect(failureNotice("post", "/files/upload/chunk", httpError(500))).toBeNull();
    expect(failureNotice("post", "/auth/login", httpError(400, "Wrong password"))).toBeNull();
    expect(failureNotice("post", "/projects", httpError(401))).toBeNull();
  });
});

describe("failures", () => {
  it("names the action and gives the server's reason", () => {
    expect(failureNotice("post", "/projects/", httpError(400, "Customer is required"))).toEqual({
      tone: "error",
      title: "Couldn't add the project",
      message: "Customer is required",
    });
  });

  it("still reports an action nobody listed", () => {
    expect(failureNotice("post", "/brand/new", httpError(400, "Nope"))).toMatchObject({ title: "That didn't work", message: "Nope" });
  });

  it("explains each kind of failure honestly", () => {
    expect(describeError(httpError(undefined))).toMatch(/No connection.*nothing was saved/);
    expect(describeError(httpError(undefined, undefined, "ECONNABORTED"))).toMatch(/took too long.*check whether it was saved/);
    expect(describeError(httpError(500))).toMatch(/check whether it was saved/);
    expect(describeError(httpError(403))).toMatch(/permission/);
    expect(describeError(httpError(413))).toMatch(/too large/);
    expect(describeError(httpError(422, [{ msg: "Field required" }]))).toBe("Field required");
    expect(describeError(httpError(422, [{ loc: ["body", "customer_id"], msg: "Field required" }]))).toBe("Customer id: Field required");
  });
});

describe("notice stack", () => {
  beforeEach(() => useNoticeStore.getState().clear());

  it("collapses a batch into one notice", () => {
    const opts = { group: "files", groupTitle: (n: number) => (n === 1 ? "File uploaded" : `${n} files uploaded`) };
    notify.success("x", opts);
    notify.success("x", opts);
    notify.success("x", opts);
    const notices = useNoticeStore.getState().notices;
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ title: "3 files uploaded", count: 3, version: 2 });
  });

  it("keeps errors when the stack is full", () => {
    notify.error("Important");
    for (let i = 0; i < 6; i++) notify.success(`Done ${i}`);
    const titles = useNoticeStore.getState().notices.map((n) => n.title);
    expect(titles).toHaveLength(4);
    expect(titles).toContain("Important");
  });
});
