(() => {
  "use strict";

  const works = window.PORTFOLIO_WORKS;
  const sectionMap = window.PORTFOLIO_SECTIONS;
  if (!works || !sectionMap) return;

  const targets = {
    campaigns: document.getElementById("campaignsGrid"),
    features: document.getElementById("featuresGrid"),
    newmedia: document.getElementById("newMediaGrid")
  };

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function makeFastener(kind) {
    return element("span", `work-fastener work-fastener--${kind || "pin"}`);
  }

  function makeImage(src, alt) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = alt;
    img.loading = "lazy";
    img.decoding = "async";
    img.draggable = false;
    return img;
  }

  function makeTitle(work, tag = "h3") {
    const node = element(tag);
    if (work.titleClass) node.classList.add(work.titleClass);
    if (work.titleHtml) node.innerHTML = work.titleHtml;
    else node.textContent = work.title;
    return node;
  }

  function appendRichText(node, text) {
    const highlightPattern = /\[\[(.+?)\]\]/g;
    let lastIndex = 0;
    let match;
    while ((match = highlightPattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        node.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      node.appendChild(element("mark", "work-highlight", match[1]));
      lastIndex = highlightPattern.lastIndex;
    }
    if (lastIndex < text.length) {
      node.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
  }

  function makeMat(work) {
    if (work.layout === "manuscript") {
      const paper = element("div", "work-mat work-manuscript");
      paper.appendChild(makeFastener(work.fastener));
      const quote = element("blockquote", "", work.coverQuote || work.quote || "");
      paper.appendChild(quote);
      if (work.excerpt) {
        paper.appendChild(element("p", "work-manuscript-excerpt", work.excerpt));
      }
      if (work.metrics?.length) {
        const meta = element("div", "work-manuscript-meta");
        work.metrics.forEach((metric) => meta.appendChild(element("span", "", metric)));
        paper.appendChild(meta);
      }
      return paper;
    }

    const mat = element("div", "work-mat");
    mat.appendChild(makeFastener(work.fastener));
    const previews = work.previewImages || work.images || [];
    const strip = element("div", `work-strip work-strip--${previews.length}`);
    previews.forEach((src, index) => {
      const image = makeImage(src, `${work.title} 页面预览 ${index + 1}`);
      const objectFit = work.previewObjectFits?.[index];
      const objectPosition = work.previewObjectPositions?.[index];
      if (objectFit) image.style.objectFit = objectFit;
      if (objectPosition) image.style.objectPosition = objectPosition;
      strip.appendChild(image);
    });
    mat.appendChild(strip);
    return mat;
  }

  function makeMetrics(work) {
    if (!work.metrics?.length) return null;
    const metrics = element("div", "work-metrics");
    work.metrics.forEach((metric) => metrics.appendChild(element("span", "", metric)));
    return metrics;
  }

  function makeCopy(work, compact) {
    const copy = element("div", "work-copy");
    copy.appendChild(element("p", "work-kicker", work.kicker));

    if (!compact) {
      copy.appendChild(makeTitle(work));
    }

    const summary = element("p", "work-summary", work.summary);
    if (work.summaryClass) summary.classList.add(work.summaryClass);
    copy.appendChild(summary);
    const metrics = makeMetrics(work);
    if (metrics && !compact) copy.appendChild(metrics);

    const hint = element(
      "span",
      "work-open-hint",
      work.detailHint || (work.links?.length ? "查看详情 · 原文链接 ↗" : "查看详情 ↗")
    );
    copy.appendChild(hint);
    return copy;
  }

  function makeSticky(work) {
    const sticky = element("div", "work-sticky");
    sticky.appendChild(makeTitle(work));
    return sticky;
  }

  function makeCard(work) {
    const card = element("article", `work-card work-card--${work.layout}`);
    card.dataset.work = work.id;
    if (work.noteTone) card.dataset.note = work.noteTone;
    card.style.setProperty("--span", String(work.span || 4));
    card.style.setProperty("--rot", work.rotate || "0deg");

    const compact = work.layout === "compact" || work.layout === "wide";
    const mat = makeMat(work);
    const copy = makeCopy(work, compact);

    if (work.layout === "lead") {
      card.append(copy, mat);
    } else {
      card.appendChild(mat);
      if (compact) card.appendChild(makeSticky(work));
      card.appendChild(copy);
    }

    const hitArea = element("button", "work-card-open");
    hitArea.type = "button";
    hitArea.setAttribute(
      "aria-label",
      work.directUrl ? `打开《${work.title}》原文（新标签页）` : `查看《${work.title}》详情`
    );
    card.appendChild(hitArea);
    return card;
  }

  Object.entries(targets).forEach(([section, target]) => {
    if (!target) return;
    const ids = sectionMap[section] || [];
    ids.forEach((id) => {
      if (works[id]) target.appendChild(makeCard(works[id]));
    });
  });

  const modal = document.getElementById("workModal");
  const dialog = modal.querySelector(".work-dialog");
  const closeButton = document.getElementById("workModalClose");
  const titleNode = document.getElementById("workModalTitle");
  const kickerNode = document.getElementById("workModalKicker");
  const summaryNode = document.getElementById("workModalSummary");
  const bodyNode = document.getElementById("workModalBody");
  let lastFocused = null;
  let closeTimer = 0;

  function makeMeta(work) {
    const meta = element("div", "work-meta");
    const type = element("div", "work-meta-item");
    type.append(element("span", "", "作品类型"), element("strong", "", work.type || "—"));
    const role = element("div", "work-meta-item");
    role.append(element("span", "", "我的角色"), element("strong", "", work.role || "—"));
    meta.append(type, role);
    return meta;
  }

  function makeGallery(work) {
    if (!work.images?.length) return null;
    const gallery = element("div", `work-gallery work-gallery--${work.gallery || "portrait"}`);
    work.images.forEach((src, index) => {
      gallery.appendChild(makeImage(src, `${work.title} 作品图 ${index + 1}`));
    });
    return gallery;
  }

  function makeLinks(work) {
    if (!work.links?.length) return null;
    const links = element("div", "work-links");
    work.links.forEach((link) => {
      const anchor = document.createElement("a");
      anchor.href = link.url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = link.label || "阅读原文";
      links.appendChild(anchor);
    });
    return links;
  }

  function makeDetailSections(work) {
    if (!work.detailSections?.length) return null;
    const sections = element("div", "work-detail-sections");
    work.detailSections.forEach((section) => {
      if (section.heading) {
        sections.appendChild(element("h4", "work-detail-section-title", section.heading));
      }
      if (section.quote) {
        sections.appendChild(element("blockquote", "work-detail-quote", section.quote));
      }
      (section.paragraphs || []).forEach((paragraph) => {
        const text = typeof paragraph === "string" ? paragraph : paragraph.text;
        if (paragraph.kind === "quote") {
          sections.appendChild(element("blockquote", "work-detail-quote", text));
          return;
        }
        if (text === "......" || text === "……") {
          sections.appendChild(element("p", "work-detail-divider", "······"));
          return;
        }
        const node = element("p", "work-detail-paragraph");
        appendRichText(node, text);
        sections.appendChild(node);
      });
    });
    return sections;
  }

  function openWork(id) {
    const work = works[id];
    if (!work) return;
    window.clearTimeout(closeTimer);
    lastFocused = document.activeElement;

    titleNode.textContent = work.title;
    kickerNode.textContent = work.kicker;
    summaryNode.textContent = work.summary;
    bodyNode.replaceChildren();

    bodyNode.appendChild(makeMeta(work));

    if (work.detailNote) {
      const note = element("p", "work-detail-note");
      appendRichText(note, work.detailNote);
      bodyNode.appendChild(note);
    }
    if (work.detailBullets?.length) {
      const bullets = element("ul", "work-detail-bullets");
      work.detailBullets.forEach((bullet) => {
        const item = element("li");
        item.appendChild(element("strong", "", `${bullet.label}：`));
        appendRichText(item, bullet.text);
        bullets.appendChild(item);
      });
      bodyNode.appendChild(bullets);
    }
    const sections = makeDetailSections(work);
    if (sections) bodyNode.appendChild(sections);
    if (work.quote && !work.detailSections?.length) {
      bodyNode.appendChild(element("blockquote", "work-detail-quote", work.quote));
    }

    const gallery = makeGallery(work);
    if (gallery) bodyNode.appendChild(gallery);

    const links = makeLinks(work);
    if (links) bodyNode.appendChild(links);

    modal.hidden = false;
    document.body.classList.add("work-modal-open");
    requestAnimationFrame(() => {
      modal.classList.add("on");
      closeButton.focus();
    });
  }

  function closeWork() {
    if (modal.hidden) return;
    window.clearTimeout(closeTimer);
    modal.classList.remove("on");
    document.body.classList.remove("work-modal-open");
    closeTimer = window.setTimeout(() => {
      modal.hidden = true;
      bodyNode.replaceChildren();
      if (lastFocused instanceof HTMLElement) lastFocused.focus();
    }, 230);
  }

  document.addEventListener("click", (event) => {
    const card = event.target.closest(".work-card");
    if (!card) return;
    const work = works[card.dataset.work];
    if (!work) return;
    if (work.directUrl) {
      window.open(work.directUrl, "_blank", "noopener,noreferrer");
      return;
    }
    openWork(work.id);
  });

  closeButton.addEventListener("click", closeWork);
  modal.addEventListener("click", (event) => {
    if (event.target.hasAttribute("data-close-work")) closeWork();
  });

  document.addEventListener("keydown", (event) => {
    if (modal.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeWork();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = [...dialog.querySelectorAll("a[href], button:not([disabled])")]
      .filter((node) => node.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
})();
