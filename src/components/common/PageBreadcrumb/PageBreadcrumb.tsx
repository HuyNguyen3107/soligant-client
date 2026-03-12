import { FiChevronRight } from "react-icons/fi";
import { Link } from "react-router-dom";
import "./PageBreadcrumb.css";

export interface PageBreadcrumbItem {
  label: string;
  to?: string;
}

interface PageBreadcrumbProps {
  items: PageBreadcrumbItem[];
  tone?: "light" | "dark";
  className?: string;
}

const PageBreadcrumb = ({
  items,
  tone = "light",
  className = "",
}: PageBreadcrumbProps) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`page-breadcrumb page-breadcrumb--${tone} ${className}`.trim()}
    >
      <ol className="page-breadcrumb__list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="page-breadcrumb__item">
              {index > 0 ? <FiChevronRight size={14} /> : null}

              {isLast || !item.to ? (
                <span className="page-breadcrumb__current">{item.label}</span>
              ) : (
                <Link to={item.to} className="page-breadcrumb__link">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default PageBreadcrumb;