import PptxGenJS from "pptxgenjs";
import { promises as fs } from "fs";
import path from "path";

// Investor-style pitch deck built from a venture's guide (חוברת מיזם):
// one title slide + one slide per guide chapter, using the venture's saved
// chapter content as the slide body. Hebrew RTL throughout. Empty chapters
// still produce their slide with placeholder text so the deck stays whole.

const HEBREW_FONT = "Arial";
const BRAND_NAVY = "1a2744";
const BRAND_GREEN = "22c55e";
const MUTED_GREY = "6b7280";
const PLACEHOLDER_HEB = "פרק זה טרם מולא בחוברת המיזם";

// LAYOUT_WIDE is 13.333 x 7.5 in
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;

interface VentureInput {
  name: string;
  description: string | null;
}

interface ChapterInput {
  chapter_number: number;
  title: string;
  content: string; // The prompt/description text of the chapter.
}

interface EntryInput {
  chapter_id: string;
  content: string; // The venture's written answer for this chapter.
}

interface ChapterWithEntry extends ChapterInput {
  id: string;
  ventureContent: string;
}

interface DeckInput {
  venture: VentureInput;
  chapters: (ChapterInput & { id: string })[];
  entries: EntryInput[];
}

interface LoadedImage {
  data: string; // data URL
  w: number; // pixels
  h: number; // pixels
}

// Minimal PNG/JPEG header parsers so we can preserve aspect ratio when
// placing logos into fixed-size boxes (pptxgenjs's `sizing: contain` is
// unreliable with data URLs).
function readPngDimensions(buf: Buffer): { w: number; h: number } {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function readJpegDimensions(buf: Buffer): { w: number; h: number } {
  let i = 2;
  while (i < buf.length - 8) {
    if (buf[i] !== 0xff) throw new Error("bad jpeg");
    const marker = buf[i + 1];
    const isSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isSof) {
      return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
    }
    const segLen = buf.readUInt16BE(i + 2);
    i += 2 + segLen;
  }
  throw new Error("no SOF marker");
}

async function loadImage(relPath: string, mime: string): Promise<LoadedImage> {
  const abs = path.join(process.cwd(), "public", relPath);
  const buf = await fs.readFile(abs);
  const { w, h } =
    mime === "image/png" ? readPngDimensions(buf) : readJpegDimensions(buf);
  return {
    data: `data:${mime};base64,${buf.toString("base64")}`,
    w,
    h,
  };
}

// Fit source (sw × sh) into a box (boxW × boxH), preserving aspect ratio.
// Returns the drawn rect centered inside the box.
function fitContain(
  sw: number,
  sh: number,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
) {
  const srcAspect = sw / sh;
  const boxAspect = boxW / boxH;
  let w: number;
  let h: number;
  if (srcAspect > boxAspect) {
    w = boxW;
    h = boxW / srcAspect;
  } else {
    h = boxH;
    w = boxH * srcAspect;
  }
  return {
    x: boxX + (boxW - w) / 2,
    y: boxY + (boxH - h) / 2,
    w,
    h,
  };
}

export async function generatePitchDeck(input: DeckInput): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.rtlMode = true;
  pptx.title = "Pitch Deck";
  pptx.company = "OfekTech";

  const ofekLogo = await loadImage("logo.png", "image/png");
  const partners = await Promise.all([
    loadImage("partners/pwc.png", "image/png"),
    loadImage("partners/seedbiz.png", "image/png"),
    loadImage("partners/hype.jpg", "image/jpeg"),
    loadImage("partners/sfa.png", "image/png"),
    loadImage("partners/israel-innovation-authority.png", "image/png"),
    loadImage("partners/nortech.png", "image/png"),
  ]);

  const heb = (extra: PptxGenJS.TextPropsOptions = {}): PptxGenJS.TextPropsOptions => ({
    fontFace: HEBREW_FONT,
    rtlMode: true,
    // Explicit Hebrew language on every run so PowerPoint applies the
    // Hebrew bidi algorithm even when text contains embedded Latin words
    // (product names, acronyms). Without this, "CME שואפת" gets treated as
    // LTR with the Hebrew reversed.
    lang: "he-IL",
    align: "right",
    color: BRAND_NAVY.toUpperCase(),
    ...extra,
  });

  const addOfekLogo = (slide: PptxGenJS.Slide) => {
    const r = fitContain(ofekLogo.w, ofekLogo.h, 0.3, 0.3, 1.4, 0.6);
    slide.addImage({ data: ofekLogo.data, x: r.x, y: r.y, w: r.w, h: r.h });
  };

  const addSlideHeader = (slide: PptxGenJS.Slide, title: string) => {
    addOfekLogo(slide);
    slide.addText(title, {
      ...heb({ fontSize: 30, bold: true }),
      x: 0.5,
      y: 0.9,
      w: SLIDE_W - 1.0,
      h: 1.0,
    });
    slide.addShape("rect", {
      x: SLIDE_W - 3.2,
      y: 1.85,
      w: 2.5,
      h: 0.05,
      fill: { color: BRAND_GREEN },
      line: { color: BRAND_GREEN },
    });
  };

  // ==== Title slide ==================================================
  {
    const slide = pptx.addSlide();
    addOfekLogo(slide);

    // Venture logo placeholder box (centered above the venture name)
    const logoBoxW = 2.3;
    const logoBoxH = 2.3;
    slide.addShape("rect", {
      x: (SLIDE_W - logoBoxW) / 2,
      y: 1.2,
      w: logoBoxW,
      h: logoBoxH,
      fill: { color: "F3F4F6" },
      line: { color: "D1D5DB", width: 1, dashType: "dash" },
    });
    slide.addText("לוגו המיזם", {
      ...heb({ fontSize: 14, color: "9CA3AF", align: "center" }),
      x: (SLIDE_W - logoBoxW) / 2,
      y: 2.15,
      w: logoBoxW,
      h: 0.4,
    });

    slide.addText(input.venture.name || "שם המיזם", {
      ...heb({ fontSize: 54, bold: true, align: "center" }),
      x: 0.5,
      y: 3.7,
      w: SLIDE_W - 1.0,
      h: 1.2,
    });

    slide.addText(input.venture.description || "תיאור המיזם", {
      ...heb({ fontSize: 22, color: MUTED_GREY.toUpperCase(), align: "center" }),
      x: 0.5,
      y: 4.9,
      w: SLIDE_W - 1.0,
      h: 0.8,
      valign: "top",
    });

    // Partner logo strip along the bottom
    const stripY = 6.1;
    const stripH = 0.9;
    const count = partners.length;
    const gap = 0.3;
    const totalGap = gap * (count - 1);
    const logoW = (SLIDE_W - 1.0 - totalGap) / count;
    slide.addText("בשיתוף", {
      ...heb({ fontSize: 12, color: MUTED_GREY.toUpperCase(), align: "center" }),
      x: 0.5,
      y: stripY - 0.4,
      w: SLIDE_W - 1.0,
      h: 0.35,
    });
    partners.forEach((p, i) => {
      const r = fitContain(
        p.w,
        p.h,
        0.5 + i * (logoW + gap),
        stripY,
        logoW,
        stripH,
      );
      slide.addImage({ data: p.data, x: r.x, y: r.y, w: r.w, h: r.h });
    });
  }

  // ==== One slide per chapter =======================================
  const entriesByChapter = new Map<string, string>();
  for (const e of input.entries) {
    entriesByChapter.set(e.chapter_id, (e.content || "").trim());
  }

  const chapters: ChapterWithEntry[] = [...input.chapters]
    .sort((a, b) => a.chapter_number - b.chapter_number)
    .map((c) => ({
      ...c,
      ventureContent: entriesByChapter.get(c.id) || "",
    }));

  for (const ch of chapters) {
    const slide = pptx.addSlide();
    // No numeric prefix: mixing a LTR "1." with an RTL Hebrew title makes
    // PowerPoint's bidi split the runs the wrong way. Chapter titles alone
    // are self-explanatory on a pitch deck.
    addSlideHeader(slide, ch.title);

    if (ch.ventureContent.length === 0) {
      slide.addText(PLACEHOLDER_HEB, {
        ...heb({
          fontSize: 18,
          italic: true,
          color: MUTED_GREY.toUpperCase(),
          align: "center",
        }),
        x: 0.7,
        y: 3.4,
        w: SLIDE_W - 1.4,
        h: 0.7,
      });
    } else {
      slide.addText(ch.ventureContent, {
        ...heb({ fontSize: 18 }),
        x: 0.7,
        y: 2.2,
        w: SLIDE_W - 1.4,
        h: SLIDE_H - 2.8,
        valign: "top",
      });
    }
  }

  const out = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return out;
}
