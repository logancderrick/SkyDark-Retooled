import { describe, it, expect, vi } from "vitest";
import type { Connection } from "home-assistant-js-websocket";
import { resolveMediaUrl, localMediaSourceToMediaPath } from "./skyDarkApi";

function mockConn(sendImpl: (msg: unknown) => Promise<unknown>): Connection {
  return {
    sendMessagePromise: vi.fn(sendImpl),
    options: { auth: { accessToken: "testtoken" } },
  } as unknown as Connection;
}

describe("localMediaSourceToMediaPath", () => {
  it("maps Skydark local media-source ids to /media/local/…", () => {
    expect(
      localMediaSourceToMediaPath("media-source://media_source/local/Calendar%20Images/abc.jpg")
    ).toBe("/media/local/Calendar%20Images/abc.jpg");
    expect(localMediaSourceToMediaPath("media-source://spotify/foo")).toBeNull();
  });
});

describe("resolveMediaUrl", () => {
  it("falls back to /media/local/… when resolve_media throws", async () => {
    const conn = mockConn(async () => {
      throw new Error("command_failed");
    });
    const id = "media-source://media_source/local/Calendar%20Images/abc.jpg";
    const url = await resolveMediaUrl(conn, id);
    expect(url).toContain("/media/local/Calendar%20Images/abc.jpg");
    expect(url).toContain("access_token=testtoken");
  });

  it("falls back when resolve returns a non-displayable URL", async () => {
    const conn = mockConn(async () => ({ url: "media-source://media_source/local/still-a-source" }));
    const id = "media-source://media_source/local/Calendar%20Images/x.jpg";
    const url = await resolveMediaUrl(conn, id);
    expect(url).toContain("/media/local/Calendar%20Images/x.jpg");
  });

  it("uses resolve result when it returns a usable path", async () => {
    const conn = mockConn(async () => ({
      url: "/media/local/Calendar%20Images/from-resolve.jpg",
    }));
    const id = "media-source://media_source/local/Calendar%20Images/from-resolve.jpg";
    const url = await resolveMediaUrl(conn, id);
    expect(url).toContain("from-resolve.jpg");
    expect(url).toContain("access_token=testtoken");
  });

  it("passes plain paths through makeDisplayableMediaUrl", async () => {
    const conn = mockConn(async () => {
      throw new Error("should not be called");
    });
    const url = await resolveMediaUrl(conn, "/media/local/Calendar%20Images/direct.jpg");
    expect(url).toContain("/media/local/Calendar%20Images/direct.jpg");
    expect(url).toContain("access_token=testtoken");
    expect(conn.sendMessagePromise).not.toHaveBeenCalled();
  });
});
