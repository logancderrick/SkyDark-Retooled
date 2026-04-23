import { describe, it, expect } from "vitest";
import { haMediaImgSrc } from "./haMediaImgUrl";

describe("haMediaImgSrc", () => {
  const origin = "http://homeassistant.local:8123";

  it("strips access_token for same-origin /media paths", () => {
    const inUrl = `${origin}/media/local/Calendar%20Images/a.jpeg?access_token=abc.def.ghi`;
    expect(haMediaImgSrc(inUrl, origin)).toBe("/media/local/Calendar%20Images/a.jpeg");
  });

  it("keeps authSig when stripping access_token", () => {
    const inUrl = `${origin}/media/local/x.png?access_token=bad&authSig=good`;
    expect(haMediaImgSrc(inUrl, origin)).toBe("/media/local/x.png?authSig=good");
  });

  it("leaves other origins unchanged", () => {
    const u = "https://cdn.example.com/img.png";
    expect(haMediaImgSrc(u, origin)).toBe(u);
  });

  it("passes through blob URLs", () => {
    expect(haMediaImgSrc("blob:http://x/1", origin)).toBe("blob:http://x/1");
  });
});
