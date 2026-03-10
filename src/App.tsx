import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Header, Footer } from "./components/layout";
import { Home, Login, Dashboard, Collections, CollectionDetail } from "./pages";
import "./styles/global.css";

function App() {
  return (
    <Router>
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
