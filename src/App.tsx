import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Header, Footer } from "./components/layout";
import {
  Home,
  Login,
  Dashboard,
  Collections,
  CollectionDetail,
  CollectionProductCustomizer,
} from "./pages";
import "./styles/global.css";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
};

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Header />
              <main>
                <Home />
              </main>
              <Footer />
            </>
          }
        />
        <Route
          path="/bo-suu-tap"
          element={
            <>
              <Header />
              <main>
                <Collections />
              </main>
              <Footer />
            </>
          }
        />
        <Route
          path="/bo-suu-tap/:slug/san-pham/:productId/custom"
          element={
            <>
              <Header />
              <main>
                <CollectionProductCustomizer />
              </main>
              <Footer />
            </>
          }
        />
        <Route
          path="/bo-suu-tap/:slug"
          element={
            <>
              <Header />
              <main>
                <CollectionDetail />
              </main>
              <Footer />
            </>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard/*" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
