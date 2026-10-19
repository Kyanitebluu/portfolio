(() => {
  "use strict";

  const PHOTOS = [
    { src: "p01", ar: 1.786, wall: 0, x: 5, y: 7, w: 26, rot: -0.25 },
    { src: "p02", ar: 0.561, wall: 0, x: 12.5, y: 49.3, w: 11, rot: 0.35 },
    { src: "p03", ar: 1.786, wall: 0, x: 38, y: 59.4, w: 24, rot: -0.2 },
    { src: "p04", ar: 0.667, wall: 0, x: 44.5, y: 10, w: 11, rot: 0.3 },
    { src: "p05", ar: 1.5, wall: 0, x: 69.5, y: 6, w: 25, rot: 0.18 },
    { src: "p06", ar: 0.667, wall: 0, x: 76.5, y: 56, w: 11, rot: -0.24 },

    { src: "p07", ar: 0.56, wall: 1, x: 12.5, y: 49.3, w: 11, rot: -0.2 },
    { src: "p08", ar: 1.5, wall: 1, x: 5, y: 7, w: 26, rot: 0.2 },
    { src: "p09", ar: 0.667, wall: 1, x: 44.5, y: 10, w: 11, rot: -0.3 },
    { src: "p10", ar: 1.786, wall: 1, x: 38, y: 59.4, w: 24, rot: 0.16 },
    { src: "p11", ar: 0.759, wall: 1, x: 76.2, y: 58.8, w: 11.5, rot: -0.2 },
    { src: "p12", ar: 1.5, wall: 1, x: 69.5, y: 6, w: 25, rot: 0.22 },

    { src: "p13", ar: 0.599, wall: 2, x: 12.5, y: 52, w: 11, rot: 0.2 },
    { src: "p14", ar: 1.401, wall: 2, x: 5, y: 7, w: 26, rot: -0.2 },
    { src: "p15", ar: 0.67, wall: 2, x: 44.5, y: 10, w: 11, rot: 0.3 },
    { src: "p16", ar: 1.786, wall: 2, x: 38, y: 59.4, w: 24, rot: -0.15 },
    { src: "p17", ar: 0.759, wall: 2, x: 76.2, y: 58.8, w: 11.5, rot: 0.24 },
    { src: "p18", ar: 1.5, wall: 2, x: 69.5, y: 6, w: 25, rot: -0.2 },

    { src: "p19", ar: 0.667, wall: 3, x: 12.5, y: 56, w: 11, rot: -0.28 },
    { src: "p20", ar: 1.333, wall: 3, x: 5, y: 7, w: 26, rot: 0.18 },
    { src: "p21", ar: 1.5, wall: 3, x: 38, y: 54, w: 24, rot: -0.2 },
    { src: "p22", ar: 0.666, wall: 3, x: 44.5, y: 10, w: 11, rot: 0.3 },
    { src: "p23", ar: 1.782, wall: 3, x: 69.5, y: 6, w: 25, rot: -0.18 },
    { src: "p24", ar: 0.666, wall: 3, x: 76.5, y: 55.9, w: 11, rot: 0.22 },

    { src: "p25", ar: 1.5, wall: 4, x: 5, y: 7, w: 26, rot: -0.2 },
    { src: "p26", ar: 0.75, wall: 4, x: 44.5, y: 56.8, w: 11, rot: 0.28 },
    { src: "p27", ar: 1.784, wall: 4, x: 37.5, y: 10, w: 25, rot: -0.24 },
    { src: "p28", ar: 1.333, wall: 4, x: 6, y: 52.7, w: 24, rot: 0.2 },
    { src: "p29", ar: 1.778, wall: 4, x: 70, y: 6, w: 24, rot: -0.18 },
    { src: "p30", ar: 1.5, wall: 4, x: 69.5, y: 55.6, w: 25, rot: 0.22 }
  ];

  const STILLS = [
    { src: "still01", w: 1600, h: 923 },
    { src: "still02", w: 922, h: 1600 },
    { src: "still03", w: 832, h: 1344 },
    {
      src: "still04",
      w: 1179,
      h: 953,
      href: "https://b23.tv/AZzPBLh",
      label: "《赎罪》预告片，打开 Bilibili 观看"
    },
    { src: "still05", w: 1600, h: 738 },
    { src: "still06", w: 1600, h: 901 }
  ];

  const WALL_COUNT = 5;
  const STEP = 360 / WALL_COUNT;
  const WALL_WIDTH = 1500;
  const WALL_HEIGHT = 706;
  const WALL_RADIUS = WALL_WIDTH / (2 * Math.tan(Math.PI / WALL_COUNT));
  const LAMP_COUNT = 7;
  const WALL_ORDER = [4, 3, 0, 1, 2];

  const stage = document.getElementById("photoRoom");
  const perspective = document.getElementById("roomPerspective");
  const room = document.getElementById("photoRoomStage");
  const dim = document.getElementById("roomDim");
  const beam = document.getElementById("roomBeam");
  const dotsHost = document.getElementById("roomDots");
  const leftButton = document.querySelector('[data-turn="left"]');
  const rightButton = document.querySelector('[data-turn="right"]');

  if (!stage || !perspective || !room) return;

  const walls = [];
  const lamps = [];
  const dots = [];
  let view = 0;
  let yaw = view * STEP;
  let perspectiveSize = 445;
  let litLamp = null;
  let leaveTimer = 0;

  for (let wallIndex = 0; wallIndex < WALL_COUNT; wallIndex += 1) {
    const sourceWall = WALL_ORDER[wallIndex];
    const wall = document.createElement("div");
    wall.className = "room-wall";
    wall.dataset.wall = String(wallIndex);
    wall.dataset.sourceWall = String(sourceWall);
    wall.style.transform =
      `rotateY(${-wallIndex * STEP}deg) translateZ(${-WALL_RADIUS}px)`;

    const rail = document.createElement("div");
    rail.className = "room-rail";
    const wallLamps = [];
    for (let lampIndex = 0; lampIndex < LAMP_COUNT; lampIndex += 1) {
      const x = 150 + lampIndex * 200;
      const lamp = document.createElement("div");
      lamp.className = "room-lamp";
      lamp.style.left = `${x}px`;
      lamp.innerHTML = "<i></i><b></b>";
      rail.appendChild(lamp);
      wallLamps.push({ el: lamp, x });
    }
    wall.appendChild(rail);
    lamps.push(wallLamps);

    PHOTOS.filter((photo) => photo.wall === sourceWall).forEach((photo) => {
      const number = PHOTOS.indexOf(photo) + 1;
      const figure = document.createElement("figure");
      figure.className = "room-art";
      figure.dataset.wall = String(wallIndex);
      figure.tabIndex = 0;
      figure.style.setProperty("--x", photo.x);
      figure.style.setProperty("--y", photo.y);
      figure.style.setProperty("--w", photo.w);
      figure.style.setProperty("--ar", photo.ar);
      figure.style.setProperty("--rot", `${photo.rot}deg`);
      figure.style.setProperty("--d", `${8 + ((number * 1.3) % 5)}s`);
      figure.style.setProperty("--dl", `${-number * 1.4}s`);

      const image = document.createElement("img");
      image.src = `assets/images/photography/${photo.src}.webp`;
      image.alt = `摄影作品，第 ${number} 张`;
      image.loading = "eager";
      image.decoding = "async";
      image.draggable = false;

      figure.appendChild(image);
      figure.addEventListener("pointerenter", () => lightArt(figure));
      figure.addEventListener("pointerleave", unlight);
      figure.addEventListener("focus", () => lightArt(figure));
      figure.addEventListener("blur", unlight);
      wall.appendChild(figure);
    });

    room.appendChild(wall);
    walls.push(wall);
  }

  const floor = document.createElement("div");
  floor.className = "room-floor";
  const ceiling = document.createElement("div");
  ceiling.className = "room-ceiling";
  room.append(floor, ceiling);

  if (dotsHost) {
    for (let index = 0; index < WALL_COUNT; index += 1) {
      const dot = document.createElement("button");
      dot.className = "room-dot";
      dot.type = "button";
      dot.setAttribute("aria-label", `看第 ${index + 1} 面墙`);
      dot.addEventListener("click", () => show(index));
      dotsHost.appendChild(dot);
      dots.push(dot);
    }
  }

  function applyRoom() {
    room.style.transform = `translateZ(${perspectiveSize.toFixed(1)}px) rotateY(${yaw}deg)`;
  }

  function fitRoom() {
    const scale = Math.min(
      (0.95 * stage.clientWidth) / WALL_WIDTH,
      (0.82 * stage.clientHeight) / WALL_HEIGHT
    );
    perspectiveSize = WALL_RADIUS * scale;
    perspective.style.perspective = `${perspectiveSize.toFixed(1)}px`;
    applyRoom();
  }

  function paintControls() {
    if (leftButton) leftButton.disabled = false;
    if (rightButton) rightButton.disabled = false;
    dots.forEach((dot, index) => {
      if (index === view) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
    walls.forEach((wall, index) => {
      wall.setAttribute("aria-hidden", index === view ? "false" : "true");
      wall.querySelectorAll(".room-art").forEach((art) => {
        art.tabIndex = index === view ? 0 : -1;
      });
    });
  }

  function show(index) {
    const nextView = ((index % WALL_COUNT) + WALL_COUNT) % WALL_COUNT;
    if (nextView === view) return;

    const previousView = view;
    const baseYaw = nextView * STEP;
    const turns = Math.round((yaw - baseYaw) / 360);
    const nextYaw = baseYaw + turns * 360;
    const direction = nextYaw > yaw ? "right" : "left";

    room.classList.remove("turn-left", "turn-right");
    room.classList.add(direction === "right" ? "turn-right" : "turn-left");
    walls.forEach((wall) => wall.classList.remove("is-leaving"));

    const previousWall = walls[previousView];
    const nextWall = walls[nextView];
    previousWall.classList.remove("is-current");
    previousWall.classList.add("is-leaving");

    view = nextView;
    yaw = nextYaw;
    unlight();
    applyRoom();
    paintControls();

    nextWall.classList.add("is-current");

    window.clearTimeout(leaveTimer);
    leaveTimer = window.setTimeout(() => {
      previousWall.classList.remove("is-leaving");
    }, 1180);
  }

  function unlight() {
    dim.classList.remove("on");
    beam.classList.remove("on");
    if (litLamp) {
      litLamp.el.classList.remove("on");
      litLamp = null;
    }
  }

  function lightArt(artwork) {
    if (artwork.closest(".room-wall")?.getAttribute("aria-hidden") !== "false") return;
    const wallIndex = Number(artwork.dataset.wall);
    const centerPercent =
      Number(artwork.style.getPropertyValue("--x")) +
      Number(artwork.style.getPropertyValue("--w")) / 2;
    const centerX = (centerPercent / 100) * WALL_WIDTH;
    let nearest = lamps[wallIndex][0];
    lamps[wallIndex].forEach((lamp) => {
      if (Math.abs(lamp.x - centerX) < Math.abs(nearest.x - centerX)) {
        nearest = lamp;
      }
    });

    if (litLamp && litLamp !== nearest) litLamp.el.classList.remove("on");
    litLamp = nearest;
    nearest.el.classList.add("on");

    const artRect = artwork.getBoundingClientRect();
    const lampRect = nearest.el.querySelector("b").getBoundingClientRect();
    const sx = lampRect.left + lampRect.width / 2;
    const sy = lampRect.bottom - 4;
    const cx = artRect.left + artRect.width / 2;
    const cy = artRect.top + artRect.height / 2;
    const big = Math.max(artRect.width, artRect.height);

    dim.style.setProperty("--cx", `${cx}px`);
    dim.style.setProperty("--cy", `${cy}px`);
    dim.style.setProperty("--rx", `${big * 1.2 + 160}px`);
    dim.style.setProperty("--ry", `${big + 150}px`);

    const corners = [
      [artRect.left, artRect.top],
      [artRect.right, artRect.top],
      [artRect.right, artRect.bottom],
      [artRect.left, artRect.bottom]
    ]
      .map((corner) => ({
        point: corner,
        angle: Math.atan2(corner[1] - sy, corner[0] - sx)
      }))
      .sort((a, b) => a.angle - b.angle);
    const first = corners[0].point;
    const last = corners[corners.length - 1].point;
    const distance = Math.hypot(cx - sx, cy - sy) + big;

    beam.style.clipPath =
      `polygon(${sx}px ${sy}px, ${first[0]}px ${first[1]}px, ${last[0]}px ${last[1]}px)`;
    beam.style.background =
      `radial-gradient(circle at ${sx}px ${sy}px, rgba(255,232,176,.3) 0, rgba(255,232,176,0) ${distance}px)`;
    dim.classList.add("on");
    beam.classList.add("on");
  }

  leftButton?.addEventListener("click", () => show(view - 1));
  rightButton?.addEventListener("click", () => show(view + 1));

  stage.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      show(view - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      show(view + 1);
    }
  });

  window.addEventListener("resize", () => {
    unlight();
    fitRoom();
  });
  window.addEventListener("scroll", unlight, { passive: true });

  /* Moving image contact sheet */

  const stillTrack = document.getElementById("stillTrack");
  if (stillTrack) {
    STILLS.forEach((still) => {
      const frame = document.createElement(still.href ? "a" : "figure");
      frame.className = `still-frame${still.href ? " still-frame--link" : ""}`;
      if (still.href) {
        frame.href = still.href;
        frame.target = "_blank";
        frame.rel = "noopener noreferrer";
        frame.setAttribute("aria-label", still.label);
      }

      const image = document.createElement("img");
      image.src = `assets/images/video-stills/${still.src}.webp`;
      image.alt = still.label || "动态影像截图";
      image.width = still.w;
      image.height = still.h;
      image.loading = "lazy";
      image.decoding = "async";
      image.draggable = false;

      frame.appendChild(image);
      stillTrack.appendChild(frame);
    });
  }

  const rail = document.getElementById("stillRail");
  if (rail) {
    let railDrag = null;

    rail.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      railDrag = {
        id: event.pointerId,
        x: event.clientX,
        left: rail.scrollLeft,
        moved: false
      };
      rail.dataset.dragged = "0";
    });

    rail.addEventListener("pointermove", (event) => {
      if (!railDrag || railDrag.id !== event.pointerId) return;
      const distance = event.clientX - railDrag.x;
      if (!railDrag.moved) {
        if (Math.abs(distance) < 4) return;
        railDrag.moved = true;
        rail.dataset.dragged = "1";
        rail.classList.add("is-dragging");
        rail.setPointerCapture(event.pointerId);
      }
      rail.scrollLeft = railDrag.left - distance;
    });

    const stopRailDrag = (event) => {
      if (railDrag?.moved && rail.hasPointerCapture(event.pointerId)) {
        rail.releasePointerCapture(event.pointerId);
      }
      railDrag = null;
      rail.classList.remove("is-dragging");
    };

    rail.addEventListener("pointerup", stopRailDrag);
    rail.addEventListener("pointercancel", stopRailDrag);
    rail.addEventListener(
      "click",
      (event) => {
        if (rail.dataset.dragged === "1") {
          event.preventDefault();
          event.stopPropagation();
          rail.dataset.dragged = "0";
        }
      },
      true
    );
  }

  walls[view]?.classList.add("is-current");
  paintControls();
  room.classList.add("no-transition");
  fitRoom();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => room.classList.remove("no-transition"));
  });

  if (document.fonts?.ready) {
    document.fonts.ready.then(fitRoom);
  }
})();
