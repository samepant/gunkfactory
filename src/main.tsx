import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import { FullSloper } from "./measurements/measurement";
import { Garment } from "./garments/garment";
import Sloper from "./components/sloper/index.tsx";
import GunkCad from "./components/gunk-cad/index.tsx";
import Homepage from "./components/homepage/index.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Homepage />,
    children: [
      {
        path: "sloper",
        element: <Sloper />,
      },
      {
        path: "garments/:slug",
        element: <GunkCad />,
      },
    ],
  },
]);

export const SloperContext = React.createContext<{
  sloper: FullSloper | null;
  setSloper: (sloper: FullSloper | null) => void;
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
  const [sloper, setSloper] = React.useState<FullSloper | null>(null);
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
