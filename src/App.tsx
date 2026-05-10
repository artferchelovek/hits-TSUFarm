import { BrowserRouter, Route, Routes } from "react-router";
import GameView from "./views/GameView/GameView.tsx";
import MainMenu from "./views/MainMenu/MainMenu.tsx";
import PlugView from "./views/PlugView/PlugView.tsx";

export default function App() {
  if (window.innerWidth <= 1200) {
    return <PlugView />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/game" element={<GameView />} />
      </Routes>
    </BrowserRouter>
  );
}
