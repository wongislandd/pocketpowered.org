(() => {
  const raw = new URL(window.location.href).searchParams.get("code") ?? "";
  const code = raw.trim().toUpperCase().replaceAll("-", "");
  const valid = /^[A-Z0-9]{12}$/.test(code);
  if (!valid) {
    document.getElementById("invite-status").textContent = "This invite link is incomplete. Ask your friend to share a new link, or enter your invite code in the app.";
    return;
  }
  document.getElementById("invite-code").textContent = code;
  document.getElementById("open-invite").href = `sidequests://invite?code=${encodeURIComponent(code)}`;
  document.getElementById("invite-actions").hidden = false;
  document.getElementById("copy-invite").addEventListener("click", async () => {
    const status = document.getElementById("copy-status");
    try {
      await navigator.clipboard.writeText(code);
      status.textContent = "Copied. Enter this code in Friends after signing in.";
    } catch {
      status.textContent = `Copy this code to use later: ${code}`;
    }
  });
})();
