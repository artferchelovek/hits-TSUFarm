import { BrowserRouter, Route, Routes } from "react-router";
import GameView from "./views/GameView.tsx";
import MainMenu from "./views/MainMenu/MainMenu.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/game" element={<GameView />} />
      </Routes>
    </BrowserRouter>
  );
}
