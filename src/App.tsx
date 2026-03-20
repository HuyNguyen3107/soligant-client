import { useEffect } from "react";
import type { ReactNode } from "react";
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import { Header, Footer } from "./components/layout";
import {
  Home,
  About,
  Contact,
  Login,
  Dashboard,
  MyOrders,
  Collections,
  CollectionDetail,
  CollectionProductCustomizer,
  CollectionProductBackgroundPicker,
  CollectionProductAddons,
  CollectionBearCustomizer,
  CollectionBearBackgroundPicker,
  CollectionBearAddons,
  CollectionCustomerInfo,
  CollectionOrderReview,
  CollectionOrderPlaced,
  CollectionOrderLookup,
} from "./pages";
import "./styles/global.css";

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
    </Router>
  );
}

export default App;
