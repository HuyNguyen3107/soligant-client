import "./FeaturedProducts.css";

interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  badge?: string;
}

const products: Product[] = [
  {
    id: 1,
    name: "Hộp Quà Tặng Cao Cấp",
    price: 850000,
    originalPrice: 980000,
    image: "/src/assets/images/product-1.jpg",
    category: "Bộ quà tặng",
    badge: "Bestseller",
  },
  {
    id: 2,
    name: "Giỏ Quà Sinh Nhật",
    price: 650000,
    image: "/src/assets/images/product-2.jpg",
    category: "Quà sinh nhật",
  },
  {
    id: 3,
    name: "Set Quà Doanh Nghiệp",
    price: 1200000,
    originalPrice: 1450000,
    image: "/src/assets/images/product-3.jpg",
    category: "Quà doanh nghiệp",
    badge: "Sale",
  },
];

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
};

const FeaturedProducts = () => {
  return (
    <section id="products" className="featured-products section">
      <div className="container">
        <div className="section-title">
          <h2>Sản Phẩm Nổi Bật</h2>
          <p>Những món quà được yêu thích nhất tại Soligant</p>
        </div>

        <div className="featured-products__grid">
          {products.map((product) => (
            <article key={product.id} className="product-card">
              <div className="product-card__image-wrapper">
                <img
                  src={product.image}
                  alt={product.name}
                  className="product-card__image"
                />
                {product.badge && (
                  <span
                    className={`product-card__badge product-card__badge--${product.badge.toLowerCase()}`}
                  >
                    {product.badge}
                  </span>
                )}
                <div className="product-card__actions">
                  <button
                    className="product-card__action-btn"
                    aria-label="Xem nhanh"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>
                  <button
                    className="product-card__action-btn"
                    aria-label="Thêm vào giỏ"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="9" cy="21" r="1"></circle>
                      <circle cx="20" cy="21" r="1"></circle>
                      <path d="m1 1 4 4 2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="product-card__content">
                <span className="product-card__category">
                  {product.category}
                </span>
                <h3 className="product-card__name">{product.name}</h3>
                <div className="product-card__price">
                  <span className="product-card__current-price">
                    {formatPrice(product.price)}
                  </span>
                  {product.originalPrice && (
                    <span className="product-card__original-price">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="featured-products__cta">
          <a href="#" className="btn btn-outline">
            Xem tất cả sản phẩm
          </a>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
