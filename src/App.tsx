import { BrowserRouter, Route, Routes } from "react-router";
import MainMenu from "./views/MainMenu.tsx";
import GameView from "./views/GameView.tsx";

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
