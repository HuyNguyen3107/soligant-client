import { Link } from "react-router-dom";
import { FiArrowUpRight } from "react-icons/fi";
import { PageBreadcrumb, SEO } from "../../components/common";
import heroImage from "../../assets/images/product-1.jpg";
import moodImage from "../../assets/images/product-2.jpg";
import detailImage from "../../assets/images/product-3.jpg";
import "./About.css";

const story = [
  {
    text: "Món quà không còn kể câu chuyện của người tặng, không còn khiến người nhận thấy mình được thấu hiểu. Chỉ còn lại một vật thể đẹp… nhưng vô hồn.",
  },
  {
    highlight: true,
    text: "Soligant ra đời từ khoảng trắng ấy. Không để phô bày điều rực rỡ, mà để gợi lại điều tưởng chừng đã bị quên lãng. Rằng một món quà vẫn có thể chạm vào cảm xúc.",
  },
  {
    text: "Một thiết kế riêng – một chi tiết chỉ hai người mới hiểu. Một sự hiện diện thầm lặng, nhưng đủ để người nhận biết: \"Mình đã được nghĩ đến. Ai đó vẫn ở bên – dù chẳng ở cạnh.\"",
  },
];

const tags = ["#Tinhte", "#Chanthanh", "#Chatluong"];

const About = () => {
  return (
    <>
      <SEO
        title="Về chúng tôi"
        description="Tìm hiểu về Soligant - thương hiệu quà tặng tinh tế, cá nhân hóa theo từng khoảnh khắc và cảm xúc."
        keywords="về soligant, thương hiệu quà tặng, quà tặng tinh tế"
      />

      {/* ═══ HERO — ảnh full + quote overlay ═══ */}
      <section className="ab-hero">
        <div className="ab-hero__breadcrumb container">
          <PageBreadcrumb
            tone="dark"
            items={[{ label: "Trang chủ", to: "/" }, { label: "Về chúng tôi" }]}
          />
        </div>
        <div className="ab-hero__img">
          <img src={moodImage} alt="Soligant — quà tặng tinh tế" />
          <div className="ab-hero__overlay" />
        </div>
        <div className="ab-hero__quote-wrap container">
          <blockquote className="ab-hero__quote">
            "Có món quà nào vừa nhỏ bé, vừa độc đáo, vừa giữ lại được cảm xúc không?"
            <span className="ab-hero__quote-mark">"</span>
          </blockquote>
        </div>
      </section>

      {/* ═══ BRAND TITLE ═══ */}
      <section className="ab-brand">
        <div className="container ab-brand__inner">
          <h1 className="ab-brand__title">SOLIGANT.GIFTS</h1>
        </div>
      </section>

      {/* ═══ Ý NGHĨA TÊN GỌI ═══ */}
      <section className="ab-meaning">
        <div className="container ab-meaning__grid">
          <div className="ab-meaning__copy">
            <p className="ab-eyebrow">Ý nghĩa tên gọi</p>
            <h2 className="ab-heading">Ý NGHĨA TÊN GỌI</h2>
            <p>
              <strong>"Soligant"</strong> theo tiếng Thụy Điển có nghĩa là{" "}
              <strong>"chất kết dính"</strong>.
              <br />
              Hay còn được kết hợp từ{" "}
              <strong>"Solidarity"</strong> (sự gắn kết) và{" "}
              <strong>"Elegant"</strong> (sự tinh tế, thanh lịch).
            </p>
            <p>
              Soligant không chỉ là biểu tượng của sự tinh tế mà còn gửi gắm
              tình yêu, sự quan tâm ấm áp. Mỗi món quà đều mang ý nghĩa sâu
              sắc, kết nối những tâm hồn qua từng khoảnh khắc quý giá.
            </p>
            <p>
              Soligant chính là <em>chất keo gắn kết tình cảm</em>, thay bạn
              hiện diện bên cạnh người thương, dù ở xa, mang đến cảm giác được
              chăm sóc và yêu thương.
            </p>
          </div>
          <div className="ab-meaning__media">
            <img src={detailImage} alt="Sản phẩm Soligant" />
          </div>
        </div>
      </section>

      {/* ═══ CÂU CHUYỆN ═══ */}
      <section className="ab-story">
        <div className="container">
          <div className="ab-story__head">
            <h2 className="ab-story__title">
              KHI MÓN QUÀ TRỞ THÀNH<br />CÂU CHUYỆN YÊU THƯƠNG
            </h2>
            <p className="ab-story__sub">
              Trong thời đại mà mọi thứ đều sản xuất hàng loạt – từ lời chúc,
              cảm xúc đến cả quà tặng – sự riêng tư và ý nghĩa dần biến mất.
            </p>
          </div>

          <div className="ab-story__grid">
            {story.map((item, i) => (
              <div
                key={i}
                className={`ab-story__col${item.highlight ? " ab-story__col--highlight" : ""}`}
              >
                <div className="ab-story__col-img">
                  <img
                    src={[heroImage, moodImage, detailImage][i]}
                    alt={`Soligant story ${i + 1}`}
                  />
                </div>
                <p className="ab-story__col-text">{item.text}</p>
              </div>
            ))}
          </div>

          {/* Closing quote */}
          <div className="ab-story__closing">
            <p className="ab-story__closing-quote">
              "Bạn chỉ cần nghĩ đến khoảnh khắc tặng quà"
              <br />
              <strong>Còn lại – để Soligant lo!</strong>
            </p>
            <div className="ab-story__tags">
              {tags.map((t) => (
                <span key={t} className="ab-tag">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="ab-cta">
        <div className="container ab-cta__inner">
          <div className="ab-cta__copy">
            <p className="ab-eyebrow">Sẵn sàng chưa?</p>
            <h2>Tìm món quà mang<br />dấu ấn của bạn</h2>
            <p>
              Đội ngũ Soligant luôn sẵn sàng tư vấn và đồng hành cùng bạn
              trong từng khoảnh khắc đặc biệt.
            </p>
          </div>
          <div className="ab-cta__actions">
            <Link to="/bo-suu-tap" className="ab-btn ab-btn--primary">
              Xem bộ sưu tập <FiArrowUpRight size={16} />
            </Link>
            <Link to="/lien-he" className="ab-btn ab-btn--outline">
              Liên hệ tư vấn
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default About;
