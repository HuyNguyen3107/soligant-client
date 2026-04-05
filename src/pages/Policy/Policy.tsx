import { Link } from "react-router-dom";
import { FiArrowUpRight, FiCheckCircle } from "react-icons/fi";
import { PageBreadcrumb, SEO } from "../../components/common";
import "./Policy.css";

const Policy = () => {
  return (
    <>
      <SEO
        title="Chính sách bảo hành"
        description="Chính sách bảo hành & hủy đơn của Soligant – áp dụng cho sản phẩm khung tranh Dear You và các sản phẩm thiết kế theo yêu cầu."
        keywords="chính sách bảo hành soligant, hủy đơn, đổi trả"
      />

      {/* ── HERO ── */}
      <section className="pl-hero">
        <div className="container pl-hero__content">
          <PageBreadcrumb
            tone="dark"
            items={[
              { label: "Trang chủ", to: "/" },
              { label: "Chính sách bảo hành" },
            ]}
          />
          <p className="pl-eyebrow">Soligant cam kết</p>
          <h1>Chính sách bảo hành & hủy đơn</h1>
        </div>
      </section>

      {/* ── NỘI DUNG ── */}
      <section className="pl-body">
        <div className="container pl-body__grid">
          {/* ── Cột nội dung chính ── */}
          <div className="pl-content">
            {/* 1. BẢO HÀNH */}
            <article className="pl-block">
              <div className="pl-block__num">01</div>
              <h2 className="pl-block__title">Bảo hành sản phẩm</h2>

              <div className="pl-case">
                <h3 className="pl-case__label pl-case__label--primary">
                  Trường hợp 1 — Lỗi nghiêm trọng
                </h3>
                <p className="pl-case__desc">
                  Sản phẩm lỗi nghiêm trọng: sai hoàn toàn / hỏng / mất mảnh /
                  không sử dụng được.
                </p>
                <ul className="pl-list">
                  <li>Shop sẽ gửi lại sản phẩm mới 100%.</li>
                  <li>
                    Chi phí vận chuyển lần 2 do Soligant chi trả, tuy nhiên phí
                    ship đơn ban đầu vẫn do khách thanh toán như bình thường.
                  </li>
                  <li>
                    Hàng lỗi sẽ được thu hồi khi gửi đơn mới, khách không cần
                    gửi về trước.
                  </li>
                </ul>
              </div>

              <div className="pl-case">
                <h3 className="pl-case__label pl-case__label--secondary">
                  Trường hợp 2 — Lỗi nhỏ
                </h3>
                <p className="pl-case__desc">
                  Lỗi nhỏ khi nhận: như lỏng / rơi LEGO, sai nền nhỏ.
                </p>
                <ul className="pl-list">
                  <li>
                    Soligant sẽ hướng dẫn xử lý tại nhà (dán lại LEGO, chỉnh sửa
                    nhỏ...).
                  </li>
                  <li>
                    Nếu lỗi không thể khắc phục, shop sẽ xử lý linh động tùy
                    từng tình huống (gửi chi tiết bổ sung, giảm giá đơn sau...).
                  </li>
                </ul>
              </div>

              <div className="pl-case">
                <h3 className="pl-case__label">Trường hợp khác</h3>
                <p className="pl-case__desc">
                  Những trường hợp không nằm trong 2 mục trên sẽ được xem xét và
                  hỗ trợ linh hoạt, với tiêu chí đảm bảo quyền lợi khách hàng.
                </p>
              </div>
            </article>

            {/* 2. XÁC NHẬN ĐƠN */}
            <article className="pl-block">
              <div className="pl-block__num">02</div>
              <h2 className="pl-block__title">
                Xác nhận đơn hàng & demo thiết kế
              </h2>
              <ul className="pl-list">
                <li>
                  Sau khi gửi demo LEGO, khách vui lòng phản hồi trong vòng{" "}
                  <strong>12 giờ</strong> để xác nhận.
                </li>
                <li>
                  Sau 12h không có phản hồi, đơn hàng sẽ được tự động hủy để
                  tránh tồn đọng và ảnh hưởng đến tiến độ sản xuất.
                </li>
                <li>
                  Nếu vẫn có nhu cầu, bạn vui lòng đặt lại đơn mới — Soligant
                  rất sẵn lòng hỗ trợ lại từ đầu.
                </li>
              </ul>
            </article>

            {/* 3. HỦY ĐƠN */}
            <article className="pl-block">
              <div className="pl-block__num">03</div>
              <h2 className="pl-block__title">Chính sách hủy đơn</h2>

              <div className="pl-case">
                <h3 className="pl-case__label pl-case__label--secondary">
                  Sau 12 giờ kể từ thanh toán
                </h3>
                <ul className="pl-list">
                  <li>
                    Nếu muốn hủy đơn, shop xin phép thu{" "}
                    <strong>30% giá trị đơn hàng</strong> để bù chi phí đã phát
                    sinh (thiết kế, nhân công, nguyên liệu...).
                  </li>
                </ul>
              </div>

              <div className="pl-case">
                <h3 className="pl-case__label pl-case__label--primary">
                  Sau khi lên mẫu & tiến hành sản xuất
                </h3>
                <ul className="pl-list">
                  <li>
                    Không hỗ trợ hủy đơn dưới bất kỳ hình thức nào (vì đây là
                    sản phẩm cá nhân hóa, không thể tái sử dụng hoặc bán lại).
                  </li>
                  <li>
                    Trường hợp không nhận hàng / cố tình né tránh, đơn sẽ bị ghi
                    nhận và từ chối hỗ trợ trong các đơn hàng tiếp theo.
                  </li>
                </ul>
              </div>
            </article>
          </div>

          {/* ── Sidebar cam kết ── */}
          <aside className="pl-sidebar">
            <div className="pl-commit">
              <h3 className="pl-commit__title">Soligant cam kết</h3>
              <ul className="pl-commit__list">
                <li>
                  <FiCheckCircle size={16} />
                  <span>
                    Làm hết sức để từng món quà đến tay bạn đúng – đủ – đẹp.
                  </span>
                </li>
                <li>
                  <FiCheckCircle size={16} />
                  <span>
                    Sẵn sàng lắng nghe và xử lý linh hoạt, công bằng cho mỗi
                    tình huống.
                  </span>
                </li>
              </ul>
            </div>

            <div className="pl-contact-box">
              <p className="pl-contact-box__label">Cần hỗ trợ thêm?</p>
              <h4>Liên hệ trực tiếp với Soligant</h4>
              <a href="tel:0989804006" className="pl-contact-box__phone">
                0989 804 006
              </a>
              <a
                href="mailto:soligant.gifts@gmail.com"
                className="pl-contact-box__email"
              >
                soligant.gifts@gmail.com
              </a>
              <Link to="/lien-he" className="pl-contact-box__btn">
                Gửi yêu cầu tư vấn <FiArrowUpRight size={14} />
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
};

export default Policy;
