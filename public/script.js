// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// Live waitlist counter (social proof)
const counterText = document.getElementById("counter-text");
fetch("/api/waitlist/count")
  .then((r) => r.json())
  .then((d) => {
    if (typeof d.count === "number" && d.count > 0) {
      const base = 100 + d.count; // friendly starting baseline
      counterText.textContent = `${base.toLocaleString()} people on the early-access waitlist`;
    }
  })
  .catch(() => {});

// Waitlist form submission
const form = document.getElementById("waitlist-form");
const msg = document.getElementById("form-msg");
const btn = document.getElementById("submit-btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.className = "form-msg";
  msg.textContent = "";

  const data = Object.fromEntries(new FormData(form).entries());

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    msg.className = "form-msg err";
    msg.textContent = "Please enter a valid email address.";
    return;
  }

  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = "Reserving…";

  try {
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();

    if (res.ok && json.ok) {
      form.reset();
      msg.className = "form-msg ok";
      msg.textContent = json.message || "You're on the list!";
      btn.textContent = "✓ You're in";
    } else {
      msg.className = "form-msg err";
      msg.textContent = json.error || "Something went wrong. Please try again.";
      btn.disabled = false;
      btn.textContent = original;
    }
  } catch {
    msg.className = "form-msg err";
    msg.textContent = "Network error. Please try again.";
    btn.disabled = false;
    btn.textContent = original;
  }
});
