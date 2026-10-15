
(() => {
  "use strict";

  const DOGGIE_IMAGES = [
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQMzaniJES87cJYoKFm1qGAp0w3AWWZbrqN3CC9U-8IjKrdLUSZ9M7yB4hY&s=10",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRvVIqdpBGB8T-QjMKHTf7Cbz-c1Mlkvt0gcvVR6h2GOw&s=10",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRONE_wqg-VGFnCDa7ipPscp63HLTpNNJtgsCt5CqaDaQ&s=10",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQFrUlfF_KThr1V7TPTefQWpOAXlyw2OWrjBTtIV7Rc7A&s=10",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQA4VLh0lqXaCcyVXfnNhLzblUHMBloYk5PiNhjjZ0-IA&s=10",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_qHZFLyTAOkLddF642iBck4Ag7HXL7svQSW1mDwGf&s=10",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR-hAAMNfyr1bnKYeBZSwiKRoVZ2wHsaBKRRq85f_G5Xw&s=10"
  ];

  const MARKER = "doggifyApplied";

  let enabled = true;
  let observer;

  const SELECTORS = [
    "ytd-thumbnail img",
    "yt-thumbnail-view-model img",
    "a#thumbnail img",
    "ytd-rich-grid-media img",
    "ytd-compact-video-renderer img",
    "ytd-video-renderer img",
    "ytd-grid-video-renderer img",
    "ytd-playlist-video-renderer img",
    "ytd-reel-item-renderer img",
    "yt-lockup-view-model img",
    "ytm-shorts-lockup-view-model img"
  ];

  function randomDoggie() {
    return DOGGIE_IMAGES[
      Math.floor(Math.random() * DOGGIE_IMAGES.length)
    ];
  }

  function isThumbnail(img) {
    if (!(img instanceof HTMLImageElement)) return false;

    if (
      img.closest(
        "#avatar, ytd-channel-avatar, #author-thumbnail, ytd-comment-renderer"
      )
    ) {
      return false;
    }

    const wrapper = img.closest(
      "ytd-thumbnail, a#thumbnail, yt-thumbnail-view-model, " +
      "ytd-rich-grid-media, ytd-video-renderer, " +
      "ytd-compact-video-renderer, ytd-grid-video-renderer, " +
      "ytd-playlist-video-renderer, ytd-reel-item-renderer, " +
      "yt-lockup-view-model, ytm-shorts-lockup-view-model"
    );

    if (!wrapper) return false;

    const rect = img.getBoundingClientRect();

    if (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.width < 100 &&
      rect.height < 55
    ) {
      return false;
    }

    return true;
  }

  function applyDoggie(img) {
    if (!enabled || !isThumbnail(img)) return;

    if (img.dataset[MARKER] !== "1") {
      // Save the original thumbnail before replacing it.
      img.dataset.doggifyOriginalSrc =
        img.getAttribute("src") || "";

      img.dataset.doggifyOriginalSrcset =
        img.getAttribute("srcset") || "";

      img.dataset.doggifyOriginalAlt =
        img.getAttribute("alt") || "";

      // Pick once per thumbnail, not once per scan.
      img.dataset.doggifyChosenImage = randomDoggie();
      img.dataset[MARKER] = "1";
    }

    const chosen = img.dataset.doggifyChosenImage;

    if (img.getAttribute("src") !== chosen) {
      img.setAttribute("src", chosen);
    }

    if (img.hasAttribute("srcset")) {
      img.removeAttribute("srcset");
    }

    img.alt = "Doggified YouTube thumbnail";
    img.style.objectFit = "cover";
  }

  function scan(root = document) {
    if (!enabled) return;

    if (root instanceof HTMLImageElement) {
      applyDoggie(root);
    }

    if (!root.querySelectorAll) return;

    for (const selector of SELECTORS) {
      root.querySelectorAll(selector).forEach(applyDoggie);
    }
  }

  function restoreOriginals() {
    document.querySelectorAll("img").forEach(img => {
      if (img.dataset[MARKER] !== "1") return;

      const src = img.dataset.doggifyOriginalSrc;
      const srcset = img.dataset.doggifyOriginalSrcset;
      const alt = img.dataset.doggifyOriginalAlt;

      if (src) img.setAttribute("src", src);
      else img.removeAttribute("src");

      if (srcset) img.setAttribute("srcset", srcset);
      else img.removeAttribute("srcset");

      if (alt) img.setAttribute("alt", alt);
      else img.removeAttribute("alt");

      delete img.dataset[MARKER];
      delete img.dataset.doggifyOriginalSrc;
      delete img.dataset.doggifyOriginalSrcset;
      delete img.dataset.doggifyOriginalAlt;
      delete img.dataset.doggifyChosenImage;

      img.style.removeProperty("object-fit");
    });
  }

  function startObserver() {
    if (observer) observer.disconnect();

    observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === "childList") {
          record.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              scan(node);
            }
          });
        }

        if (record.type === "attributes") {
          const img = record.target;

          if (
            enabled &&
            img instanceof HTMLImageElement &&
            img.dataset[MARKER] === "1"
          ) {
            const chosen = img.dataset.doggifyChosenImage;

            if (
              img.getAttribute("src") !== chosen ||
              img.hasAttribute("srcset")
            ) {
              applyDoggie(img);
            }
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "srcset"]
    });
  }

  async function initialize() {
    try {
      const settings = await browser.storage.local.get({
        doggifyEnabled: true
      });

      enabled = settings.doggifyEnabled !== false;
    } catch (_) {
      enabled = true;
    }

    if (enabled) scan();
    else restoreOriginals();

    startObserver();
  }

  browser.runtime.onMessage.addListener(message => {
    if (message?.type === "DOGGIFY_SETTINGS") {
      enabled = Boolean(message.enabled);

      if (enabled) scan();
      else restoreOriginals();

      return Promise.resolve({ ok: true });
    }

    if (message?.type === "DOGGIFY_RESCAN") {
      scan();
      return Promise.resolve({ ok: true });
    }
  });

  document.addEventListener("yt-navigate-finish", () => {
    setTimeout(() => scan(), 250);
    setTimeout(() => scan(), 900);
  });

  initialize();
})();
