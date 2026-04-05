import { lazy, Suspense, useEffect } from "react";
import type { ReactNode } from "react";
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import { Header, Footer } from "./components/layout";
import "./styles/global.css";

// Lazy load all pages for code splitting
const Home = lazy(() => import("./pages/Home"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Policy = lazy(() => import("./pages/Policy").then((m) => ({ default: m.Policy })));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const Collections = lazy(() => import("./pages/Collections"));
const CollectionDetail = lazy(() =>
  import("./pages/Collections").then((m) => ({ default: m.CollectionDetail }))
);
const CollectionProductCustomizer = lazy(() =>
  import("./pages/Collections").then((m) => ({ default: m.CollectionProductCustomizer }))
);
const CollectionProductBackgroundPicker = lazy(() =>
  import("./pages/Collections").then((m) => ({ default: m.CollectionProductBackgroundPicker }))
);
const CollectionProductAddons = lazy(() =>
  import("./pages/Collections").then((m) => ({ default: m.CollectionProductAddons }))
);
const CollectionBearCustomizer = lazy(() =>
  import("./pages/Collections").then((m) => ({ default: m.CollectionBearCustomizer }))
);
const CollectionBearBackgroundPicker = lazy(() =>
  import("./pages/Collections").then((m) => ({ default: m.CollectionBearBackgroundPicker }))
);
const CollectionBearAddons = lazy(() =>
  import("./pages/Collections").then((m) => ({ default: m.CollectionBearAddons }))
);
const CollectionCustomerInfo = lazy(() =>
  import("./pages/Collections").then((m) => ({ default: m.CollectionCustomerInfo }))
);
const CollectionOrderReview = lazy(() =>
  import("./pages/Collections").then((m) => ({ default: m.CollectionOrderReview }))
);
const CollectionOrderPlaced = lazy(() =>
  import("./pages/Collections").then((m) => ({ default: m.CollectionOrderPlaced }))
);
const CollectionOrderLookup = lazy(() =>
  import("./pages/Collections").then((m) => ({ default: m.CollectionOrderLookup }))
);

const PageLoader = () => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
    <div className="loading-spinner" />
  </div>
);

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
};

const StorefrontLayout = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <Header />
      <main className="app-main">{children}</main>
      <Footer />
    </>
  );
};

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/"
            element={<StorefrontLayout><Home /></StorefrontLayout>}
          />
          <Route
            path="/ve-chung-toi"
            element={<StorefrontLayout><About /></StorefrontLayout>}
          />
          <Route
            path="/lien-he"
            element={<StorefrontLayout><Contact /></StorefrontLayout>}
          />
          <Route
            path="/chinh-sach"
            element={<StorefrontLayout><Policy /></StorefrontLayout>}
          />
          <Route
            path="/bo-suu-tap"
            element={<StorefrontLayout><Collections /></StorefrontLayout>}
          />
          <Route
            path="/bo-suu-tap/:slug/san-pham/:productId/custom"
            element={<StorefrontLayout><CollectionProductCustomizer /></StorefrontLayout>}
          />
          <Route
            path="/bo-suu-tap/:slug/san-pham/:productId/chon-nen"
            element={<StorefrontLayout><CollectionProductBackgroundPicker /></StorefrontLayout>}
          />
          <Route
            path="/bo-suu-tap/:slug/san-pham/:productId/mua-them"
            element={<StorefrontLayout><CollectionProductAddons /></StorefrontLayout>}
          />
          <Route
            path="/bo-suu-tap/:slug/san-pham/:productId/tuy-chinh-gau"
            element={<StorefrontLayout><CollectionBearCustomizer /></StorefrontLayout>}
          />
          <Route
            path="/bo-suu-tap/:slug/san-pham/:productId/chon-nen-gau"
            element={<StorefrontLayout><CollectionBearBackgroundPicker /></StorefrontLayout>}
          />
          <Route
            path="/bo-suu-tap/:slug/san-pham/:productId/mua-them-gau"
            element={<StorefrontLayout><CollectionBearAddons /></StorefrontLayout>}
          />
          <Route
            path="/thong-tin-khach-hang"
            element={<StorefrontLayout><CollectionCustomerInfo /></StorefrontLayout>}
          />
          <Route
            path="/thong-tin-don-hang"
            element={<StorefrontLayout><CollectionOrderReview /></StorefrontLayout>}
          />
          <Route
            path="/don-hang/:orderCode"
            element={<StorefrontLayout><CollectionOrderPlaced /></StorefrontLayout>}
          />
          <Route
            path="/tra-cuu-don-hang"
            element={<StorefrontLayout><CollectionOrderLookup /></StorefrontLayout>}
          />
          <Route
            path="/lich-su-don-hang"
            element={<StorefrontLayout><MyOrders /></StorefrontLayout>}
          />
          <Route
            path="/bo-suu-tap/:slug"
            element={<StorefrontLayout><CollectionDetail /></StorefrontLayout>}
          />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard/*" element={<Dashboard />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
