import React from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import { Garment } from "./garments/garment";
import SloperForm from "./components/sloper/index.tsx";
import GunkCad from "./components/gunk-cad/index.tsx";
import Homepage from "./components/homepage/index.tsx";
import { SavedSloper } from "./measurements/index.ts";

const FitPreview = React.lazy(() => import("./fit-preview"));

const router = createHashRouter([
  {
    path: "/",
    element: <Homepage />,
    children: [
      {
        path: "sloper",
        element: <SloperForm />,
      },
      {
        path: "garments/:slug",
        element: <GunkCad />,
      },
      {
        path: "fit/:slug",
        element: <React.Suspense fallback={<div style={{ padding: 30 }}>Loading fit preview…</div>}><FitPreview /></React.Suspense>,
        errorElement: <div role="alert" style={{ padding: 30 }}>The experimental preview could not load. <a style={{ color: "inherit" }} href="#/">Return to garments</a> and try again.</div>,
      },
    ],
  },
]);

export const SloperContext = React.createContext<{
  sloper: SavedSloper | null;
  setSloper: (sloper: SavedSloper | null) => void;
}>({
  sloper: null,
  setSloper: () => {},
});

export const GarmentContext = React.createContext<{
  garment: Garment | null;
  setGarment: (garment: Garment | null) => void;
}>({
  garment: null,
  setGarment: () => {},
});

const Main = () => {
  const [garment, setGarment] = React.useState<Garment | null>(null);
  const [sloper, setSloper] = React.useState<SavedSloper | null>(null);
  return (
    <SloperContext.Provider value={{ sloper, setSloper }}>
      <GarmentContext.Provider value={{ garment, setGarment }}>
        <RouterProvider router={router} />
      </GarmentContext.Provider>
    </SloperContext.Provider>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Main />
  </React.StrictMode>
);
