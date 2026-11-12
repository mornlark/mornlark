"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { registerStorefrontTools } from "@/lib/agents/webmcp";
import {
  categories,
  money,
  products,
  type Category,
  type Product,
} from "./catalog";

type IconName =
  | "arrow"
  | "arrow-up"
  | "search"
  | "heart"
  | "bag"
  | "chevron"
  | "truck"
  | "shield"
  | "return"
  | "headphones"
  | "filter"
  | "close"
  | "plus"
  | "minus"
  | "check"
  | "spark"
  | "menu";

function Icon({
  name,
  size = 20,
  ...props
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
    "arrow-up": <path d="M6 18 18 6M6 6h12v12" />,
    search: (
      <>
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    heart: (
      <path d="M20.4 5.5a5.2 5.2 0 0 0-7.4 0L12 6.6l-1.1-1.1a5.2 5.2 0 0 0-7.4 7.4L12 21l8.4-8.1a5.2 5.2 0 0 0 0-7.4Z" />
    ),
    bag: (
      <>
        <path d="M5 7h14l1 14H4L5 7Z" />
        <path d="M8 8V6a4 4 0 0 1 8 0v2" />
      </>
    ),
    chevron: <path d="m7 10 5 5 5-5" />,
    truck: (
      <>
        <path d="M3 5h11v12H3zM14 9h4l3 4v4h-7" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
      </>
    ),
    shield: (
      <>
        <path d="m12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6l8-3Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    return: <path d="M7 8h8a6 6 0 1 1-5.3 9M7 8l4-4M7 8l4 4" />,
    headphones: (
      <path d="M4 14v-3a8 8 0 0 1 16 0v3M4 12h3v7H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2Zm16 0h-3v7h3a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2ZM19 20c0 2-4 2-7 2" />
    ),
    filter: (
      <>
        <path d="M4 7h9m4 0h3M4 17h3m4 0h9" />
        <circle cx="15" cy="7" r="2" />
        <circle cx="9" cy="17" r="2" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    plus: <path d="M5 12h14M12 5v14" />,
    minus: <path d="M5 12h14" />,
    check: <path d="m5 12 4 4L19 6" />,
    spark: (
      <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4m-2-2h4" />
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

function Logo() {
  return (
    <span className="brand">
      <svg
        width="33"
        height="33"
        viewBox="0 0 36 36"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M18 3v5m-2-5h4"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
        <rect x="4" y="9" width="28" height="23" rx="8" fill="currentColor" />
        <rect
          x="9"
          y="15"
          width="18"
          height="10"
          rx="5"
          fill="var(--color-paper)"
        />
        <path
          d="M14 19v2m8-2v2"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      MornLark
    </span>
  );
}

function ProductArt({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`${product.name} robot in soft white with graphite details`}
      className={`product-art art-${product.art} ${className}`}
    />
  );
}

function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "modal-wide" : ""}`}
      aria-label={title}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-inner">
        <div className="modal-heading">
          <h2>{title}</h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

type Cart = Record<string, number>;
type Panel =
  | "cart"
  | "favorites"
  | "match"
  | "checkout"
  | "complete"
  | "shipping"
  | "returns"
  | "support"
  | null;

export default function Storefront() {
  const [category, setCategory] = useState<Category>("All robots");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priceLimit, setPriceLimit] = useState(3000);
  const [sort, setSort] = useState("featured");
  const [cart, setCart] = useState<Cart>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [toast, setToast] = useState("");
  const [match, setMatch] = useState("");
  const [order, setOrder] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const savedCart: unknown = JSON.parse(
        localStorage.getItem("robo-cart") || "{}",
      );
      if (
        savedCart &&
        typeof savedCart === "object" &&
        !Array.isArray(savedCart)
      ) {
        const valid: Cart = {};
        for (const [id, count] of Object.entries(savedCart)) {
          if (
            products.some((p) => p.id === id) &&
            typeof count === "number" &&
            Number.isInteger(count) &&
            count > 0
          )
            valid[id] = Math.min(count, 99);
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore browser-only storage after hydration while keeping the server markup stable.
        setCart(valid);
      }
      const savedFavorites: unknown = JSON.parse(
        localStorage.getItem("robo-favorites") || "[]",
      );
      if (Array.isArray(savedFavorites))
        setFavorites(
          savedFavorites.filter(
            (id): id is string =>
              typeof id === "string" && products.some((p) => p.id === id),
          ),
        );
    } catch {
      /* Browsing remains available when storage is disabled. */
    }
    setLoaded(true);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem("robo-cart", JSON.stringify(cart));
      localStorage.setItem("robo-favorites", JSON.stringify(favorites));
    } catch {
      /* Storage is optional. */
    }
  }, [cart, favorites, loaded]);

  const cartCount = Object.values(cart).reduce((sum, count) => sum + count, 0);
  const subtotal = products.reduce(
    (sum, p) => sum + p.price * (cart[p.id] || 0),
    0,
  );
  const visibleProducts = products
    .filter(
      (p) =>
        (category === "All robots" || p.category === category) &&
        `${p.name} ${p.tagline} ${p.category} ${p.description}`
          .toLowerCase()
          .includes(query.toLowerCase().trim()) &&
        p.price <= priceLimit,
    )
    .sort((a, b) =>
      sort === "price-low"
        ? a.price - b.price
        : sort === "price-high"
          ? b.price - a.price
          : 0,
    );

  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3500);
  }
  function addToCart(product: Product, count = 1) {
    setCart((current) => ({
      ...current,
      [product.id]: Math.min((current[product.id] || 0) + count, 99),
    }));
    notify(`${product.name} added to your bag`);
  }
  function updateQuantity(id: string, delta: number) {
    setCart((current) => {
      const next = { ...current };
      const count = (next[id] || 0) + delta;
      if (count <= 0) delete next[id];
      else next[id] = Math.min(count, 99);
      return next;
    });
  }
  function toggleFavorite(id: string) {
    setFavorites((current) =>
      current.includes(id) ? current.filter((f) => f !== id) : [...current, id],
    );
  }
  const openProduct = useCallback((product: Product) => {
    setPanel(null);
    setSelected(product);
    setQuantity(1);
  }, []);
  function openPanel(next: Panel) {
    setSelected(null);
    setPanel(next);
  }
  const showCatalog = useCallback((reset = false) => {
    if (reset) {
      setCategory("All robots");
      setQuery("");
      setPriceLimit(3000);
    }
    setMenuOpen(false);
    document.getElementById("robots")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(
    () => registerStorefrontTools({
      search: (filters) => {
        setQuery(filters.query ?? "");
        setCategory(filters.category ?? "All robots");
        setPriceLimit(Math.min(filters.maxPrice ?? 3000, 3000));
        setSort(filters.sort ?? "featured");
        setSearchOpen(Boolean(filters.query));
        showCatalog();
      },
      view: (id) => {
        const product = products.find((product) => product.id === id);
        if (product) openProduct(product);
      },
    }),
    [openProduct, showCatalog],
  );
  function resetFilters() {
    setCategory("All robots");
    setQuery("");
    setPriceLimit(3000);
    setSort("featured");
  }

  return (
    <>
      <a className="skip-link" href="#robots">
        Skip to robots
      </a>
      <div className="announcement">
        <span>Robots for home, work and companionship.</span>
        <button type="button" onClick={() => showCatalog(true)}>
          Meet your robot <Icon name="arrow" size={16} />
        </button>
      </div>
      <header className="site-header container">
        <a href="#" aria-label="MornLark home">
          <Logo />
        </a>
        <nav
          className={menuOpen ? "main-nav is-open" : "main-nav"}
          aria-label="Main navigation"
        >
          <button
            type="button"
            className="nav-link"
            onClick={() => showCatalog(true)}
          >
            Shop robots <Icon name="chevron" size={14} />
          </button>
          <a href="#why-robo" onClick={() => setMenuOpen(false)}>
            Why MornLark?
          </a>
          <a href="#our-story" onClick={() => setMenuOpen(false)}>
            Our story
          </a>
        </nav>
        <div className="header-actions">
          <button
            type="button"
            className={`icon-button ${searchOpen ? "active" : ""}`}
            aria-label="Search robots"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <Icon name="search" />
          </button>
          <button
            type="button"
            className="icon-button favorites-button"
            aria-label={`Saved robots (${favorites.length})`}
            onClick={() => openPanel("favorites")}
          >
            <Icon name="heart" />
            {favorites.length > 0 && (
              <span className="count-dot">{favorites.length}</span>
            )}
          </button>
          <span className="header-divider" />
          <button
            type="button"
            className="bag-button"
            aria-label={`Shopping bag (${cartCount})`}
            onClick={() => openPanel("cart")}
          >
            <Icon name="bag" />
            <span className="bag-label">Bag</span>
            <span className="bag-count">{cartCount}</span>
          </button>
          <button
            type="button"
            className="icon-button mobile-menu"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
        </div>
      </header>
      {searchOpen && (
        <form
          className="search-bar container"
          onSubmit={(e) => {
            e.preventDefault();
            setCategory("All robots");
            showCatalog();
          }}
        >
          <Icon name="search" />
          <input
            autoFocus
            aria-label="Search the robot catalog"
            placeholder="Find your next robot…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCategory("All robots");
            }}
          />
          <button type="submit">
            Search <Icon name="arrow" size={17} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Close search"
            onClick={() => {
              setSearchOpen(false);
              setQuery("");
            }}
          >
            <Icon name="close" size={17} />
          </button>
        </form>
      )}

      <main>
        <section className="hero container" aria-labelledby="hero-title">
          <div className="intro-copy">
            <h1 id="hero-title">
              Robots for
              <br />
              real life.
            </h1>
            <p className="hero-description">
              Find thoughtful companions for your home, workspace and everyday
              routines.
            </p>
            <div className="hero-buttons">
              <button
                type="button"
                className="button button-dark"
                onClick={() => showCatalog(true)}
              >
                Explore robots <Icon name="arrow-up" size={18} />
              </button>
              <button
                type="button"
                className="button button-text"
                onClick={() => {
                  setMatch("");
                  openPanel("match");
                }}
              >
                Find your match <Icon name="arrow" size={18} />
              </button>
            </div>
          </div>
          <figure className="hero-product">
            <div className="hero-image">
              <Image
                src="/images/robot-hero.webp"
                alt="Atlas One, a white humanoid robot with green eyes and articulated hands"
                fill
                priority
                unoptimized
                sizes="(max-width: 960px) 100vw, 55vw"
              />
            </div>
            <figcaption>
              <button
                type="button"
                className="hero-product-label"
                onClick={() => openProduct(products[0])}
              >
                <span>Meet Atlas One</span>
                <span>
                  {money(products[0].price)} <Icon name="arrow-up" size={18} />
                </span>
              </button>
            </figcaption>
          </figure>
        </section>

        <section
          className="catalog container"
          id="robots"
          aria-labelledby="catalog-title"
        >
          <div className="section-heading">
            <div>
              <h2 id="catalog-title">The robot collection.</h2>
            </div>
            <button type="button" className="text-link" onClick={resetFilters}>
              Meet all robots <Icon name="arrow-up" size={17} />
            </button>
          </div>
          <div className="catalog-toolbar">
            <div className="category-tabs" aria-label="Robot categories">
              {categories.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={
                    category === c ? "category-tab selected" : "category-tab"
                  }
                >
                  {c}
                  {c === "All robots" && <span>{products.length}</span>}
                </button>
              ))}
            </div>
            <div className="catalog-controls">
              <div className="filter-wrap">
                <button
                  type="button"
                  className={`filter-button ${priceLimit < 3000 ? "filter-active" : ""}`}
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  aria-expanded={filtersOpen}
                >
                  <Icon name="filter" size={16} />
                  Filters{priceLimit < 3000 && <span className="filter-dot" />}
                </button>
                {filtersOpen && (
                  <div className="filter-popover">
                    <div className="filter-heading">
                      <strong>Make it yours</strong>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Close filters"
                        onClick={() => setFiltersOpen(false)}
                      >
                        <Icon name="close" size={16} />
                      </button>
                    </div>
                    <label htmlFor="price">
                      Maximum price <strong>{money(priceLimit)}</strong>
                    </label>
                    <input
                      id="price"
                      type="range"
                      min="350"
                      max="3000"
                      step="50"
                      value={priceLimit}
                      onChange={(e) => setPriceLimit(Number(e.target.value))}
                    />
                    <div className="filter-bottom">
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => setPriceLimit(3000)}
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        className="button button-dark small"
                        onClick={() => setFiltersOpen(false)}
                      >
                        Show {visibleProducts.length} robots
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <label className="sort-label">
                <span className="sr-only">Sort robots</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                </select>
                <Icon name="chevron" size={14} />
              </label>
            </div>
          </div>
          {(query || priceLimit < 3000) && (
            <div className="active-filters">
              <span>
                {visibleProducts.length}{" "}
                {visibleProducts.length === 1 ? "robot" : "robots"}
                {query && <> matching “{query}”</>}
              </span>
              <button type="button" onClick={resetFilters}>
                Clear filters <Icon name="close" size={13} />
              </button>
            </div>
          )}
          <div className="product-grid">
            {visibleProducts.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-visual">
                  <button
                    type="button"
                    className="product-image-button"
                    onClick={() => openProduct(product)}
                    aria-label={`View ${product.name}`}
                  >
                    <ProductArt product={product} />
                    <span className="quick-view">
                      Take a closer look <Icon name="arrow-up" size={15} />
                    </span>
                  </button>
                  {product.originalPrice && (
                    <span className="product-badge">
                      Save {money(product.originalPrice - product.price)}
                    </span>
                  )}
                  <button
                    type="button"
                    className={`favorite-toggle ${favorites.includes(product.id) ? "is-saved" : ""}`}
                    aria-label={`${favorites.includes(product.id) ? "Unsave" : "Save"} ${product.name}`}
                    aria-pressed={favorites.includes(product.id)}
                    onClick={() => toggleFavorite(product.id)}
                  >
                    <Icon name="heart" size={17} />
                  </button>
                </div>
                <div className="product-info">
                  <div className="product-name-row">
                    <button type="button" onClick={() => openProduct(product)}>
                      <h3>{product.name}</h3>
                    </button>
                  </div>
                  <p>{product.tagline}</p>
                  <p className="product-spec">{product.features[0]}</p>
                  <div className="product-bottom">
                    <div className="product-price">
                      {money(product.price)}
                      {product.originalPrice && (
                        <del>{money(product.originalPrice)}</del>
                      )}
                    </div>
                    <button
                      type="button"
                      className="add-button"
                      onClick={() => addToCart(product)}
                      aria-label={`Add ${product.name} to bag`}
                    >
                      <Icon name="plus" size={19} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {visibleProducts.length === 0 && (
            <div className="empty-state">
              <Icon name="search" size={34} />
              <h3>No robots found.</h3>
              <p>Try a different search or adjust your filters.</p>
              <button
                type="button"
                className="button button-dark"
                onClick={resetFilters}
              >
                Explore all robots <Icon name="arrow" size={16} />
              </button>
            </div>
          )}
          <p className="catalog-caption">
            An illustrative collection. Product details and checkout are
            provided as a preview.
          </p>
        </section>

        <section className="story container" id="our-story">
          <h2>From floor care to desk companions.</h2>
          <div className="story-copy">
            <p>
              We bring together robots that make a practical difference to
              everyday life. Start with what you need, then find the robot that
              fits.
            </p>
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setMatch("");
                openPanel("match");
              }}
            >
              Let’s find your kind of robot <Icon name="arrow-up" size={18} />
            </button>
          </div>
        </section>

        <section
          className="benefits container"
          id="why-robo"
          aria-label="The MornLark promise"
        >
          <div className="benefits-heading">
            <h2>Delivery and support.</h2>
            <p className="service-note">
              Demo store. Policies are illustrative until orders open.
            </p>
          </div>
          <div className="benefits-list">
            {[
              {
                icon: "truck",
                title: "Free shipping",
                text: "On every robot, everywhere.",
              },
              {
                icon: "shield",
                title: "2-year warranty",
                text: "A 2-year warranty, included.",
              },
              {
                icon: "return",
                title: "30-day returns",
                text: "Easy returns. No hard feelings.",
              },
              {
                icon: "headphones",
                title: "Real human support",
                text: "Help from a person, when you need it.",
              },
            ].map((item) => (
              <div className="benefit" key={item.title}>
                <Icon name={item.icon as IconName} size={25} />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer container">
        <div>
          <a href="#" aria-label="MornLark home">
            <Logo />
          </a>
          <p>Find a robot that fits your everyday.</p>
        </div>
        <div className="footer-links">
          <button type="button" onClick={() => openPanel("shipping")}>
            Shipping & delivery
          </button>
          <button type="button" onClick={() => openPanel("returns")}>
            Returns & warranty
          </button>
          <button type="button" onClick={() => openPanel("support")}>
            Need a hand?
          </button>
        </div>
        <div className="footer-bottom">
          <span>© 2026 MornLark</span>
          <span>Prices in USD</span>
        </div>
      </footer>

      {toast && (
        <div className="toast" role="status">
          <span className="toast-check">
            <Icon name="check" size={16} />
          </span>
          {toast}
          <button
            type="button"
            onClick={() => {
              setToast("");
              openPanel("cart");
            }}
          >
            View bag <Icon name="arrow" size={15} />
          </button>
        </div>
      )}

      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)} wide>
          <div className="product-detail">
            <ProductArt product={selected} />
            <div className="detail-copy">
              <p className="detail-category">{selected.category}</p>
              <h3>{selected.tagline}</h3>
              <p className="detail-description">{selected.description}</p>
              <div className="detail-price">
                {money(selected.price)}
                {selected.originalPrice && (
                  <del>{money(selected.originalPrice)}</del>
                )}
              </div>
              <ul className="feature-list">
                {selected.features.map((feature) => (
                  <li key={feature}>
                    <Icon name="check" size={16} />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="detail-purchase">
                <div className="quantity-control">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((q) => q - 1)}
                  >
                    <Icon name="minus" size={16} />
                  </button>
                  <span>{quantity}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={quantity >= 99}
                    onClick={() => setQuantity((q) => q + 1)}
                  >
                    <Icon name="plus" size={16} />
                  </button>
                </div>
                <button
                  type="button"
                  className="button button-dark"
                  onClick={() => {
                    addToCart(selected, quantity);
                    setSelected(null);
                  }}
                >
                  Add to bag <Icon name="bag" size={17} />
                </button>
              </div>
              <p className="detail-delivery">
                <Icon name="truck" size={16} />
                Free shipping. 30-day returns.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {panel && (
        <Modal
          key={panel}
          title={
            panel === "cart"
              ? `Your bag (${cartCount})`
              : panel === "favorites"
                ? "Your saved robots"
                : panel === "match"
                  ? "Find your robot"
                  : panel === "checkout"
                    ? "Checkout preview"
                    : panel === "complete"
                      ? "Demo order complete"
                      : panel === "shipping"
                        ? "Shipping and delivery"
                        : panel === "returns"
                          ? "Returns and warranty"
                          : "Customer support"
          }
          onClose={() => setPanel(null)}
        >
          {panel === "cart" &&
            (cartCount === 0 ? (
              <div className="empty-state">
                <Icon name="bag" size={38} />
                <h3>Your bag is empty.</h3>
                <p>Explore the collection to find your robot.</p>
                <button
                  type="button"
                  className="button button-dark"
                  onClick={() => {
                    setPanel(null);
                    showCatalog(true);
                  }}
                >
                  Explore robots <Icon name="arrow" size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {products
                    .filter((p) => cart[p.id])
                    .map((p) => (
                      <div className="cart-item" key={p.id}>
                        <ProductArt product={p} />
                        <div className="cart-item-copy">
                          <button
                            type="button"
                            className="cart-item-name"
                            onClick={() => openProduct(p)}
                          >
                            {p.name}
                          </button>
                          <span>{money(p.price)}</span>
                          <div className="quantity-control">
                            <button
                              type="button"
                              aria-label={`Decrease ${p.name} quantity`}
                              onClick={() => updateQuantity(p.id, -1)}
                            >
                              <Icon name="minus" size={14} />
                            </button>
                            <span>{cart[p.id]}</span>
                            <button
                              type="button"
                              aria-label={`Increase ${p.name} quantity`}
                              disabled={cart[p.id] >= 99}
                              onClick={() => updateQuantity(p.id, 1)}
                            >
                              <Icon name="plus" size={14} />
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Remove ${p.name}`}
                          onClick={() =>
                            setCart((c) => {
                              const next = { ...c };
                              delete next[p.id];
                              return next;
                            })
                          }
                        >
                          <Icon name="close" size={16} />
                        </button>
                      </div>
                    ))}
                </div>
                <div className="cart-summary">
                  <div>
                    <span>Subtotal</span>
                    <strong>{money(subtotal)}</strong>
                  </div>
                  <div>
                    <span>Shipping</span>
                    <span className="green-text">On us</span>
                  </div>
                  <p>Shipping included. Taxes excluded in this preview.</p>
                  <button
                    type="button"
                    className="button button-dark full-width"
                    onClick={() => setPanel("checkout")}
                  >
                    Continue to checkout <Icon name="arrow" size={17} />
                  </button>
                  <p className="demo-note">
                    Demo store. No payment is collected.
                  </p>
                </div>
              </>
            ))}
          {panel === "favorites" &&
            (favorites.length === 0 ? (
              <div className="empty-state">
                <Icon name="heart" size={38} />
                <h3>Keep your favorites close.</h3>
                <p>Tap the heart on a robot to save it here for later.</p>
                <button
                  type="button"
                  className="button button-dark"
                  onClick={() => {
                    setPanel(null);
                    showCatalog(true);
                  }}
                >
                  Find a favorite <Icon name="arrow" size={16} />
                </button>
              </div>
            ) : (
              <div className="saved-list">
                {products
                  .filter((p) => favorites.includes(p.id))
                  .map((p) => (
                    <div className="saved-item" key={p.id}>
                      <ProductArt product={p} />
                      <div>
                        <button
                          type="button"
                          className="cart-item-name"
                          onClick={() => openProduct(p)}
                        >
                          {p.name}
                        </button>
                        <p>{money(p.price)}</p>
                        <button
                          type="button"
                          className="text-link"
                          onClick={() => addToCart(p)}
                        >
                          Add to bag <Icon name="plus" size={14} />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="icon-button is-saved"
                        aria-label={`Unsave ${p.name}`}
                        onClick={() => toggleFavorite(p.id)}
                      >
                        <Icon name="heart" size={18} />
                      </button>
                    </div>
                  ))}
              </div>
            ))}
          {panel === "match" && (
            <div className="match-content">
              <p>What would make your everyday a little better?</p>
              <div className="match-options">
                {[
                  {
                    id: "cleanbot",
                    icon: "spark",
                    label: "A home that takes care of itself",
                    text: "Less cleaning, more living.",
                  },
                  {
                    id: "scout",
                    icon: "heart",
                    label: "A little adventure and company",
                    text: "Meet your four-legged sidekick.",
                  },
                  {
                    id: "atlas",
                    icon: "bag",
                    label: "A more capable workday",
                    text: "An extra pair of very smart hands.",
                  },
                  {
                    id: "miko",
                    icon: "headphones",
                    label: "A friend for my desk",
                    text: "Small size. Big personality.",
                  },
                ].map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    className={
                      match === option.id
                        ? "match-option chosen"
                        : "match-option"
                    }
                    onClick={() => setMatch(option.id)}
                  >
                    <Icon name={option.icon as IconName} size={23} />
                    <span>
                      <strong>{option.label}</strong>
                      <span>{option.text}</span>
                    </span>
                    <Icon
                      name={match === option.id ? "check" : "arrow"}
                      size={17}
                    />
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={!match}
                className="button button-dark full-width"
                onClick={() => {
                  const robot = products.find((p) => p.id === match);
                  if (robot) openProduct(robot);
                }}
              >
                Meet your match <Icon name="arrow" size={17} />
              </button>
            </div>
          )}
          {panel === "checkout" && (
            <form
              className="checkout-form"
              data-endpoint=""
              onSubmit={(e) => {
                e.preventDefault();
                setOrder(`MORNLARK-${Date.now().toString(36).toUpperCase()}`);
                setCart({});
                setPanel("complete");
              }}
            >
              <div className="checkout-notice">
                <Icon name="shield" size={23} />
                <p>
                  This is a demo checkout. No payment will be collected and no
                  products will be shipped. Your details stay in this form and
                  are not submitted.
                </p>
              </div>
              <label>
                Full name
                <input
                  required
                  name="name"
                  autoComplete="name"
                  placeholder="Your name"
                />
              </label>
              <label>
                Email address
                <input
                  required
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </label>
              <label>
                Delivery address
                <input
                  required
                  name="address"
                  autoComplete="street-address"
                  placeholder="Street address"
                />
              </label>
              <div className="checkout-total">
                <span>Preview total, shipping included</span>
                <strong>{money(subtotal)}</strong>
              </div>
              <button className="button button-dark full-width" type="submit">
                Complete demo order <Icon name="arrow" size={17} />
              </button>
              <button
                className="text-link checkout-back"
                type="button"
                onClick={() => setPanel("cart")}
              >
                Back to your bag
              </button>
            </form>
          )}
          {panel === "complete" && (
            <div className="empty-state complete-state">
              <span className="success-icon">
                <Icon name="check" size={30} />
              </span>
              <h3>That’s one step closer to the future.</h3>
              <p>
                Your demo order <strong>{order}</strong> is complete. No payment
                was taken and nothing will be shipped.
              </p>
              <button
                type="button"
                className="button button-dark"
                onClick={() => {
                  setPanel(null);
                  showCatalog(true);
                }}
              >
                Keep exploring <Icon name="arrow" size={17} />
              </button>
            </div>
          )}
          {panel === "shipping" && (
            <div className="info-content">
              <Icon name="truck" size={36} />
              <h3>A smoother journey, from us to you.</h3>
              <p>
                Our planned shipping offer includes free standard delivery on
                every robot, with tracking from dispatch to doorstep.
              </p>
              <p>
                This is a demonstration storefront. Delivery destinations,
                estimated arrival dates, and fulfillment will be available when
                the store opens for orders.
              </p>
            </div>
          )}
          {panel === "returns" && (
            <div className="info-content">
              <Icon name="return" size={36} />
              <h3>Good relationships take a little time.</h3>
              <p>
                Our planned promise: 30 days to find your rhythm together, plus
                a 2-year warranty for peace of mind.
              </p>
              <p>
                This demonstration store does not accept paid orders. Final
                return and warranty terms will be published before the store
                opens.
              </p>
            </div>
          )}
          {panel === "support" && (
            <div className="info-content">
              <Icon name="headphones" size={36} />
              <h3>Finding your first robot?</h3>
              <p>
                Start with our quick match finder. Tell us what would make your
                day better, and we’ll introduce you to a robot that fits.
              </p>
              <button
                type="button"
                className="button button-dark"
                onClick={() => {
                  setMatch("");
                  setPanel("match");
                }}
              >
                Find my match <Icon name="arrow" size={17} />
              </button>
              <p className="demo-note">
                Human support will be available when this demo store opens for
                orders.
              </p>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
