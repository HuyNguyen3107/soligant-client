import { Hero, FeaturedProducts, About, Contact } from "../../components/home";
import { SEO } from "../../components/common";

const Home = () => {
  return (
    <>
      <SEO
        title="Trang chủ"
        description="Soligant - Giải pháp quản lý doanh nghiệp toàn diện. Khám phá các sản phẩm nổi bật và dịch vụ chất lượng cao của chúng tôi."
        keywords="Soligant, quản lý doanh nghiệp, giải pháp kinh doanh, sản phẩm chất lượng"
      />
      <Hero />
      <FeaturedProducts />
      <About />
      <Contact />
    </>
  );
};

export default Home;
