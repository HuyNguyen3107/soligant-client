import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft } from "react-icons/fi";
import { SEO } from "../../components/common";
import { getErrorMessage } from "../../lib/error";
import { login } from "../../services/auth.service";
import { useAuthStore } from "../../store/auth.store";
import "./Login.css";
import loginBannerImage from "../../assets/images/product-3.jpg";

const Login = () => {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      });
      navigate("/dashboard");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Email hoặc mật khẩu không đúng."));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (/\s/.test(password)) {
      toast.error("Mật khẩu không được chứa khoảng trắng.");
      return;
    }

    loginMutation.mutate({ email, password });
  };

  return (
    <div className="login-page">
      <SEO
        title="Đăng nhập"
        description="Đăng nhập vào tài khoản Soligant của bạn để truy cập hệ thống quản lý và các tính năng dành riêng cho thành viên."
        keywords="đăng nhập, login, Soligant, tài khoản, quản lý"
      />
      <div className="login-container">
        <Link to="/" className="login__back">
          <FiArrowLeft size={20} />
          <span>Về trang chủ</span>
        </Link>

        <div className="login__header">
          <Link to="/" className="login__logo">
            <span className="login__logo-text">Soligant</span>
          </Link>
          <h1 className="login__title">Đăng nhập</h1>
          <p className="login__subtitle">
            Chào mừng bạn quay trở lại! Vui lòng đăng nhập để tiếp tục.
          </p>
        </div>

        <form className="login__form" onSubmit={handleSubmit}>
          <div className="login__form-group">
            <label htmlFor="email" className="login__label">
              Email
            </label>
            <div className="login__input-wrapper">
              <span className="login__input-icon">
                <FiMail size={20} />
              </span>
              <input
                type="email"
                id="email"
                className="login__input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập địa chỉ email của bạn"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="login__form-group">
            <label htmlFor="password" className="login__label">
              Mật khẩu
            </label>
            <div className="login__input-wrapper">
              <span className="login__input-icon">
                <FiLock size={20} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                className="login__input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu của bạn"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login__toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary login__submit"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <>
                <span className="login__spinner"></span>
                Đang xử lý...
              </>
            ) : (
              "Đăng nhập"
            )}
          </button>
        </form>
      </div>

      <div className="login__banner">
        <img
          src={loginBannerImage}
          alt="Soligant Gifts"
          className="login__banner-image"
        />
        <div className="login__banner-content">
          <div className="login__banner-decoration login__banner-decoration--1"></div>
          <div className="login__banner-decoration login__banner-decoration--2"></div>
          <span className="login__banner-logo">Soligant</span>
          <h2 className="login__banner-title">Quà Tặng Tinh Tế</h2>
          <p className="login__banner-text">
            Khám phá bộ sưu tập quà tặng độc đáo, mang đến những khoảnh khắc
            đáng nhớ cho người thân yêu.
          </p>
        </div>
      </div>
      <ToastContainer
        position="top-right"
        autoClose={3500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        style={{ fontFamily: '"UTM-Avo", Arial, sans-serif', fontSize: 14 }}
      />
    </div>
  );
};

export default Login;
