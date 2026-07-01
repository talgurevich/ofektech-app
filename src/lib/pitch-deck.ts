import PptxGenJS from "pptxgenjs";
import { promises as fs } from "fs";
import path from "path";

// Sequoia-style 10-slide pitch deck, generated from a venture's workbook.
// Hebrew RTL throughout. Empty workbook sheets still produce their slide
// with placeholder text so the deck stays a full 10-slide structure.

const HEBREW_FONT = "Arial";
const BRAND_NAVY = "1a2744";
const BRAND_GREEN = "22c55e";
const MUTED_GREY = "6b7280";
const PLACEHOLDER_HEB = "אין נתונים עדיין — יש למלא את הגיליון בחוברת";

// LAYOUT_WIDE is 13.333 x 7.5 in
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;

interface VentureInput {
  name: string;
  description: string | null;
}

interface MemberInput {
  full_name: string | null;
  email: string | null;
  venture_role: string | null;
  bio: string | null;
  linkedin_url: string | null;
}

interface WorkbookRow {
  sheet_key: string;
  data: Record<string, unknown>;
}

interface DeckInput {
  venture: VentureInput;
  members: MemberInput[];
  entries: WorkbookRow[];
}

async function loadImageAsDataUrl(relPath: string, mime: string): Promise<string> {
  const abs = path.join(process.cwd(), "public", relPath);
  const buf = await fs.readFile(abs);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function rowsFor(entries: WorkbookRow[], sheetKey: string) {
  return entries.filter((e) => e.sheet_key === sheetKey);
}

export async function generatePitchDeck(input: DeckInput): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.rtlMode = true;
  pptx.title = "Pitch Deck";
  pptx.company = "OfekTech";

  // Preload images once.
  const ofekLogo = await loadImageAsDataUrl("logo.png", "image/png");
  const partners = await Promise.all([
    loadImageAsDataUrl("partners/pwc.png", "image/png"),
    loadImageAsDataUrl("partners/seedbiz.png", "image/png"),
    loadImageAsDataUrl("partners/hype.jpg", "image/jpeg"),
    loadImageAsDataUrl("partners/sfa.png", "image/png"),
    loadImageAsDataUrl("partners/israel-innovation-authority.png", "image/png"),
    loadImageAsDataUrl("partners/nortech.png", "image/png"),
  ]);

  // Text option helper — every text block on the deck is Hebrew, so we
  // centralise the RTL/font settings here.
  const heb = (extra: PptxGenJS.TextPropsOptions = {}): PptxGenJS.TextPropsOptions => ({
    fontFace: HEBREW_FONT,
    rtlMode: true,
    align: "right",
    color: BRAND_NAVY.toUpperCase(),
    ...extra,
  });

  const addOfekLogo = (slide: PptxGenJS.Slide) => {
    slide.addImage({ data: ofekLogo, x: 0.3, y: 0.3, w: 1.4, h: 0.6 });
  };

  const addSlideHeader = (slide: PptxGenJS.Slide, title: string) => {
    addOfekLogo(slide);
    slide.addText(title, {
      ...heb({ fontSize: 32, bold: true }),
      x: 0.5,
      y: 0.9,
      w: SLIDE_W - 1.0,
      h: 0.9,
    });
    // Accent underline
    slide.addShape("rect", {
      x: SLIDE_W - 3.2,
      y: 1.75,
      w: 2.5,
      h: 0.05,
      fill: { color: BRAND_GREEN },
      line: { color: BRAND_GREEN },
    });
  };

  const addPlaceholder = (slide: PptxGenJS.Slide) => {
    slide.addText(PLACEHOLDER_HEB, {
      ...heb({ fontSize: 18, italic: true, color: MUTED_GREY.toUpperCase() }),
      x: 0.7,
      y: 3.4,
      w: SLIDE_W - 1.4,
      h: 0.7,
      align: "center",
    });
  };

  // ==== Slide 1: Title / Company Purpose ============================
  {
    const slide = pptx.addSlide();
    addOfekLogo(slide);

    // Venture logo placeholder box (top-right, RTL hero spot)
    slide.addShape("rect", {
      x: SLIDE_W - 3.0,
      y: 1.6,
      w: 2.3,
      h: 2.3,
      fill: { color: "F3F4F6" },
      line: { color: "D1D5DB", width: 1, dashType: "dash" },
    });
    slide.addText("לוגו המיזם", {
      ...heb({ fontSize: 14, color: "9CA3AF", align: "center" }),
      x: SLIDE_W - 3.0,
      y: 2.55,
      w: 2.3,
      h: 0.4,
    });

    // Venture name (hero)
    slide.addText(input.venture.name || "שם המיזם", {
      ...heb({ fontSize: 54, bold: true }),
      x: 0.5,
      y: 1.9,
      w: SLIDE_W - 4.0,
      h: 1.2,
    });

    // Description / one-liner
    slide.addText(input.venture.description || "תיאור המיזם", {
      ...heb({ fontSize: 22, color: MUTED_GREY.toUpperCase() }),
      x: 0.5,
      y: 3.1,
      w: SLIDE_W - 4.0,
      h: 1.5,
      valign: "top",
    });

    // "אקסלרטור אופקטק" subtitle
    slide.addText("אקסלרטור אופקטק", {
      ...heb({ fontSize: 16, color: BRAND_GREEN.toUpperCase(), bold: true }),
      x: 0.5,
      y: 4.6,
      w: SLIDE_W - 4.0,
      h: 0.5,
    });

    // Partner logos strip along the bottom
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
      slide.addImage({
        data: p,
        x: 0.5 + i * (logoW + gap),
        y: stripY,
        w: logoW,
        h: stripH,
        sizing: { type: "contain", w: logoW, h: stripH },
      });
    });
  }

  // ==== Slide 2: Problem =============================================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, "הבעיה");
    const customers = rowsFor(input.entries, "customers");
    const pains = Array.from(
      new Set(
        customers
          .map((c) => s(c.data.pain))
          .filter((p) => p.length > 0)
      )
    ).slice(0, 6);
    if (pains.length === 0) {
      addPlaceholder(slide);
    } else {
      slide.addText(
        pains.map((p) => ({ text: p, options: { bullet: { code: "25CF" } } })),
        {
          ...heb({ fontSize: 20, paraSpaceAfter: 10 }),
          x: 0.7,
          y: 2.1,
          w: SLIDE_W - 1.4,
          h: SLIDE_H - 2.7,
          valign: "top",
        }
      );
    }
  }

  // ==== Slide 3: Solution (placeholder — no workbook field) ==========
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, "הפתרון");
    addPlaceholder(slide);
  }

  // ==== Slide 4: Why Now (placeholder) ==============================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, "למה עכשיו");
    addPlaceholder(slide);
  }

  // ==== Slide 5: Market Size =========================================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, "גודל השוק");
    const market = rowsFor(input.entries, "market");
    if (market.length === 0) {
      addPlaceholder(slide);
    } else {
      // Pick the most complete row as the headline, list sources below.
      const primary =
        market.find(
          (r) => s(r.data.tam) && s(r.data.sam) && s(r.data.som)
        ) || market[0];

      const headline = [
        { label: "TAM", value: s(primary.data.tam) || "—" },
        { label: "SAM", value: s(primary.data.sam) || "—" },
        { label: "SOM", value: s(primary.data.som) || "—" },
      ];
      const cardW = 3.5;
      const cardH = 1.8;
      const gap = 0.4;
      const totalW = cardW * 3 + gap * 2;
      const startX = (SLIDE_W - totalW) / 2;
      headline.forEach((c, i) => {
        const x = startX + i * (cardW + gap);
        slide.addShape("roundRect", {
          x,
          y: 2.3,
          w: cardW,
          h: cardH,
          fill: { color: "F9FAFB" },
          line: { color: "E5E7EB", width: 1 },
          rectRadius: 0.12,
        });
        slide.addText(c.label, {
          ...heb({
            fontSize: 18,
            bold: true,
            color: BRAND_GREEN.toUpperCase(),
            align: "center",
          }),
          x,
          y: 2.45,
          w: cardW,
          h: 0.5,
        });
        slide.addText(c.value, {
          ...heb({ fontSize: 26, bold: true, align: "center" }),
          x,
          y: 3.0,
          w: cardW,
          h: 0.9,
        });
      });

      // Sources list below
      const sources = market
        .map((r) => {
          const src = s(r.data.source);
          const seg = s(r.data.segment_name);
          return [src, seg].filter(Boolean).join(" — ");
        })
        .filter(Boolean)
        .slice(0, 5);
      if (sources.length > 0) {
        slide.addText("מקורות:", {
          ...heb({ fontSize: 14, bold: true, color: MUTED_GREY.toUpperCase() }),
          x: 0.7,
          y: 4.6,
          w: SLIDE_W - 1.4,
          h: 0.4,
        });
        slide.addText(
          sources.map((t) => ({ text: t, options: { bullet: true } })),
          {
            ...heb({ fontSize: 14, color: MUTED_GREY.toUpperCase() }),
            x: 0.7,
            y: 5.0,
            w: SLIDE_W - 1.4,
            h: SLIDE_H - 5.3,
            valign: "top",
          }
        );
      }
    }
  }

  // ==== Slide 6: Competition ========================================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, "מתחרים");
    const comp = rowsFor(input.entries, "competitors").slice(0, 10);
    if (comp.length === 0) {
      addPlaceholder(slide);
    } else {
      const header = [
        { text: "שם", options: { bold: true, fill: { color: BRAND_NAVY }, color: "FFFFFF" } },
        { text: "סוג", options: { bold: true, fill: { color: BRAND_NAVY }, color: "FFFFFF" } },
        { text: "מה הם עושים", options: { bold: true, fill: { color: BRAND_NAVY }, color: "FFFFFF" } },
        { text: "מודל עסקי", options: { bold: true, fill: { color: BRAND_NAVY }, color: "FFFFFF" } },
      ];
      const rows: PptxGenJS.TableRow[] = [
        header,
        ...comp.map((c) => [
          { text: s(c.data.name), options: {} },
          { text: s(c.data.competitor_type), options: {} },
          { text: s(c.data.description), options: {} },
          { text: s(c.data.pricing), options: {} },
        ]),
      ];
      slide.addTable(rows, {
        x: 0.5,
        y: 2.1,
        w: SLIDE_W - 1.0,
        h: SLIDE_H - 2.7,
        fontFace: HEBREW_FONT,
        fontSize: 12,
        align: "right",
        color: BRAND_NAVY,
        border: { type: "solid", color: "E5E7EB", pt: 0.5 },
        colW: [
          (SLIDE_W - 1.0) * 0.2,
          (SLIDE_W - 1.0) * 0.18,
          (SLIDE_W - 1.0) * 0.42,
          (SLIDE_W - 1.0) * 0.2,
        ],
      });
      const totalComp = rowsFor(input.entries, "competitors").length;
      if (totalComp > 10) {
        slide.addText(`+ ${totalComp - 10} נוספים`, {
          ...heb({ fontSize: 12, italic: true, color: MUTED_GREY.toUpperCase() }),
          x: 0.5,
          y: SLIDE_H - 0.6,
          w: SLIDE_W - 1.0,
          h: 0.4,
        });
      }
    }
  }

  // ==== Slide 7: Product (placeholder) ==============================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, "המוצר");
    addPlaceholder(slide);
  }

  // ==== Slide 8: Business Model (placeholder) =======================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, "מודל עסקי");
    addPlaceholder(slide);
  }

  // ==== Slide 9: Team ================================================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, "הצוות");
    const team = input.members.filter(
      (m) => s(m.full_name) || s(m.email)
    );
    if (team.length === 0) {
      addPlaceholder(slide);
    } else {
      const perRow = Math.min(3, team.length);
      const rows = Math.ceil(team.length / perRow);
      const gap = 0.4;
      const cardW = (SLIDE_W - 1.4 - gap * (perRow - 1)) / perRow;
      const areaH = SLIDE_H - 2.7;
      const cardH = Math.min(2.4, (areaH - gap * (rows - 1)) / rows);
      team.slice(0, perRow * rows).forEach((m, i) => {
        const r = Math.floor(i / perRow);
        const c = i % perRow;
        const x = 0.7 + c * (cardW + gap);
        const y = 2.2 + r * (cardH + gap);
        slide.addShape("roundRect", {
          x,
          y,
          w: cardW,
          h: cardH,
          fill: { color: "F9FAFB" },
          line: { color: "E5E7EB", width: 1 },
          rectRadius: 0.1,
        });
        const name = s(m.full_name) || s(m.email) || "";
        const role = s(m.venture_role);
        const bio = s(m.bio);
        slide.addText(name, {
          ...heb({ fontSize: 16, bold: true }),
          x: x + 0.2,
          y: y + 0.15,
          w: cardW - 0.4,
          h: 0.45,
        });
        if (role) {
          slide.addText(role, {
            ...heb({
              fontSize: 12,
              color: BRAND_GREEN.toUpperCase(),
              bold: true,
            }),
            x: x + 0.2,
            y: y + 0.6,
            w: cardW - 0.4,
            h: 0.35,
          });
        }
        if (bio) {
          slide.addText(bio, {
            ...heb({ fontSize: 11, color: MUTED_GREY.toUpperCase() }),
            x: x + 0.2,
            y: y + 1.0,
            w: cardW - 0.4,
            h: cardH - 1.1,
            valign: "top",
          });
        }
      });
    }
  }

  // ==== Slide 10: Financials (placeholder) ==========================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, "פיננסים");
    addPlaceholder(slide);
  }

  const out = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return out;
}
