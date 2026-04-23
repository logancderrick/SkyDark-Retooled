import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { routerFutureFlags } from "../lib/routerFutureFlags";
import type { Connection } from "home-assistant-js-websocket";
import { AppProvider } from "../contexts/AppContext";
import { SkydarkDataContext } from "../contexts/SkydarkDataContext";
import type { SkydarkDataState } from "../hooks/useSkydarkData";
import { buildDemoSkydarkState } from "../dev/demoSkydarkData";
import PhotosView from "./PhotosView";

const apiMocks = vi.hoisted(() => ({
  fetchPhotos: vi.fn(),
  resolveMediaUrl: vi.fn(),
  makeDisplayableMediaUrl: vi.fn((url: string) => `tokenized:${url}`),
}));

vi.mock("../lib/skyDarkApi", async () => {
  const actual = await vi.importActual<typeof import("../lib/skyDarkApi")>("../lib/skyDarkApi");
  return {
    ...actual,
    fetchPhotos: apiMocks.fetchPhotos,
    resolveMediaUrl: apiMocks.resolveMediaUrl,
    makeDisplayableMediaUrl: apiMocks.makeDisplayableMediaUrl,
  };
});

/** Minimal Open-Meteo JSON so `useWeatherData` completes its first fetch in tests. */
const OPEN_METEO_FIXTURE = {
  current: {
    temperature_2m: 70,
    weather_code: 0,
    relative_humidity_2m: 50,
    wind_speed_10m: 5,
    wind_direction_10m: 180,
    apparent_temperature: 68,
    visibility: 16093.4,
  },
  daily: {
    time: ["2026-04-22", "2026-04-23"],
    temperature_2m_max: [75, 76],
    temperature_2m_min: [60, 61],
    precipitation_probability_max: [10, 5],
    precipitation_sum: [0, 0],
    wind_speed_10m_max: [8, 7],
    wind_direction_10m_dominant: [200, 190],
    weather_code: [1, 2],
    sunrise: ["2026-04-22T06:42:00", "2026-04-23T06:43:00"],
    sunset: ["2026-04-22T19:18:00", "2026-04-23T19:19:00"],
  },
};

function renderPhotosWithConn() {
  const data: SkydarkDataState = {
    ...buildDemoSkydarkState(),
    connection: {} as unknown as Connection,
  };
  const skydarkValue = {
    data,
    refetch: vi.fn(),
    refetchEvents: vi.fn(),
    refetchLists: vi.fn(),
  };
  return render(
    <MemoryRouter future={routerFutureFlags} initialEntries={["/photos"]}>
      <SkydarkDataContext.Provider value={skydarkValue}>
        <AppProvider>
          <Routes>
            <Route path="/photos" element={<PhotosView />} />
          </Routes>
        </AppProvider>
      </SkydarkDataContext.Provider>
    </MemoryRouter>
  );
}

describe("PhotosView", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => OPEN_METEO_FIXTURE,
    } as Response);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("resolves media-source photos to a display URL on the grid image", async () => {
    apiMocks.fetchPhotos.mockResolvedValue({
      photos: [
        {
          id: "p1",
          file_path: "media-source://media_source/local/Calendar%20Images/abc.jpg",
          caption: "",
        },
      ],
    });
    apiMocks.resolveMediaUrl.mockResolvedValue("https://ha.test/media/local/x.jpg?access_token=abc");

    renderPhotosWithConn();

    await waitFor(() => {
      const img = screen.getByRole("img", { name: /photo/i });
      expect(img.getAttribute("src")).toContain("ha.test");
    });

    expect(apiMocks.fetchPhotos).toHaveBeenCalled();
    expect(apiMocks.resolveMediaUrl).toHaveBeenCalledWith(
      expect.anything(),
      "media-source://media_source/local/Calendar%20Images/abc.jpg"
    );
  });

  it("uses makeDisplayableMediaUrl for non–media-source file_path values", async () => {
    apiMocks.fetchPhotos.mockResolvedValue({
      photos: [
        {
          id: "p2",
          file_path: "/media/local/Calendar%20Images/direct.jpg",
          caption: "Lake",
        },
      ],
    });

    renderPhotosWithConn();

    await waitFor(() => {
      const img = screen.getByRole("img", { name: /lake/i });
      expect(img.getAttribute("src")).toContain("tokenized:");
    });

    expect(apiMocks.resolveMediaUrl).not.toHaveBeenCalled();
    expect(apiMocks.makeDisplayableMediaUrl).toHaveBeenCalled();
  });
});
