(() => {
  "use strict";

  const section = document.getElementById("flow");
  const canvas = document.getElementById("flowCanvas");
  const hint = document.getElementById("flowHint");
  const paletteWrap = document.getElementById("flowPalette");
  const clearButton = document.getElementById("flowClear");
  if (!section || !canvas || !paletteWrap) return;

  const LINES = ["I am rooted,", "but I flow."];
  const FONT = '"Playfair Display", "Bodoni 72", Didot, "Times New Roman", serif';
  const TAU = Math.PI * 2;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const PALETTES = [
    ["Rose noir", "#000000", "#FF1400", "#3257FF", "#FFB4A8", "#FFFFFF"],
    ["Paper", "#F3EEE4", "#FF3B1F", "#1C2B8F", "#FFD2C4", "#111111"],
    ["Midnight", "#0D1B4C", "#FF5A4E", "#9FB4FF", "#FFD6CF", "#FFFFFF"],
    ["Citrus", "#0E1A12", "#FF8A00", "#1FA463", "#FFE2B8", "#FFF6E8"],
    ["Orchid", "#140A1F", "#E63CFF", "#2FB8A6", "#F9D1FF", "#FFFFFF"],
    ["Moss", "#133A2A", "#FFB7C5", "#7FD18B", "#FFFFFF", "#F6F1E7"],
    ["Tomato", "#FF1400", "#FFF1E0", "#0B0B0B", "#FF1400", "#000000"],
    ["Butter", "#FFE9A8", "#E4002B", "#0F5132", "#FFC2C2", "#1A1A1A"],
    ["Blush", "#FAD4D8", "#C8102E", "#274690", "#FFE3E6", "#1A1A1A"],
    ["Mono", "#000000", "#F2F2F2", "#6E6E6E", "#000000", "#FFFFFF"]
  ];

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

  class TypeGarden {
    constructor() {
      this.cv = canvas;
      this.g = canvas.getContext("2d");
      if (!this.g) return;

      this.W = 0;
      this.H = 0;
      this.dpr = 1;
      this.Sd = 0;
      this.St = 0;
      this.cache = {};
      this.letters = [];
      this.flies = [];
      this.perch = [];
      this.fa = {};
      this.mx = null;
      this.my = null;
      this.uid = 1;
      this.paletteIndex = 1;
      this.rand = Math.random;
      this.visible = false;
      this.started = false;
      this.raf = 0;
      this.lt = 0;
      this._now = null;
      this._fl = 0;
      this.reduced = reduceMotion.matches;
      this.ro = null;
      this.io = null;
      this.pointerPath = [];
      this.lastPoint = null;
      this.lastActivation = 0;
      this.trailUid = 500000;

      this.onMove = (event) => {
        this.handleMove(event);
      };
      this.onLeave = () => {
        this.mx = null;
        this.lastPoint = null;
        this.pointerPath = [];
      };
      this.onDown = (event) => {
        this.handleDown(event);
      };
      this.cv.addEventListener("pointermove", this.onMove);
      this.cv.addEventListener("pointerleave", this.onLeave);
      this.cv.addEventListener("pointerdown", this.onDown);

      if (clearButton) clearButton.addEventListener("click", () => this.resetGarden());
      if (reduceMotion.addEventListener) {
        reduceMotion.addEventListener("change", (event) => {
          this.reduced = event.matches;
        });
      }
    }

    // ---------- math ----------
    h(n) {
      const x = Math.sin(n) * 43758.5453;
      return x - Math.floor(x);
    }

    spr(t, k = 7, w = 16) {
      if (t <= 0) return 0;
      return 1 - Math.exp(-t * k) * Math.cos(t * w);
    }

    eo(t) {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      return 1 - Math.pow(1 - t, 3);
    }

    rng(seed) {
      let s = seed | 0;
      return () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    bez(a, b, c, d, n) {
      const points = [];
      for (let i = 0; i <= n; i += 1) {
        const t = i / n;
        const u = 1 - t;
        points.push([
          u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
          u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]
        ]);
      }
      return points;
    }

    at(points, u) {
      const n = points.length;
      const i = Math.min(n - 2, Math.max(1, Math.round(u * (n - 1))));
      return [
        points[i],
        Math.atan2(points[i + 1][1] - points[i - 1][1], points[i + 1][0] - points[i - 1][0])
      ];
    }

    jit(id, f, amp) {
      if (!amp) return [0, 0, 0];
      return [
        (this.h(id * 1.37 + f * 7.13) * 2 - 1) * amp,
        (this.h(id * 2.71 + f * 3.11) * 2 - 1) * amp,
        (this.h(id * 5.3 + f * 1.7) * 2 - 1) * 0.035
      ];
    }

    path(c, points, closed) {
      const n = points.length;
      if (n < 2) return;
      const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (closed) {
        const start = mid(points[n - 1], points[0]);
        c.moveTo(start[0], start[1]);
        for (let i = 0; i < n; i += 1) {
          const next = mid(points[i], points[(i + 1) % n]);
          c.quadraticCurveTo(points[i][0], points[i][1], next[0], next[1]);
        }
        c.closePath();
      } else {
        c.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < n - 1; i += 1) {
          const next = mid(points[i], points[i + 1]);
          c.quadraticCurveTo(points[i][0], points[i][1], next[0], next[1]);
        }
        c.lineTo(points[n - 1][0], points[n - 1][1]);
      }
    }

    backend(g) {
      return {
        fill: (points, color) => {
          g.beginPath();
          this.path(g, points, true);
          g.fillStyle = color;
          g.fill();
        },
        stroke: (points, color, width) => {
          g.beginPath();
          this.path(g, points, false);
          g.strokeStyle = color;
          g.lineWidth = width;
          g.lineCap = "round";
          g.lineJoin = "round";
          g.stroke();
        },
        rect: (x, y, width, height, color) => {
          g.fillStyle = color;
          g.fillRect(x, y, width, height);
        },
        text: (character, x, y, size, color) => {
          g.font = `700 ${size}px ${FONT}`;
          g.textAlign = "center";
          g.textBaseline = "alphabetic";
          g.fillStyle = color;
          g.fillText(character, x, y);
        }
      };
    }

    vine(base, direction, length, amp, waves, phase, bend, n) {
      const steps = n || 40;
      const points = [[base[0], base[1]]];
      const step = length / steps;
      let x = base[0];
      let y = base[1];
      for (let i = 1; i <= steps; i += 1) {
        const u = i / steps;
        const angle =
          direction +
          bend * u +
          amp * Math.sin(u * Math.PI * waves + phase) * Math.min(1, u * 3);
        x += Math.cos(angle) * step;
        y += Math.sin(angle) * step;
        points.push([x, y]);
      }
      return points;
    }

    curl(points, sign, radius) {
      const n = points.length;
      const end = points[n - 1];
      const angle = Math.atan2(end[1] - points[n - 2][1], end[0] - points[n - 2][0]);
      const center = [
        end[0] - Math.sin(angle) * sign * radius,
        end[1] + Math.cos(angle) * sign * radius
      ];
      const start = Math.atan2(end[1] - center[1], end[0] - center[0]);
      for (let i = 1; i <= 14; i += 1) {
        const u = i / 14;
        const theta = start + sign * u * Math.PI * 1.6;
        const r = radius * (1 - 0.5 * u);
        points.push([center[0] + Math.cos(theta) * r, center[1] + Math.sin(theta) * r]);
      }
      return points;
    }

    weave(random, startLayer) {
      const cuts = [];
      const count = 1 + Math.floor(random() * 3);
      for (let i = 0; i < count; i += 1) cuts.push(0.15 + random() * 0.7);
      cuts.sort((a, b) => a - b);
      const segments = [];
      let from = 0;
      let layer = startLayer;
      for (const cut of cuts) {
        if (cut <= from) continue;
        segments.push({ u0: from, u1: cut, layer });
        if (random() < 0.3) {
          const gap = 0.02 + random() * 0.03;
          from = Math.min(0.98, cut + gap);
        } else {
          from = cut;
        }
        layer = 1 - layer;
      }
      segments.push({ u0: from, u1: 1, layer });
      return segments;
    }

    layerAt(segments, u) {
      for (const segment of segments) {
        if (u >= segment.u0 && u <= segment.u1) return segment.layer;
      }
      return segments[segments.length - 1].layer;
    }

    // ---------- layout ----------
    mw(character) {
      if (this.cache[character] != null) return this.cache[character];
      this.g.font = `700 100px ${FONT}`;
      let width = this.g.measureText(character).width / 100;
      if (character === " ") width *= 1.4;
      this.cache[character] = width;
      return width;
    }

    lineWidth(text) {
      return [...text].reduce((sum, character) => sum + this.mw(character), 0);
    }

    layoutFixed() {
      const maxWidth = this.W * 0.7;
      const widest = Math.max(...LINES.map((line) => this.lineWidth(line)));
      let size = Math.min(this.H * 0.2, maxWidth / Math.max(0.001, widest));
      size = Math.max(64, size);
      const gap = size * 1.3;
      const typeHeight = size * 0.78;
      const top = this.H * 0.5 - (gap + typeHeight) / 2;
      const firstBaseline = top + size * 0.78;
      return {
        size,
        baselines: [firstBaseline, firstBaseline + gap]
      };
    }

    resize() {
      const rect = section.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      this.W = rect.width;
      this.H = rect.height;
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.cv.width = Math.round(this.W * this.dpr);
      this.cv.height = Math.round(this.H * this.dpr);
      this.cache = {};
      if (this.started) this.resetGarden();
    }

    // ---------- growth ----------
    wordParams(seed) {
      const random = this.rng(seed * 7 + 13);
      const density = 1;
      return {
        roseP: 0.3 + random() * 0.3,
        leafy: (0.6 + random() * 0.8) * density,
        dens: density,
        lean: (random() - 0.5) * 0.6,
        big: 0.85 + random() * 0.45,
        curvy: 0.8 + random() * 0.6,
        bridgeP: Math.min(0.95, (0.45 + random() * 0.35) * density),
        w: 0.5
      };
    }

    grow(random, elements, nextId, params, options) {
      const tip =
        options.tip ||
        (random() < params.roseP
          ? "rose"
          : random() < 0.45
            ? "fan"
            : random() < 0.6
              ? "leaf"
              : "curl");
      let points =
        options.pts ||
        this.vine(
          options.base,
          options.dir,
          options.len,
          (0.35 + random() * 0.45) * params.curvy,
          1 + random() * 1.6,
          random() * 6.28,
          (random() - 0.5) * 1.2,
          40
        );
      if (tip === "curl") points = this.curl(points, random() < 0.5 ? -1 : 1, 0.05 + random() * 0.05);
      const segments = this.weave(
        random,
        options.layer0 != null ? options.layer0 : random() < 0.5 ? 0 : 1
      );
      const duration = Math.max(320, (options.len || 0.8) * 620);
      const thorns = [];
      const thornCount = Math.floor(random() * 2.5);
      for (let i = 0; i < thornCount; i += 1) {
        thorns.push({ u: 0.15 + random() * 0.65, s: random() < 0.5 ? -1 : 1 });
      }
      elements.push({
        t: "stem",
        id: nextId(),
        pts: points,
        segs: segments,
        d0: options.d0,
        dur: duration,
        w: options.depth ? 0.82 : 1,
        thorns
      });

      const leafCount = Math.floor(random() * 2.8 * params.leafy);
      let side = random() < 0.5 ? -1 : 1;
      for (let i = 0; i < leafCount; i += 1) {
        const u = 0.25 + random() * 0.6;
        const [point, angle] = this.at(points, u);
        side = -side;
        elements.push({
          t: "leaf",
          id: nextId(),
          x: point[0],
          y: point[1],
          a: angle + side * (0.55 + random() * 0.5),
          L: (0.14 + random() * 0.2) * (options.depth ? 0.8 : 1),
          bend: (random() - 0.5) * 1.2,
          layer: this.layerAt(segments, u),
          d0: options.d0 + duration * u
        });
      }

      const [tipPoint, tipAngle] = this.at(points, 1);
      const tipDelay = options.d0 + duration * 0.8;
      const tipLayer = this.layerAt(segments, 1);
      if (tip === "rose") {
        const radius = (0.13 + random() * 0.15) * params.big * (options.depth ? 0.75 : 1);
        const over =
          tipPoint[1] > -0.78 &&
          tipPoint[1] < 0.05 &&
          Math.abs(tipPoint[0]) < params.w * 0.5;
        const layer = over ? (random() < 0.22 ? 1 : 0) : random() < 0.6 ? 1 : tipLayer;
        elements.push({
          t: "rose",
          id: nextId(),
          x: tipPoint[0],
          y: tipPoint[1],
          R: radius,
          rot: (random() - 0.5) * 1.0,
          ph1: random() * 6.28,
          ph2: random() * 6.28,
          turns: 1.8 + random() * 1,
          layer,
          d0: tipDelay
        });
        if (random() < 0.2) {
          const offset = tipAngle + (random() < 0.5 ? 1 : -1) * 1.3;
          elements.push({
            t: "rose",
            id: nextId(),
            x: tipPoint[0] + Math.cos(offset) * radius * 1.4,
            y: tipPoint[1] + Math.sin(offset) * radius * 1.4,
            R: radius * (0.6 + random() * 0.3),
            rot: (random() - 0.5) * 1.2,
            ph1: random() * 6.28,
            ph2: random() * 6.28,
            turns: 1.8 + random(),
            layer,
            d0: tipDelay + 120
          });
        }
      } else if (tip === "fan") {
        const spread = 0.6 + random() * 0.3;
        for (let j = 0; j < 2; j += 1) {
          elements.push({
            t: "leaf",
            id: nextId(),
            x: tipPoint[0],
            y: tipPoint[1],
            a: tipAngle + (j - 0.5) * spread,
            L: 0.2 + random() * 0.2,
            bend: (j - 0.5) * 0.8,
            layer: tipLayer,
            d0: tipDelay + j * 60
          });
        }
      } else if (tip === "leaf") {
        elements.push({
          t: "leaf",
          id: nextId(),
          x: tipPoint[0],
          y: tipPoint[1],
          a: tipAngle + (random() - 0.5) * 0.3,
          L: 0.16 + random() * 0.16,
          bend: random() - 0.5,
          layer: tipLayer,
          d0: tipDelay
        });
      }

      if (!options.depth && random() < 0.3) {
        const u = 0.35 + random() * 0.35;
        const [point, angle] = this.at(points, u);
        this.grow(random, elements, nextId, params, {
          base: point,
          dir: angle + (random() < 0.5 ? -1 : 1) * (0.7 + random() * 0.4),
          len: (options.len || 0.8) * (0.35 + random() * 0.2),
          d0: options.d0 + duration * u,
          depth: 1,
          layer0: this.layerAt(segments, u)
        });
      }
      return points;
    }

    gen(letter) {
      const random = this.rng(
        (letter.ws ^ Math.imul(letter.wi + 1, 2654435761)) +
          Math.floor(this.rand() * 1e6)
      );
      const params = this.wordParams(letter.ws);
      const elements = [];
      let elementIndex = 0;
      const nextId = () => letter.id * 100 + elementIndex++;
      const width = this.mw(letter.ch);
      const inX = () => (random() - 0.5) * width * 0.7;
      params.w = width;

      const upwardCount = 1 + (random() < 0.45 * params.dens ? 1 : 0);
      for (let i = 0; i < upwardCount; i += 1) {
        this.grow(random, elements, nextId, params, {
          base: [inX(), -random() * 0.3],
          dir: -Math.PI / 2 + params.lean * 0.5 + (random() - 0.5) * 0.7,
          len: 0.6 + random() * 0.5,
          d0: 40 + i * 130,
          tip: letter.wi === 0 && i === 0 ? "rose" : null
        });
      }
      if (random() < 0.4 * params.dens) {
        this.grow(random, elements, nextId, params, {
          base: [inX(), -0.1 - random() * 0.35],
          dir: Math.PI / 2 + (random() - 0.5) * 0.8,
          len: 0.35 + random() * 0.35,
          d0: 160
        });
      }
      if (letter.prev && random() < params.bridgeP) {
        const previousX = -(this.mw(letter.prev.ch) + width) / 2;
        const a = [inX(), -0.05 - random() * 0.55];
        const b = [previousX + (random() - 0.5) * 0.25, -0.05 - random() * 0.55];
        const bulge = (random() < 0.55 ? -1 : 1) * (0.4 + random() * 0.4);
        const dx = b[0] - a[0];
        let points = this.bez(
          a,
          [a[0] + dx * 0.15, a[1] + bulge],
          [b[0] - dx * 0.15, b[1] + bulge * 0.9],
          b,
          40
        );
        if (random() < 0.45) {
          points = points.slice(0, Math.floor(points.length * (0.7 + random() * 0.2)));
        }
        this.grow(random, elements, nextId, params, {
          pts: points,
          len: Math.abs(dx) + Math.abs(bulge),
          d0: 90,
          tip: random() < 0.5 ? "curl" : random() < 0.5 ? "leaf" : "rose"
        });
      }
      if (letter.wi === 0) {
        this.grow(random, elements, nextId, params, {
          base: [-width * 0.3, -0.15 - random() * 0.4],
          dir: Math.PI + (random() - 0.5) * 1.2,
          len: 0.45 + random() * 0.3,
          d0: 120,
          tip: "curl"
        });
      }

      letter.els = elements;
      letter.endEls = null;
      const tendril = [];
      const tendrilRandom = this.rng(letter.id * 977 + Math.floor(this.rand() * 1e6));
      this.grow(
        tendrilRandom,
        tendril,
        () => letter.id * 100 + 90 + tendril.length,
        params,
        {
          base: [width * 0.25, -0.1 - tendrilRandom() * 0.45],
          dir: (tendrilRandom() - 0.5) * 1.4,
          len: 0.45 + tendrilRandom() * 0.25,
          d0: 0,
          tip: "curl",
          depth: 1
        }
      );
      letter.tend = tendril.filter((element) => element.t === "stem").slice(0, 1);
    }

    genEnd(letter, relativeBirth) {
      const random = this.rng(
        letter.ws + letter.wi * 31 + Math.floor(this.rand() * 1e6)
      );
      const params = this.wordParams(letter.ws);
      const elements = [];
      let elementIndex = 50;
      const nextId = () => letter.id * 100 + elementIndex++;
      const width = this.mw(letter.ch);
      const count = 1 + Math.floor(random() * 2.5);
      params.w = width;
      for (let i = 0; i < count; i += 1) {
        const direction =
          -Math.PI / 2 +
          0.6 +
          (i - (count - 1) / 2) * 0.9 +
          (random() - 0.5) * 0.4;
        this.grow(random, elements, nextId, params, {
          base: [(random() - 0.2) * width * 0.6, -random() * 0.5],
          dir: direction,
          len: 0.4 + random() * 0.45,
          d0: relativeBirth + 40 + i * 90,
          depth: 1,
          tip: i === 0 || random() < 0.5 ? "rose" : "fan"
        });
      }
      letter.endEls = elements;
    }

    buildLetters() {
      const layout = this.layoutFixed();
      const letters = [];
      let id = 1;

      LINES.forEach((text, lineIndex) => {
        const chars = [...text];
        const widths = chars.map((character) => this.mw(character) * layout.size);
        const total = widths.reduce((sum, width) => sum + width, 0);
        let x = this.W / 2 - total / 2;
        let inWord = false;
        let wordSeed = 0;
        let wordIndex = 0;
        let previous = null;

        chars.forEach((character, index) => {
          const width = widths[index];
          const letter = {
            ch: character,
            id: id++,
            birth: 0,
            tb: 0,
            els: [],
            endEls: null,
            tend: null,
            activated: false,
            x: x + width / 2,
            y: layout.baselines[lineIndex],
            tx: x + width / 2,
            ty: layout.baselines[lineIndex],
            tw: width,
            line: lineIndex,
            wi: 0,
            ws: 0,
            prev: null
          };

          if (character === " ") {
            if (previous) this.genEnd(previous, 60);
            inWord = false;
            previous = null;
          } else {
            if (!inWord) {
              wordSeed = Math.floor(Math.random() * 1e9);
              wordIndex = 0;
              inWord = true;
              previous = null;
            }
            letter.ws = wordSeed;
            letter.wi = wordIndex;
            letter.prev = previous;
            this.gen(letter);
            previous = letter;
            wordIndex += 1;
          }
          letters.push(letter);
          x += width;
        });
        if (previous) this.genEnd(previous, 60);
      });

      this.St = layout.size;
      this.Sd = layout.size;
      return { letters, size: layout.size };
    }

    // ---------- drawing primitives ----------
    strokeRange(B, points, a, b, color, width) {
      const n = points.length - 1;
      const from = a * n;
      const to = b * n;
      const lerpPoint = (t) => {
        const i = Math.min(n - 1, Math.floor(t));
        const f = t - i;
        return [
          points[i][0] + (points[i + 1][0] - points[i][0]) * f,
          points[i][1] + (points[i + 1][1] - points[i][1]) * f
        ];
      };
      const result = [lerpPoint(from)];
      for (let i = Math.floor(from) + 1; i < to; i += 1) result.push(points[i]);
      result.push(lerpPoint(to));
      if (result.length >= 2) B.stroke(result, color, width);
    }

    thorn(B, points, u, side, size) {
      const [point, angle] = this.at(points, u);
      const direction = angle + side * 2.3;
      const length = size * 0.045;
      B.stroke(
        [point, [point[0] + Math.cos(direction) * length, point[1] + Math.sin(direction) * length]],
        this.cc.blue,
        size * 0.022
      );
    }

    leaf(B, baseX, baseY, angle, length, bend) {
      if (length < 0.5) return;
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      const px = -sa;
      const py = ca;
      const axis = (u) => {
        const b = Math.sin(Math.PI * u) * bend * 0.15 * length;
        return [baseX + ca * u * length + px * b, baseY + sa * u * length + py * b];
      };
      const halfWidth = (u) => length * 0.18 * Math.sin(Math.PI * Math.pow(u, 0.8));
      const n = 12;
      const side1 = [];
      const side2 = [];
      for (let i = 0; i <= n; i += 1) {
        const u = i / n;
        const center = axis(u);
        const width = halfWidth(u);
        side1.push([center[0] + px * width, center[1] + py * width]);
        side2.push([center[0] - px * width, center[1] - py * width]);
      }
      const tip = axis(1);
      const base = axis(0);
      B.fill(
        [base, ...side1.slice(1, n), tip, tip, ...side2.slice(1, n).reverse(), base],
        this.cc.blue
      );
      if (length > 6) {
        const vein = [];
        for (let i = 0; i <= 8; i += 1) vein.push(axis(0.08 + (0.72 * i) / 8));
        B.stroke(vein, this.cc.vein, Math.max(0.8, length * 0.03));
      }
    }

    rose(B, cx, cy, radius, rotation, element, age, tilt) {
      const cosR = Math.cos(rotation);
      const sinR = Math.sin(rotation);
      const tiltLength = tilt ? Math.hypot(tilt[0], tilt[1]) : 0;
      const ux = tiltLength ? tilt[0] / tiltLength : 0;
      const uy = tiltLength ? tilt[1] / tiltLength : 0;
      const squash = -0.28 * tiltLength;
      const transform = (x, y, z = 0) => {
        let dx = x * cosR - y * sinR;
        let dy = x * sinR + y * cosR;
        if (tiltLength) {
          const k = (dx * ux + dy * uy) * squash;
          dx += k * ux + tilt[0] * radius * z;
          dy += k * uy + tilt[1] * radius * z;
        }
        return [cx + dx, cy + dy];
      };
      const petals = [
        [0, -0.36, 0.56, 0.54, 0, 0, 0],
        [-0.5, -0.06, 0.6, 0.6, -0.35, 0, 0],
        [0.52, -0.06, 0.6, 0.6, 0.35, 0, 0],
        [-0.42, 0.3, 0.62, 0.48, 0.2, 0.12, 1],
        [0.47, 0.3, 0.62, 0.48, -0.2, 0.12, 1],
        [0.05, 0.42, 0.56, 0.38, 0, 0.14, 0]
      ];
      const anchorX = 0;
      const anchorY = 0.5;
      const lineWidth = Math.max(0.8, radius * 0.045);
      const stagger = 85;

      petals.forEach((petal, index) => {
        const scale = this.spr((age - index * stagger) / 1000, 8, 14);
        if (scale <= 0.001) return;
        const open = (1 - Math.min(1, scale)) * (petal[0] < 0 ? 0.5 : -0.5);
        const petalAngle = petal[4] + open;
        const ca = Math.cos(petalAngle);
        const sa = Math.sin(petalAngle);
        const pointAt = (theta) => {
          const r =
            1 +
            0.08 * Math.sin(3 * theta + element.ph1 + index) +
            0.04 * Math.sin(5 * theta + element.ph2);
          const lx = Math.cos(theta) * petal[2] * r;
          const ly = Math.sin(theta) * petal[3] * r;
          const px = petal[0] + lx * ca - ly * sa;
          const py = petal[1] + lx * sa + ly * ca;
          return transform(
            (anchorX + (px - anchorX) * scale) * radius,
            (anchorY + (py - anchorY) * scale) * radius,
            petal[5]
          );
        };
        const points = [];
        for (let k = 0; k < 26; k += 1) points.push(pointAt((k / 26) * Math.PI * 2));
        B.fill(points, this.cc.red);
        if (petal[6] && radius >= 12 && scale > 0.4) {
          const arc = [];
          for (let k = 0; k <= 14; k += 1) arc.push(pointAt(Math.PI * (1.18 + (0.64 * k) / 14)));
          this.strokeRange(B, arc, 0, Math.min(1, (scale - 0.4) / 0.5), this.cc.line, lineWidth * 0.8);
        }
      });

      const spiralProgress = this.eo((age - petals.length * stagger - 80) / 520);
      if (spiralProgress > 0 && radius > 3) {
        const spiral = [];
        const turns =
          radius < 20 ? Math.min(element.turns, 1.3) : radius < 32 ? element.turns * 0.8 : element.turns;
        for (let i = 0; i <= 70; i += 1) {
          const u = i / 70;
          const theta = element.ph1 + u * turns * Math.PI * 2;
          const r = radius * (0.08 + 0.57 * u);
          spiral.push(
            transform(
              Math.cos(theta) * r * 1.05,
              Math.sin(theta) * r * 0.72 - 0.12 * radius,
              0.34 - 0.24 * u
            )
          );
        }
        this.strokeRange(B, spiral, 0, spiralProgress, this.cc.line, lineWidth);
        if (radius >= 14) {
          const scallop = [];
          for (let i = 0; i <= 36; i += 1) {
            const u = i / 36;
            scallop.push(
              transform(
                (-0.72 + 1.5 * u) * radius,
                0.36 * radius + 0.16 * radius * Math.abs(Math.sin(u * Math.PI * 3)),
                0.18
              )
            );
          }
          this.strokeRange(B, scallop, 0, spiralProgress, this.cc.line, lineWidth);
        }
      }
    }

    // ---------- per-frame rendering ----------
    pal() {
      const palette = PALETTES[this.paletteIndex] || PALETTES[0];
      return {
        bg: palette[1],
        C: {
          red: palette[2],
          blue: palette[3],
          line: palette[4],
          text: palette[5],
          vein: palette[1]
        }
      };
    }

    mainState() {
      return {
        letters: this.letters,
        S: this.Sd,
        C: this.pal().C,
        boil: !this.reduced,
        recoil: 20,
        speed: 1,
        wither: 260,
        face: true
      };
    }

    near(x, y) {
      return this.mx != null ? [this.mx, this.my] : null;
    }

    hitLetters(x, y) {
      const size = this.Sd || 1;
      const padX = size * 0.16;
      const padTop = size * 0.12;
      const padBottom = size * 0.13;
      const hits = [];
      for (const letter of this.letters) {
        if (letter.ch === " " || letter.activated) continue;
        const left = letter.x - letter.tw / 2 - padX;
        const right = letter.x + letter.tw / 2 + padX;
        const top = letter.y - size * 0.82 - padTop;
        const bottom = letter.y + size * 0.12 + padBottom;
        if (x >= left && x <= right && y >= top && y <= bottom) {
          hits.push({
            letter,
            distance: Math.hypot(letter.x - x, letter.y - size * 0.45 - y)
          });
        }
      }
      hits.sort((a, b) => a.distance - b.distance);
      return hits.slice(0, 3).map((hit) => hit.letter);
    }

    pushPathPoint(x, y) {
      const point = { x, y };
      this.pointerPath.push(point);
      while (this.pointerPath.length > 2) {
        let total = 0;
        for (let i = 1; i < this.pointerPath.length; i += 1) {
          total += Math.hypot(
            this.pointerPath[i].x - this.pointerPath[i - 1].x,
            this.pointerPath[i].y - this.pointerPath[i - 1].y
          );
        }
        if (total <= 220) break;
        this.pointerPath.shift();
      }
    }

    recentDirection() {
      const path = this.pointerPath;
      if (path.length < 2) return { x: 0, y: 0, length: 0 };
      const end = path[path.length - 1];
      let total = 0;
      let start = path[0];
      for (let i = path.length - 2; i >= 0; i -= 1) {
        total += Math.hypot(path[i + 1].x - path[i].x, path[i + 1].y - path[i].y);
        start = path[i];
        if (total >= 110) break;
      }
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      if (length < 4) return { x: 0, y: 0, length: 0 };
      return { x: dx / length, y: dy / length, length };
    }

    addGuideVine(letter, lean) {
      const random = this.rng(letter.id * 7919 + Math.floor(Math.random() * 1e6));
      const params = this.wordParams(letter.ws);
      const width = this.mw(letter.ch);
      params.w = width;
      const base = [(random() - 0.5) * width * 0.45, -random() * 0.24];
      const direction = -Math.PI / 2 + lean * 0.5;
      const points = this.vine(
        base,
        direction,
        0.58 + random() * 0.18,
        0.22 + random() * 0.06,
        1 + random() * 0.5,
        random() * 6.28,
        lean * 0.8,
        40
      );
      this.grow(random, letter.els, () => this.trailUid++, params, {
        pts: points,
        len: 0.58,
        d0: 0,
        tip: "curl",
        depth: 1,
        layer0: 0
      });
    }

    activateAt(x, y, now) {
      const hits = this.hitLetters(x, y);
      if (!hits.length) return false;
      const direction = this.recentDirection();
      const lean = Math.max(-0.45, Math.min(0.45, direction.x * 0.45));
      for (const letter of hits) {
        if (letter.activated) continue;
        const birth = Math.max(now, this.lastActivation + 28);
        this.lastActivation = birth;
        letter.activated = true;
        letter.birth = birth;
        letter.tb = birth;
        this.addGuideVine(letter, lean);
      }
      if (hint) hint.classList.add("gone");
      return true;
    }

    handleMove(event) {
      const rect = this.cv.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      this.mx = x;
      this.my = y;
      const now = performance.now();
      const last = this.lastPoint;
      if (!last) {
        this.lastPoint = { x, y };
        this.pushPathPoint(x, y);
        this.activateAt(x, y, now);
        return;
      }
      const dx = x - last.x;
      const dy = y - last.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 0.5) return;
      const count = Math.max(1, Math.ceil(distance / 5));
      for (let i = 1; i <= count; i += 1) {
        const t = i / count;
        const sampleX = last.x + dx * t;
        const sampleY = last.y + dy * t;
        this.pushPathPoint(sampleX, sampleY);
        this.activateAt(sampleX, sampleY, now);
      }
      this.lastPoint = { x, y };
    }

    handleDown(event) {
      const rect = this.cv.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      this.mx = x;
      this.my = y;
      this.lastPoint = { x, y };
      this.pushPathPoint(x, y);
      this.activateAt(x, y, performance.now());
      this.spawnFly(x, y);
    }

    faceTurn(element, x, y) {
      let wx = 0;
      let wy = 0;
      const pointer = this.near(x, y);
      if (pointer) {
        const dx = pointer[0] - x;
        const dy = pointer[1] - y;
        const distance = Math.hypot(dx, dy);
        const reach = 300;
        if (distance < reach && distance > 0.001) {
          const w = 1 - distance / reach;
          const s = w * w * (3 - 2 * w) * Math.min(1, distance / 40);
          wx = (dx / distance) * s;
          wy = (dy / distance) * s;
        }
      }
      const current = this.fa[element.id] || [0, 0];
      current[0] += (wx - current[0]) * 0.09;
      current[1] += (wy - current[1]) * 0.09;
      this.fa[element.id] = current;
      return current;
    }

    wpt(st, letter, x, y) {
      if (letter.birth != null && this._now != null) {
        const t = ((this._now - letter.birth) * (st.speed || 1)) / 1000;
        if (t > 0 && t < 2.5) {
          const height = Math.max(0, (letter.y - y) / st.S);
          const damping = Math.exp(-t * 3.2);
          const direction = letter.id % 2 ? 1 : -1;
          x += st.S * 0.07 * height * damping * Math.sin(t * 11) * direction;
          y += st.S * 0.035 * height * damping * Math.sin(t * 11 + 1.2);
        }
      }
      if (st.face && letter.lean) {
        const height = Math.min(2.5, Math.max(0, (letter.y - y) / st.S));
        const f = height * height * 0.5 + height * 0.5;
        x += letter.lean[0] * st.S * 0.1 * f;
        y += letter.lean[1] * st.S * 0.05 * f;
      }
      return [x, y];
    }

    drawStem(B, element, letter, age, fade, st, frame, amp, layer, progressOverride) {
      const size = st.S;
      const progress =
        progressOverride != null
          ? progressOverride
          : this.eo((age - element.d0) / element.dur) * fade;
      if (progress <= 0) return;
      const jitter = this.jit(element.id, frame, amp);
      const points = element.pts.map((point) =>
        this.wpt(
          st,
          letter,
          letter.x + point[0] * size + jitter[0],
          letter.y + point[1] * size + jitter[1]
        )
      );
      for (const segment of element.segs) {
        if (segment.layer !== layer) continue;
        const end = Math.min(segment.u1, progress);
        if (end <= segment.u0) continue;
        this.strokeRange(B, points, segment.u0, end, st.C.blue, size * 0.022 * (element.w || 1));
      }
      for (const thorn of element.thorns) {
        if (progress > thorn.u && this.layerAt(element.segs, thorn.u) === layer) {
          this.thorn(B, points, thorn.u, thorn.s, size);
        }
      }
    }

    drawEl(B, element, letter, age, fade, st, frame, amp) {
      const size = st.S;
      const jitter = this.jit(element.id, frame, amp);
      const world = (x, y) =>
        this.wpt(
          st,
          letter,
          letter.x + x * size + jitter[0],
          letter.y + y * size + jitter[1]
        );
      if (element.t === "leaf") {
        const scale = this.spr((age - element.d0) / 1000, 7, 15) * fade;
        if (scale <= 0) return;
        const point = world(element.x, element.y);
        this.leaf(B, point[0], point[1], element.a + jitter[2], element.L * size * scale, element.bend);
      } else if (element.t === "rose") {
        const localAge = age - element.d0;
        if (localAge < 0 || fade <= 0.001) return;
        const point = world(element.x, element.y);
        const tilt = st.face ? this.faceTurn(element, point[0], point[1]) : null;
        if ((st.face || st.perchOn) && !letter.dead && localAge > 700) {
          this.perch.push({
            id: element.id,
            x: point[0],
            y: point[1],
            R: element.R * size * fade
          });
        }
        this.rose(
          B,
          point[0],
          point[1],
          element.R * size * fade,
          element.rot + jitter[2] + (tilt ? tilt[0] * 0.22 : 0),
          element,
          localAge,
          tilt
        );
      }
    }

    render(B, now, st) {
      const size = st.S;
      const letters = st.letters;
      const active = letters.filter((letter) => !letter.dead);
      const speed = st.speed || 1;
      this.cc = st.C;
      this._now = now;
      if (st.face) this.perch = [];

      if (st.face) {
        for (const letter of letters) {
          let targetX = 0;
          let targetY = 0;
          const pointer =
            !letter.dead && letter.ch !== " "
              ? this.near(letter.x, letter.y - size * 0.6)
              : null;
          if (pointer) {
            const dx = pointer[0] - letter.x;
            const dy = pointer[1] - (letter.y - size * 0.6);
            const distance = Math.hypot(dx, dy);
            const reach = Math.max(260, size * 3.2);
            if (distance < reach && distance > 1) {
              const w = 1 - distance / reach;
              const s = w * w * (3 - 2 * w);
              targetX = (dx / distance) * s;
              targetY = (dy / distance) * s;
            }
          }
          const lean = letter.lean || (letter.lean = [0, 0]);
          lean[0] += (targetX - lean[0]) * 0.07;
          lean[1] += (targetY - lean[1]) * 0.07;
        }
      }

      const frame = st.boil ? Math.floor(now / 120) : 0;
      const amp = st.boil ? Math.max(0.8, size * 0.01) : 0;
      const fade = (letter) =>
        letter.dead ? 1 - this.eo((now - letter.dead) / st.wither) : 1;

      const draw = (layer) => {
        for (const letter of letters) {
          if (letter.ch === " " || !letter.els || !letter.activated) continue;
          const age = (now - letter.birth) * speed;
          if (age < 0) continue;
          const fadeValue = fade(letter);
          const each = (element) => {
            if (element.t === "stem") {
              this.drawStem(B, element, letter, age, fadeValue, st, frame, amp, layer);
            } else if (element.layer === layer) {
              this.drawEl(B, element, letter, age, fadeValue, st, frame, amp);
            }
          };
          letter.els.forEach(each);
          if (letter.endEls) letter.endEls.forEach(each);

          const index = active.indexOf(letter);
          const next = index >= 0 ? active[index + 1] : null;
          if (
            letter.tend &&
            (letter.dead ||
              !next ||
              next.ch === " " ||
              next.line !== letter.line)
          ) {
            let progress = this.eo(((now - letter.tb) * speed - 150) / 450);
            if (letter.cut != null) {
              progress *=
                1 -
                this.eo(((now - letter.cut) * speed) / 150) *
                  Math.min(0.85, st.recoil / (0.6 * size));
            }
            for (const element of letter.tend) {
              this.drawStem(
                B,
                element,
                letter,
                age,
                fadeValue,
                st,
                frame,
                amp,
                layer,
                progress * fadeValue
              );
            }
          }
        }
      };

      draw(0);
      for (const letter of letters) {
        if (letter.ch !== " ") {
          B.text(letter.ch, letter.x, letter.y, size, st.C.text);
        }
      }
      draw(1);
    }

    // ---------- butterflies ----------
    spawnFly(cx, cy) {
      if (this.flies.length >= 6) {
        const oldest = this.flies.find((fly) => fly.st !== "leave");
        if (oldest) this.flyOff(oldest);
      }
      const taken = new Set(
        this.flies.filter((fly) => fly.st !== "leave").map((fly) => fly.pid)
      );
      let best = null;
      let bestDistance = 1e9;
      for (const perch of this.perch) {
        if (taken.has(perch.id)) continue;
        const distance = Math.hypot(perch.x - cx, perch.y - cy);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = perch;
        }
      }
      const left = cx < this.W / 2;
      const size = Math.max(9, this.Sd * 0.09);
      this.flies.push({
        x: left ? -40 : this.W + 40,
        y: cy + (Math.random() - 0.5) * this.H * 0.4,
        vx: 0,
        vy: 0,
        st: best ? "fly" : "wander",
        pid: best ? best.id : null,
        hx: cx,
        hy: cy,
        t0: performance.now(),
        ph: Math.random() * 6,
        sz: size,
        seed: Math.random() * 100,
        ang: 0
      });
    }

    flyOff(fly) {
      fly.st = "leave";
      fly.pid = null;
      fly.ex = fly.x < this.W / 2 ? -80 : this.W + 80;
      fly.ey = fly.y - this.H * 0.3;
    }

    drawFlies(B, now, C) {
      const dt = Math.min(48, now - (this._fl || now));
      this._fl = now;
      const byId = {};
      for (const perch of this.perch) byId[perch.id] = perch;
      this.flies = this.flies.filter((fly) => {
        const t = (now - fly.t0) / 1000;
        let tx;
        let ty;
        if (fly.st === "sit" || fly.st === "fly") {
          const perch = byId[fly.pid];
          if (!perch) {
            this.flyOff(fly);
          } else {
            tx = perch.x + perch.R * 0.05;
            ty = perch.y - perch.R * 0.55;
          }
        }
        if (fly.st === "wander") {
          tx = fly.hx + Math.sin(t * 1.3 + fly.seed) * 70;
          ty = fly.hy + Math.sin(t * 2.1 + fly.seed) * 40;
          if (t > 3.5) this.flyOff(fly);
        }
        if (fly.st === "leave") {
          tx = fly.ex;
          ty = fly.ey;
        }
        if (fly.st === "sit") {
          fly.x += (tx - fly.x) * 0.35;
          fly.y += (ty - fly.y) * 0.35;
          fly.ang *= 0.85;
          fly.ph += dt * 0.004;
          const burst = Math.sin((now / 1000) * 0.9 + fly.seed) > 0.75;
          fly.open = burst
            ? 0.2 + 0.8 * Math.abs(Math.cos((now / 1000) * 9 + fly.seed))
            : 0.25 + 0.15 * Math.sin(fly.ph);
        } else {
          const dx = tx - fly.x;
          const dy = ty - fly.y;
          const distance = Math.hypot(dx, dy) || 1;
          const speed =
            fly.st === "leave"
              ? 0.42
              : Math.min(0.34, 0.06 + distance * 0.0016);
          const flutter = Math.sin(t * 7 + fly.seed) * 0.12;
          const wobble = Math.cos(t * 4.3 + fly.seed) * 0.1;
          const ax = (dx / distance) * speed + wobble - fly.vx;
          const ay = (dy / distance) * speed + flutter - fly.vy;
          fly.vx += ax * 0.06 * (dt / 16);
          fly.vy += ay * 0.06 * (dt / 16);
          fly.x += fly.vx * dt;
          fly.y += fly.vy * dt + Math.sin(t * 13 + fly.seed) * 0.6;
          fly.ang +=
            (Math.max(-0.5, Math.min(0.5, fly.vx * 1.4)) - fly.ang) * 0.1;
          fly.open = Math.abs(Math.cos(t * 17 + fly.seed));
          if (fly.st === "fly" && distance < 5) {
            fly.st = "sit";
            fly.ph = 0;
          }
          if (
            fly.st === "leave" &&
            (fly.x < -60 || fly.x > this.W + 60 || fly.y < -60)
          ) {
            return false;
          }
        }
        this.butterfly(B, fly.x, fly.y, fly.sz, fly.ang, fly.open, C);
        return true;
      });
    }

    butterfly(B, x, y, scale, angle, open, C) {
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      const transform = (px, py) => [
        x + (px * ca - py * sa) * scale,
        y + (px * sa + py * ca) * scale
      ];
      const wing = (cx, cy, rx, ry, angleValue, side) => {
        const points = [];
        const c = Math.cos(angleValue);
        const sn = Math.sin(angleValue);
        for (let k = 0; k < 22; k += 1) {
          const theta = (k / 22) * Math.PI * 2;
          const r = 1 + 0.08 * Math.sin(theta * 3);
          const lx = Math.cos(theta) * rx * r;
          const ly = Math.sin(theta) * ry * r;
          points.push(
            transform(
              side * (cx + lx * c - ly * sn) * (0.12 + 0.88 * open),
              cy + lx * sn + ly * c
            )
          );
        }
        return points;
      };
      for (const side of [-1, 1]) {
        B.fill(wing(0.46, 0.28, 0.36, 0.3, 0.5 * side * side, side), C.text);
        B.fill(wing(0.55, -0.32, 0.55, 0.36, -0.55, side), C.text);
        if (open > 0.35) {
          B.fill(wing(0.66, -0.4, 0.13, 0.11, 0, side), C.red);
        }
      }
      const body = [];
      for (let k = 0; k < 18; k += 1) {
        const theta = (k / 18) * Math.PI * 2;
        body.push(transform(Math.cos(theta) * 0.08, Math.sin(theta) * 0.48));
      }
      B.fill(body, C.blue);
      const lineWidth = Math.max(0.8, scale * 0.05);
      B.stroke(
        [transform(0, -0.42), transform(-0.14, -0.72), transform(-0.24, -0.86)],
        C.blue,
        lineWidth
      );
      B.stroke(
        [transform(0, -0.42), transform(0.14, -0.72), transform(0.24, -0.86)],
        C.blue,
        lineWidth
      );
    }

    // ---------- lifecycle ----------
    resetGarden() {
      if (!this.W || !this.H) return;
      const now = performance.now();
      this.letters = [];
      this.flies = [];
      this.perch = [];
      this.fa = {};
      this.pointerPath = [];
      this.lastPoint = null;
      this.lastActivation = 0;
      this.trailUid = 500000;
      this._fl = now;
      this.lt = now;
      this._now = null;
      const built = this.buildLetters();
      this.letters = built.letters;
      this.started = true;
      if (hint) {
        hint.classList.remove("gone");
      }
      this.paint(now);
      this.wakeLoop();
    }

    paint(now) {
      if (!this.W || !this.H) return;
      const dpr = this.dpr;
      this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const colors = this.pal();
      this.g.fillStyle = colors.bg;
      this.g.fillRect(0, 0, this.W, this.H);
      const B = this.backend(this.g);
      const st = this.mainState();
      this.render(B, now, st);
      this.drawFlies(B, now, st.C);
    }

    wakeLoop() {
      if (this.raf) return;
      const tick = (now) => {
        if (!this.visible) {
          this.raf = 0;
          return;
        }
        const dt = Math.min(64, now - (this.lt || now));
        this.lt = now;
        this.Sd += (this.St - this.Sd) * (1 - Math.exp(-dt / 80));
        this._now = now;
        this.paint(now);
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }

    stopLoop() {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
    }

    observe() {
      this.onScroll = () => {
        if (!this.started) this.startIfVisible();
      };
      window.addEventListener("scroll", this.onScroll, { passive: true });

      if ("IntersectionObserver" in window) {
        this.io = new IntersectionObserver(
          (entries) => {
            this.visible = entries[0].isIntersecting;
            if (this.visible) {
              if (!this.started) this.resetGarden();
              this.wakeLoop();
            } else {
              this.stopLoop();
            }
          },
          { threshold: 0.08 }
        );
        this.io.observe(section);
      } else {
        this.visible = true;
        this.resetGarden();
      }

      if ("ResizeObserver" in window) {
        this.ro = new ResizeObserver(() => {
          cancelAnimationFrame(this.resizeFrame);
          this.resizeFrame = requestAnimationFrame(() => this.resize());
        });
        this.ro.observe(section);
      } else {
        window.addEventListener("resize", () => this.resize());
      }
    }

    startIfVisible() {
      const rect = section.getBoundingClientRect();
      if (rect.width && rect.height && rect.top < window.innerHeight && rect.bottom > 0) {
        this.visible = true;
        if (!this.started) this.resetGarden();
        this.wakeLoop();
      }
    }

    async boot() {
      try {
        if (document.fonts && document.fonts.load) {
          const loaded = document.fonts.load(`700 100px "Playfair Display"`);
          await Promise.race([
            loaded,
            new Promise((resolve) => setTimeout(resolve, 1200))
          ]);
          this.cache = {};
        }
      } catch (error) {
        this.cache = {};
      }
      this.resize();
      this.observe();
      this.startIfVisible();
      this.wakeLoop();
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          this.cache = {};
          if (this.started) this.resize();
        });
      }
    }
  }

  const paletteName = (index) => PALETTES[index] || PALETTES[0];

  function buildPalette(garden) {
    PALETTES.forEach(([name, background, flower], index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "flow-swatch";
      button.setAttribute("aria-label", name);
      button.setAttribute("aria-pressed", "false");
      button.title = name;
      button.style.background = background;
      const dot = document.createElement("i");
      dot.style.background = flower;
      button.appendChild(dot);
      button.addEventListener("click", () => {
        garden.paletteIndex = index;
        const palette = paletteName(index);
        section.style.setProperty("--garden-bg", palette[1]);
        section.style.setProperty("--garden-fg", palette[5]);
        section.style.setProperty("--garden-line", palette[4]);
        section.style.setProperty("--garden-accent", palette[2]);
        [...paletteWrap.children].forEach((swatch, swatchIndex) => {
          swatch.setAttribute("aria-pressed", String(swatchIndex === index));
        });
        if (garden.visible) garden.wakeLoop();
      });
      paletteWrap.appendChild(button);
    });
  }

  const garden = new TypeGarden();
  if (!garden.g) return;
  buildPalette(garden);
  garden.paletteIndex = 1;
  const initialPalette = paletteName(1);
  section.style.setProperty("--garden-bg", initialPalette[1]);
  section.style.setProperty("--garden-fg", initialPalette[5]);
  section.style.setProperty("--garden-line", initialPalette[4]);
  section.style.setProperty("--garden-accent", initialPalette[2]);
  [...paletteWrap.children][1]?.setAttribute("aria-pressed", "true");
  if (/[?&]garden-debug/.test(location.search)) window.__garden = garden;
  garden.boot();
})();
