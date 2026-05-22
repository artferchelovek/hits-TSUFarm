import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../../contexts/AuthContext.tsx";
import MapCanvas from "../../components/game/MapCanvas";
import styles from "./RegisterView.module.css";

export default function RegisterView() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);
    try {
      await register(username, email, password);
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.background}>
        <MapCanvas isBackground={true} />
      </div>

      <div className={styles.overlay} />

      <div className={styles.content}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <h1 className={styles.title}>Регистрация</h1>

          {error && <p className={styles.error}>{error}</p>}

          <input
            className={styles.input}
            type="text"
            placeholder="Имя пользователя"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={3}
            maxLength={32}
            required
          />

          <input
            className={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            className={styles.input}
            type="password"
            placeholder="Пароль (мин. 6 символов)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />

          <input
            className={styles.input}
            type="password"
            placeholder="Подтвердите пароль"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={6}
            required
          />

          <button className={styles.btn} type="submit" disabled={loading}>
            {loading ? "Регистрация..." : "Зарегистрироваться"}
          </button>

          <p className={styles.link}>
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </p>

          <p className={styles.link}>
            <Link to="/">На главную</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
