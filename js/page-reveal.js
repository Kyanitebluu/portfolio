(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Keep the accepted 05 -> tail transition.
  const flow = document.getElementById("flow");
  if (flow) {
    if (reduceMotion.matches) {
      flow.classList.add("is-rising");
    } else {
      flow.classList.add("reveal-armed");
      const reveal = () => flow.classList.add("is-rising");
      const isNear = () => {
        const rect = flow.getBoundingClientRect();
        return rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
      };

      if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              reveal();
              observer.disconnect();
            }
          },
          { threshold: 0.06, rootMargin: "0px 0px -6% 0px" }
        );
        observer.observe(flow);
        requestAnimationFrame(() => {
          if (isNear()) {
            reveal();
            observer.disconnect();
          }
        });
      } else {
        reveal();
      }
    }
  }

  // Content pages fade in on arrival and fade out as the next page takes over.
  const fadingSections = ["campaigns", "features", "newmedia", "image"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (!fadingSections.length) return;

  if (reduceMotion.matches) {
    fadingSections.forEach((section) => section.classList.add("is-in-view"));
    return;
  }

  fadingSections.forEach((section) => section.classList.add("page-fade"));

  let queued = false;

  function updateFade() {
    const height = window.innerHeight;
    const enterLine = height * 0.72;
    const exitLine = height * 0.18;

    fadingSections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const inView = rect.top < enterLine && rect.bottom > exitLine;
      section.classList.toggle("is-in-view", inView);
    });
  }

  function scheduleFade() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      updateFade();
      queued = false;
    });
  }

  window.addEventListener("scroll", scheduleFade, { passive: true });
  window.addEventListener("resize", scheduleFade);
  window.addEventListener("load", scheduleFade);
  updateFade();
})();
