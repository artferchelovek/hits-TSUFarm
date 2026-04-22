export default function MainMenu() {
  return (
    <>
      <p>Главное меню</p>
      <button onClick={() => (window.location.href = "/game")}>
        Создать мир
      </button>
      <p>писька</p>
    </>
  );
}
