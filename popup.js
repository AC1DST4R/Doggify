
const enabledInput = document.getElementById("enabled");
const saveButton = document.getElementById("save");
const status = document.getElementById("status");

async function loadSettings() {
  const settings = await browser.storage.local.get({
    doggifyEnabled: true
  });

  enabledInput.checked = settings.doggifyEnabled !== false;
}

async function saveSettings() {
  const enabled = enabledInput.checked;

  await browser.storage.local.set({
    doggifyEnabled: enabled
  });

  const tabs = await browser.tabs.query({
    url: [
      "*://www.youtube.com/*",
      "*://youtube.com/*"
    ]
  });

  await Promise.all(
    tabs.map(async tab => {
      try {
        await browser.tabs.sendMessage(tab.id, {
          type: "DOGGIFY_SETTINGS",
          enabled
        });
      } catch (_) {
        // Refresh YouTube if the content script is not available.
      }
    })
  );

  status.textContent = enabled
    ? "Doggification enabled! 🐶"
    : "Doggification disabled.";
}

saveButton.addEventListener("click", saveSettings);

loadSettings().catch(() => {
  status.textContent = "Could not load settings.";
});
