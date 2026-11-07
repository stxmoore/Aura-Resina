"use strict";

const WHATSAPP_NUMBER = "50372758372";
const PRODUCT_CATEGORIES = ["Aretes", "Llaveros", "Portavelas", "Collares"];
const CURRENCY_FORMATTER = new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD"
});

const catalogModalElement = document.getElementById("catalogModal");
const catalogGrid = document.getElementById("catalogGrid");
const catalogEmpty = document.getElementById("catalogEmpty");
const catalogError = document.getElementById("catalogError");
const emptyTitle = catalogEmpty.querySelector("h3");
const emptyDescription = catalogEmpty.querySelector("p");
const filterButtons = [...document.querySelectorAll("[data-filter]")];
const selectionCount = document.getElementById("selectionCount");
const selectionTotal = document.getElementById("selectionTotal");
const buySelected = document.getElementById("buySelected");
const siteMenu = document.getElementById("siteMenu");

let products = [];
let productsLoaded = false;
let productsLoadFailed = false;
let activeFilter = "Todos";
const selectedProductIds = new Set();

function setTheme(theme) {
    document.documentElement.setAttribute("data-bs-theme", theme);
    document.getElementById("themeIcon").textContent = theme === "dark" ? "\u2600" : "\u263E";
    document.getElementById("themeToggle").setAttribute(
        "aria-label",
        theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
    );
    document.querySelector('meta[name="theme-color"]').setAttribute(
        "content",
        theme === "dark" ? "#211b2a" : "#f7f4ef"
    );
}

function initializeTheme() {
    let savedTheme = null;
    try {
        savedTheme = localStorage.getItem("aura-theme");
    } catch (error) {
        console.warn("No se pudo leer el tema guardado.", error);
    }

    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(savedTheme || systemTheme);

    document.getElementById("themeToggle").addEventListener("click", () => {
        const nextTheme = document.documentElement.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
        setTheme(nextTheme);
        try {
            localStorage.setItem("aura-theme", nextTheme);
        } catch (error) {
            console.warn("No se pudo guardar la preferencia de tema.", error);
        }
    });
}

function isValidProduct(product) {
    return product !== null
        && typeof product === "object"
        && typeof product.id === "string"
        && product.id.trim() !== ""
        && typeof product.name === "string"
        && product.name.trim() !== ""
        && PRODUCT_CATEGORIES.includes(product.category)
        && typeof product.description === "string"
        && product.description.trim() !== ""
        && (product.price === null
            || (typeof product.price === "number" && Number.isFinite(product.price) && product.price >= 0))
        && typeof product.image === "string"
        && product.image.trim() !== ""
        && typeof product.imageAlt === "string"
        && product.imageAlt.trim() !== ""
        && Number.isInteger(product.imageWidth)
        && product.imageWidth > 0
        && Number.isInteger(product.imageHeight)
        && product.imageHeight > 0;
}

function updateEmptyState() {
    const visibleProducts = getVisibleProducts();
    const hasVisibleProducts = visibleProducts.length > 0;
    catalogEmpty.hidden = hasVisibleProducts || productsLoadFailed;
    catalogGrid.hidden = !hasVisibleProducts;

    if (!hasVisibleProducts && !productsLoadFailed) {
        if (activeFilter === "Todos") {
            emptyTitle.textContent = "Estamos subiendo las piezas";
            emptyDescription.textContent = "Escríbenos para ver lo disponible y consultar los detalles.";
        } else {
            emptyTitle.textContent = `Aún no hay piezas en ${activeFilter}`;
            emptyDescription.textContent = "Escríbenos para consultar lo disponible en esta categoría.";
        }
    }
}

function getVisibleProducts() {
    return activeFilter === "Todos"
        ? products
        : products.filter((product) => product.category === activeFilter);
}

function createProductCard(product) {
    const card = document.createElement("button");
    card.className = "catalog-product";
    card.type = "button";
    card.dataset.productId = product.id;
    card.setAttribute("aria-pressed", String(selectedProductIds.has(product.id)));

    const image = document.createElement("img");
    image.src = product.image;
    image.alt = product.imageAlt;
    image.width = product.imageWidth;
    image.height = product.imageHeight;
    image.loading = "lazy";

    const copy = document.createElement("span");
    copy.className = "catalog-product-copy";

    const category = document.createElement("span");
    category.className = "catalog-product-category";
    category.textContent = product.category;

    const name = document.createElement("span");
    name.className = "catalog-product-name";
    name.textContent = product.name;

    const description = document.createElement("span");
    description.className = "catalog-product-description";
    description.textContent = product.description;

    const price = document.createElement("span");
    price.className = "catalog-product-price";
    price.textContent = product.price === null
        ? "Precio por consultar"
        : CURRENCY_FORMATTER.format(product.price);

    copy.append(category, name, description, price);
    card.append(image, copy);
    return card;
}

function renderCatalog() {
    catalogGrid.replaceChildren(...getVisibleProducts().map(createProductCard));
    updateEmptyState();
    updateSelectionSummary();
    catalogGrid.setAttribute("aria-busy", "false");
}

async function loadProducts() {
    if (productsLoaded || productsLoadFailed) {
        return;
    }

    catalogGrid.setAttribute("aria-busy", "true");
    catalogEmpty.hidden = true;
    catalogError.hidden = true;

    try {
        const response = await fetch("./products.json", { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`products.json respondió con el estado ${response.status}.`);
        }

        const data = await response.json();
        if (!Array.isArray(data) || !data.every(isValidProduct)) {
            throw new TypeError("products.json no contiene productos con el formato esperado.");
        }
        if (new Set(data.map((product) => product.id)).size !== data.length) {
            throw new TypeError("products.json contiene identificadores de producto repetidos.");
        }

        products = data;
        productsLoaded = true;
        renderCatalog();
    } catch (error) {
        productsLoadFailed = true;
        catalogGrid.replaceChildren();
        catalogGrid.hidden = true;
        catalogEmpty.hidden = true;
        catalogGrid.setAttribute("aria-busy", "false");
        catalogError.hidden = false;
        console.error("No se pudo cargar el catálogo de Aura Resina.", error);
    }
}

function setActiveFilter(filter) {
    if (filter !== "Todos" && !PRODUCT_CATEGORIES.includes(filter)) {
        return;
    }

    activeFilter = filter;
    filterButtons.forEach((button) => {
        const isActive = button.dataset.filter === filter;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });

    if (productsLoaded) {
        renderCatalog();
    }
}

function updateSelectionSummary() {
    const selectedProducts = products.filter((product) => selectedProductIds.has(product.id));
    const hasUnknownPrice = selectedProducts.some((product) => product.price === null);
    const total = selectedProducts.reduce((sum, product) => sum + (product.price ?? 0), 0);

    selectionCount.textContent = String(selectedProducts.length);
    selectionTotal.textContent = hasUnknownPrice ? "Por confirmar" : CURRENCY_FORMATTER.format(total);
    buySelected.setAttribute("aria-disabled", String(selectedProducts.length === 0));
    buySelected.classList.toggle("is-disabled", selectedProducts.length === 0);

    if (selectedProducts.length === 0) {
        buySelected.href = "#";
        return;
    }

    const itemLines = selectedProducts.map((product) => {
        const price = product.price === null
            ? "precio por confirmar"
            : CURRENCY_FORMATTER.format(product.price);
        return `- ${product.name}: ${price}`;
    });
    const message = [
        "Hola, quiero comprar estas piezas de Aura Resina:",
        ...itemLines,
        `Total estimado: ${hasUnknownPrice ? "pendiente de confirmar" : CURRENCY_FORMATTER.format(total)}`
    ].join("\n");
    buySelected.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function openCatalog(filter = "Todos") {
    setActiveFilter(filter);
    bootstrap.Modal.getOrCreateInstance(catalogModalElement).show();
    loadProducts();
}

function initializeCatalog() {
    document.querySelectorAll("[data-open-catalog]").forEach((button) => {
        button.addEventListener("click", () => openCatalog());
    });

    document.querySelectorAll("[data-category]").forEach((button) => {
        button.addEventListener("click", () => openCatalog(button.dataset.category));
    });

    filterButtons.forEach((button) => {
        button.addEventListener("click", () => setActiveFilter(button.dataset.filter));
    });

    catalogGrid.addEventListener("click", (event) => {
        const card = event.target.closest("[data-product-id]");
        if (!card) {
            return;
        }

        const productId = card.dataset.productId;
        if (selectedProductIds.has(productId)) {
            selectedProductIds.delete(productId);
        } else {
            selectedProductIds.add(productId);
        }

        card.setAttribute("aria-pressed", String(selectedProductIds.has(productId)));
        updateSelectionSummary();
    });

    buySelected.addEventListener("click", (event) => {
        if (selectedProductIds.size === 0) {
            event.preventDefault();
        }
    });

    siteMenu.addEventListener("click", (event) => {
        const link = event.target.closest("a");
        if (!link) {
            return;
        }

        if (link.dataset.menuCategory) {
            event.preventDefault();
            const category = link.dataset.menuCategory;
            siteMenu.addEventListener("hidden.bs.offcanvas", () => openCatalog(category), { once: true });
        }

        bootstrap.Offcanvas.getOrCreateInstance(siteMenu).hide();
    });
}

function initializePlaceholders() {
    const reviews = [];
    const instagramPhotos = [];
    const reviewsGrid = document.getElementById("reviewsGrid");
    const instagramGrid = document.getElementById("instagramGrid");
    const reviewsPlaceholder = document.getElementById("reviewsPlaceholder");
    const instagramPlaceholder = document.getElementById("instagramPlaceholder");

    reviewsPlaceholder.hidden = reviews.length > 0;
    reviews.forEach((review) => {
        const article = document.createElement("article");
        article.className = "review-card";
        const quote = document.createElement("blockquote");
        quote.textContent = review.text;
        const author = document.createElement("cite");
        author.textContent = review.author;
        article.append(quote, author);
        reviewsGrid.append(article);
    });

    instagramPlaceholder.hidden = instagramPhotos.length > 0;
    instagramPhotos.forEach((photo) => {
        const link = document.createElement("a");
        link.href = photo.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        const image = document.createElement("img");
        image.src = photo.image;
        image.alt = photo.alt;
        image.width = 640;
        image.height = 640;
        image.loading = "lazy";
        link.append(image);
        instagramGrid.append(link);
    });
}

initializeTheme();
initializeCatalog();
initializePlaceholders();
document.getElementById("currentYear").textContent = String(new Date().getFullYear());
