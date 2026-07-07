import { describe, expect, it } from "vitest";
import { parseStyledText } from "@/lib/render/parseStyledText";

describe("parseStyledText", () => {
  it("marks star text as accent", () => { expect(parseStyledText("Police *Daroga* caught")).toEqual([{ text: "Police " }, { text: "Daroga", accent: true }, { text: " caught" }]); });
  it("marks underscore text as italic", () => { expect(parseStyledText("Caught _Stealing_ cash")).toEqual([{ text: "Caught " }, { text: "Stealing", italic: true }, { text: " cash" }]); });
  it("marks combined syntax as accent and italic", () => { expect(parseStyledText("This is *_Breaking_* news")).toEqual([{ text: "This is " }, { text: "Breaking", accent: true, italic: true }, { text: " news" }]); });
  it("keeps broken markup as plain text", () => { expect(parseStyledText("This *does not close")).toEqual([{ text: "This *does not close" }]); });
});
