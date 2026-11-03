const root = document.documentElement;
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeIcon = document.getElementById("themeIcon");
const floatingBuy = document.getElementById("floatingBuy");
const currentYear = document.getElementById("currentYear");
const offcanvasMenu = document.getElementById("offcanvasMenu");

const savedTheme = localStorage.getItem("aura-theme");
const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

function setTheme(theme) {
    root.setAttribute("data-bs-theme", theme);
    themeIcon.className = theme === "dark" ? "bi bi-sun" : "bi bi-moon-stars";
    themeToggleBtn.setAttribute(
        "aria-label",
        theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
    );
    document.querySelector('meta[name="theme-color"]').setAttribute(
        "content",
        theme === "dark" ? "#1c1720" : "#fbf8f3"
    );
}

setTheme(savedTheme || preferredTheme);

themeToggleBtn.addEventListener("click", () => {
    const nextTheme = root.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("aura-theme", nextTheme);
});

offcanvasMenu.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
        return;
    }

    const sectionLink = event.target.closest('a[href^="#"]');
    if (sectionLink) {
        bootstrap.Offcanvas.getOrCreateInstance(offcanvasMenu).hide();
    }
});

function updateFloatingButton() {
    floatingBuy.classList.toggle("is-compact", window.scrollY > 160);
}

window.addEventListener("scroll", updateFloatingButton, { passive: true });
updateFloatingButton();

currentYear.textContent = new Date().getFullYear();