import { type GameStore, Season, Weather } from "../engine/Types.ts";

import type { WritableDraft } from "immer";
import { appendLog } from "./GameStore.ts";

export const processDayTime = (state: WritableDraft<GameStore>) => {
  const { meta } = state.gameState;
  const dayTick = meta.gameTick % meta.dayDuration;
  const nightStart = meta.dayDuration * 0.7;
  const nightEnd = meta.dayDuration * 0.2;

  const totalSeasons = Object.values(Season);
  const seasonIndex =
    Math.floor(meta.gameTick / meta.seasonDuration) % totalSeasons.length;
  const nextSeason = totalSeasons[seasonIndex];

  const currentWeather = meta.currentWeather;
  if (meta.currentSeason !== nextSeason) {
    meta.currentSeason = nextSeason;
    appendLog(state, `Наступил следующий сезон: (${nextSeason}})`, "info");
    updateWeather(state);
  }

  meta.isNight = dayTick >= nightStart || dayTick <= nightEnd;
  if (meta.gameTick % 300 === 0) {
    updateWeather(state);
  }
  if (currentWeather != meta.currentWeather) {
    appendLog(
      state,
      `Сменилась погода: ${currentWeather} -> ${meta.currentWeather}`,
      "info",
    );
  }
};

const updateWeather = (state: WritableDraft<GameStore>) => {
  const { meta } = state.gameState;
  const random = Math.random();

  if (meta.currentSeason === Season.Winter) {
    meta.currentWeather = random > 0.4 ? Weather.Snow : Weather.Clear;
  } else if (meta.currentSeason === Season.Summer) {
    meta.currentWeather = random > 0.8 ? Weather.Rain : Weather.Clear;
  } else {
    meta.currentWeather = random > 0.6 ? Weather.Rain : Weather.Clear;
  }
};
