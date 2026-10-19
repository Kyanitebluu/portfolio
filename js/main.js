(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const canHover = window.matchMedia("(hover: hover)").matches;

  /* Intro: typing and red strike-throughs */

  const typedIntro = document.getElementById("typedIntro");
  const polaroid = document.getElementById("polaroid");
  const aboutNote = document.getElementById("aboutNote");
  let introTimers = [];

  const leadText = "作为一个AI时代的新传生，我们总是很难说清自己到底会做什么。我";
  const struckWords = [
    "写故事，",
    "做策划，",
    "拍视频，",
    "剪片子，",
    "读数据，",
    "deepthink，",
    "偶尔写一点点代码，",
    "总是保持好奇。"
  ];
  const finalLead = "我想";
  const finalPhrase = "让创意被看见，让传播产生价值。";
  const introTiming = {
    start: 520,
    lead: 19,
    word: 44,
    wordGap: 18,
    finalGap: 145,
    finalLead: 46,
    finalPhrase: 45,
    doneDelay: 420
  };
  const objectEntranceDelay = 1.5;

  function later(fn, delay) {
    const timer = window.setTimeout(fn, delay);
    introTimers.push(timer);
  }

  function typeInto(element, text, speed, onCharacter, startAt = 0) {
    let at = startAt;
    [...text].forEach((character) => {
      at += speed;
      later(() => {
        element.appendChild(document.createTextNode(character));
        if (onCharacter) onCharacter();
      }, at);
    });
    return at;
  }

  function renderIntroImmediately() {
    typedIntro.innerHTML = "";
    const lead = document.createElement("span");
    lead.className = "lead";
    lead.textContent = leadText;
    typedIntro.appendChild(lead);

    struckWords.forEach((word, index) => {
      const span = document.createElement("span");
      span.className = `word${index === struckWords.length - 1 ? " last" : ""}`;
      span.textContent = word + (index === struckWords.length - 1 ? "" : " ");
      const stroke = document.createElement("i");
      span.appendChild(stroke);
      typedIntro.appendChild(span);
    });

    const final = document.createElement("span");
    final.className = "final";
    final.append(finalLead);
    const emphasis = document.createElement("em");
    emphasis.textContent = finalPhrase;
    final.appendChild(emphasis);
    typedIntro.appendChild(final);
    typedIntro.classList.add("done");

    requestAnimationFrame(() => {
      typedIntro.querySelectorAll(".word").forEach((word) => {
        const stroke = word.querySelector("i");
        if (stroke) stroke.style.width = `${word.getBoundingClientRect().width}px`;
      });
    });
  }

  function playIntro() {
    introTimers.forEach(window.clearTimeout);
    introTimers = [];
    typedIntro.classList.remove("done");
    typedIntro.innerHTML = "";

    if (reduceMotion.matches) {
      renderIntroImmediately();
      return;
    }

    let cursor = introTiming.start;
    const lead = document.createElement("span");
    lead.className = "lead";
    typedIntro.appendChild(lead);
    cursor = typeInto(lead, `${leadText} `, introTiming.lead, null, cursor);

    const final = document.createElement("span");
    final.className = "final";
    typedIntro.appendChild(final);

    struckWords.forEach((word, index) => {
      const span = document.createElement("span");
      span.className = `word${index === struckWords.length - 1 ? " last" : ""}`;
      const stroke = document.createElement("i");
      span.appendChild(stroke);
      typedIntro.insertBefore(span, final);

      const text = index === struckWords.length - 1 ? word : `${word} `;
      cursor = typeInto(span, text, introTiming.word, () => {
        stroke.style.width = `${Math.ceil(span.getBoundingClientRect().width)}px`;
      }, cursor);
      cursor += introTiming.wordGap;
    });

    cursor += introTiming.finalGap;
    const finalPlain = document.createElement("span");
    final.appendChild(finalPlain);
    cursor = typeInto(finalPlain, finalLead, introTiming.finalLead, null, cursor);

    const emphasis = document.createElement("em");
    final.appendChild(emphasis);
    cursor = typeInto(emphasis, finalPhrase, introTiming.finalPhrase, null, cursor);

    later(() => typedIntro.classList.add("done"), cursor + introTiming.doneDelay);
  }

  function placeAboutNote() {
    const rightEdge = polaroid.getBoundingClientRect().right + 20 + 314;
    aboutNote.classList.toggle("flip", rightEdge > window.innerWidth - 18);
  }

  polaroid.addEventListener("mouseenter", () => {
    placeAboutNote();
  });
  polaroid.addEventListener("focus", placeAboutNote);
  window.addEventListener("resize", placeAboutNote);

  /* Things in my vicinity */

  const items = [
    {
      id: "ferrari",
      name: "Ferrari SF-24",
      copy: "F1 赛车车模。这项赛事有时会毁了我的周末……Anyway, no risk, full push!",
      image: "assets/images/shuffle/ferrari.webp"
    },
    {
      id: "canon-90d",
      name: "佳能 90D",
      copy: "我会根据需要选择变焦头或者饼干头，记录这个美丽的世界🌍。",
      image: "assets/images/shuffle/canon-90d.webp"
    },
    {
      id: "canon-g7x",
      name: "佳能 G7 X Mark II",
      copy: "我的第一台相机，父母买给我的中考礼物。在它被称为一代人像神机之前，我就已经用它记录了我的少女时代。",
      image: "assets/images/shuffle/canon-g7x.webp"
    },
    {
      id: "mac",
      name: "MacBook Air",
      copy: "生产力工具。",
      image: "assets/images/shuffle/mac.webp"
    },
    {
      id: "accessory-pouch",
      name: "电子设备配件包",
      copy: "朝鲜族民族纹样，购于黑龙江省佳木斯市星火朝鲜族乡。2025 年夏，我调研了那个村庄的脱贫振兴之路，遇到了很多美好的人。",
      image: "assets/images/shuffle/accessory-pouch.webp"
    },
    {
      id: "pencil-case",
      name: "笔袋",
      copy: "我最爱的纯黑 pouch，陪我从高一走到今天。",
      image: "assets/images/shuffle/pencil-case.webp"
    },
    {
      id: "cap",
      name: "Nike 鸭舌帽",
      copy: "戴上它意味着我进入了工作模式。绝对的打工好物。",
      image: "assets/images/shuffle/cap.webp"
    },
    {
      id: "earphones",
      name: "有线耳机",
      copy: "什么都听，有时是流行乐，有时是播客，有时是英语听力。",
      image: "assets/images/shuffle/earphones.webp"
    },
    {
      id: "favorite-pen",
      name: "百乐 Acro 中油笔",
      copy: "是我最爱的笔。希望我的文思能和这支笔一样顺滑。",
      image: "assets/images/shuffle/favorite-pen.webp"
    },
    {
      id: "tn-journal",
      name: "TN 手账本",
      copy: "记录我的旅行。",
      image: "assets/images/shuffle/tn-journal.webp"
    },
    {
      id: "journal",
      name: "手帐",
      copy: "手账本里有我的生活。",
      image: "assets/images/shuffle/journal.webp"
    }
  ];

  const desk = document.getElementById("desk");
  const shuffleButton = document.getElementById("shuffleButton");
  let shuffleTimer = 0;

  function shuffleArray(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function placeCaption(button) {
    const rect = button.getBoundingClientRect();
    const captionWidth = button.querySelector(".obj-cap")?.offsetWidth || 218;
    const nearLeft = rect.left + rect.width / 2 < window.innerWidth / 2;
    let toLeft = nearLeft;
    if (toLeft && rect.left < captionWidth + 20) toLeft = false;
    if (!toLeft && window.innerWidth - rect.right < captionWidth + 20) toLeft = true;
    button.classList.toggle("toL", toLeft);
  }

  function createObject(item, positionIndex, entranceDelay = 0) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `obj s${positionIndex}`;
    button.setAttribute("aria-label", `${item.name}。${item.copy}`);
    button.style.animationDelay = `${entranceDelay + positionIndex * 0.11}s`;

    const bob = document.createElement("span");
    bob.className = "bob";
    bob.style.setProperty("--dur", `${randomRange(6.8, 10).toFixed(2)}s`);
    bob.style.setProperty("--delay", `${randomRange(-6, 0).toFixed(2)}s`);
    bob.style.setProperty("--lift", `${randomRange(-21, -11).toFixed(0)}px`);
    bob.style.setProperty("--r1", `${randomRange(-4.5, -1).toFixed(1)}deg`);
    bob.style.setProperty("--r2", `${randomRange(1, 4.8).toFixed(1)}deg`);

    const image = document.createElement("img");
    image.src = item.image;
    image.alt = "";
    image.draggable = false;
    image.decoding = "async";
    bob.appendChild(image);

    const cap = document.createElement("span");
    cap.className = "obj-cap";
    const title = document.createElement("b");
    title.textContent = item.name;
    const description = document.createElement("span");
    description.textContent = item.copy;
    cap.append(title, description);
    button.append(bob, cap);

    button.addEventListener("mouseenter", () => {
      placeCaption(button);
    });
    button.addEventListener("focus", () => {
      placeCaption(button);
    });
    return button;
  }

  function renderObjects(list, entranceDelay = 0) {
    desk.replaceChildren();
    list.forEach((item, index) => {
      desk.appendChild(createObject(item, index, entranceDelay));
    });
  }

  window.addEventListener("resize", () => {
    desk.querySelectorAll(".obj").forEach(placeCaption);
  });

  function shuffleObjects(firstRender = false) {
    window.clearTimeout(shuffleTimer);
    const current = [...desk.children];

    if (firstRender || reduceMotion.matches) {
      const initialIds = [
        "ferrari",
        "canon-g7x",
        "journal",
        "tn-journal",
        "cap",
        "accessory-pouch"
      ];
      const initial = initialIds
        .map((id) => items.find((item) => item.id === id))
        .filter(Boolean);
      renderObjects(initial, objectEntranceDelay);
      return;
    }

    current.forEach((object) => object.classList.add("leave"));
    shuffleTimer = window.setTimeout(() => {
      const next = shuffleArray(items).slice(0, 6);
      renderObjects(next);
    }, 390);
  }

  shuffleButton.addEventListener("click", () => shuffleObjects(false));

  /* Corner navigation and contact panels */

  const toc = document.getElementById("toc");
  const tocButton = document.getElementById("tocButton");
  const tocPanel = document.getElementById("tocPanel");
  const contact = document.getElementById("contact");
  const contactButton = document.getElementById("contactButton");
  const contactPanel = document.getElementById("contactPanel");
  const xhs = document.getElementById("xhs");
  const xhsButton = document.getElementById("xhsButton");
  const xhsPanel = document.getElementById("xhsPanel");
  const tocTimers = new WeakMap();
  const contactTimers = new WeakMap();
  let xhsPinned = false;
  let xhsTimer = 0;

  function setExpanded(container, button, panel, expanded) {
    container.classList.toggle("on", expanded);
    button.setAttribute("aria-expanded", String(expanded));
    panel.setAttribute("aria-hidden", String(!expanded));
  }

  function closeToc() {
    setExpanded(toc, tocButton, tocPanel, false);
  }

  function closeContact() {
    setExpanded(contact, contactButton, contactPanel, false);
  }

  function closeXhs() {
    xhsPinned = false;
    setExpanded(xhs, xhsButton, xhsPanel, false);
  }

  function bindHoverPanel(container, button, panel, closeFn, timers) {
    container.addEventListener("pointerenter", (event) => {
      if (!canHover || event.pointerType !== "mouse") return;
      window.clearTimeout(timers.get(container));
      setExpanded(container, button, panel, true);
    });
    container.addEventListener("pointerleave", (event) => {
      if (!canHover || event.pointerType !== "mouse") return;
      const timer = window.setTimeout(closeFn, 230);
      timers.set(container, timer);
    });
    container.addEventListener("focusout", (event) => {
      if (!container.contains(event.relatedTarget)) closeFn();
    });
  }

  bindHoverPanel(toc, tocButton, tocPanel, closeToc, tocTimers);
  bindHoverPanel(contact, contactButton, contactPanel, closeContact, contactTimers);

  tocButton.addEventListener("click", (event) => {
    event.stopPropagation();
    setExpanded(toc, tocButton, tocPanel, canHover || !toc.classList.contains("on"));
  });

  contactButton.addEventListener("click", (event) => {
    event.stopPropagation();
    setExpanded(contact, contactButton, contactPanel, canHover || !contact.classList.contains("on"));
  });

  tocPanel.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.getElementById(link.dataset.section);
      closeToc();
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ block: "start" });
      history.replaceState(null, "", link.getAttribute("href"));
    });
  });

  function showXhs(pin = false) {
    window.clearTimeout(xhsTimer);
    if (pin) xhsPinned = true;
    setExpanded(xhs, xhsButton, xhsPanel, true);
  }

  function scheduleHideXhs() {
    if (xhsPinned) return;
    window.clearTimeout(xhsTimer);
    xhsTimer = window.setTimeout(closeXhs, 230);
  }

  xhs.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") showXhs(false);
  });
  xhs.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse") scheduleHideXhs();
  });
  xhs.addEventListener("focusin", () => showXhs(false));
  xhs.addEventListener("focusout", (event) => {
    if (!xhs.contains(event.relatedTarget)) scheduleHideXhs();
  });

  xhsButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (xhs.classList.contains("on") && xhsPinned) {
      closeXhs();
    } else {
      showXhs(true);
    }
  });

  document.addEventListener("click", (event) => {
    if (!toc.contains(event.target)) closeToc();
    if (!contact.contains(event.target)) closeContact();
    if (!xhs.contains(event.target)) closeXhs();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (toc.classList.contains("on")) {
      closeToc();
      tocButton.focus();
    } else if (contact.classList.contains("on")) {
      closeContact();
      contactButton.focus();
    } else if (xhs.classList.contains("on")) {
      closeXhs();
      xhsButton.focus();
    }
  });

  /* Contact copy buttons */

  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const value = button.dataset.copy;
      const original = button.textContent;
      try {
        await navigator.clipboard.writeText(value);
        button.textContent = "已复制";
      } catch {
        const helper = document.createElement("textarea");
        helper.value = value;
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        document.execCommand("copy");
        helper.remove();
        button.textContent = "已复制";
      }
      window.setTimeout(() => {
        button.textContent = original;
      }, 1400);
    });
  });

  /* Active Contents entry */

  const sectionLinks = [...tocPanel.querySelectorAll("a")];
  const sections = sectionLinks
    .map((link) => document.getElementById(link.dataset.section))
    .filter(Boolean);

  function updateActiveSection() {
    const marker = window.scrollY + window.innerHeight * 0.28;
    let active = sections[0];
    const atPageEnd =
      window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
    if (atPageEnd && sections.length) {
      active = sections[sections.length - 1];
    } else {
      sections.forEach((section) => {
        if (section.offsetTop <= marker) active = section;
      });
    }
    sectionLinks.forEach((link) => {
      if (link.dataset.section === active?.id) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  /* Softer corner controls after leaving the first screen */

  function updateAwayState() {
    document.body.classList.toggle("away", window.scrollY > 36);
  }

  let scrollQueued = false;
  window.addEventListener("scroll", () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      updateAwayState();
      updateActiveSection();
      scrollQueued = false;
    });
  }, { passive: true });

  /* Objects gently lean away from the cursor */

  const pointer = { x: -9999, y: -9999 };
  const motionState = new WeakMap();

  window.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  });

  document.documentElement.addEventListener("mouseleave", () => {
    pointer.x = -9999;
    pointer.y = -9999;
  });

  function animateObjects() {
    if (!reduceMotion.matches) {
      const moved = [polaroid, ...desk.querySelectorAll(".obj")];
      moved.forEach((element) => {
        const state = motionState.get(element) || { x: 0, y: 0, rotate: 0 };
        const rect = element.getBoundingClientRect();
        const dx = rect.left + rect.width / 2 - state.x - pointer.x;
        const dy = rect.top + rect.height / 2 - state.y - pointer.y;
        const distance = Math.hypot(dx, dy) || 1;
        const radius = 235;
        let targetX = 0;
        let targetY = 0;
        let targetRotate = 0;

        if (
          distance < radius &&
          !element.matches(":hover") &&
          !element.classList.contains("leave")
        ) {
          const strength = Math.pow(1 - distance / radius, 1.55);
          const influence = element === polaroid ? 0.28 : 1;
          targetX = (dx / distance) * strength * 44 * influence;
          targetY = (dy / distance) * strength * 44 * influence;
          targetRotate = (dx > 0 ? 1 : -1) * strength * 9 * influence;
        }

        state.x += (targetX - state.x) * 0.075;
        state.y += (targetY - state.y) * 0.075;
        state.rotate += (targetRotate - state.rotate) * 0.075;
        motionState.set(element, state);
        element.style.translate = `${state.x.toFixed(2)}px ${state.y.toFixed(2)}px`;
        element.style.rotate = `${state.rotate.toFixed(2)}deg`;
      });
    }
    requestAnimationFrame(animateObjects);
  }

  /* Start */

  playIntro();

  shuffleObjects(true);
  setExpanded(toc, tocButton, tocPanel, false);
  setExpanded(contact, contactButton, contactPanel, false);
  setExpanded(xhs, xhsButton, xhsPanel, false);

  window.setTimeout(() => {
    polaroid.classList.add("on");
  }, 320);

  updateAwayState();
  updateActiveSection();
  requestAnimationFrame(animateObjects);
})();
