import { cameras, controls } from "@jscad/regl-renderer";
import { RendererProps, RendererState } from ".";

export const initialProps = ({
  animate,
  glOptions,
  height,
  options,
  solids,
  width,
}: RendererProps): RendererProps => {
  return {
    animate: animate || false,
    glOptions,
    height: height || window.innerHeight,
    options: {
      axisOptions: {
        show: true,
        ...options?.axisOptions,
      },
      gridOptions: {
        show: true,
        color: [186, 217, 55, 1],
        subColor: [186, 217, 55, 0.5],
        fadeOut: true,
        transparent: true,
        size: [144, 144],
        ticks: [12, 1],
        ...options?.gridOptions,
      },
      renderingOptions: {
        background: [0, 0, 0, 0],
        meshColor: [0, 0.6, 1, 1],
        lightColor: [1, 1, 1, 1],
        lightDirection: [0.2, 0.2, 1],
        lightPosition: [100, 200, 100],
        ambientLightAmount: 0.3,
        diffuseLightAmount: 0.89,
        specularLightAmount: 0.16,
        materialShininess: 8.0,
        ...options?.renderingOptions,
      },
      viewerOptions: {
        initialPosition: [50, -50, 50],
        panSpeed: 0.75,
        rotateSpeed: 0.002,
        zoomSpeed: 0.03,
        ...options?.viewerOptions,
      },
    },
    solids: solids || [],
    width: width || window.innerWidth,
  };
};

export const initialState = (
  options: RendererProps["options"]
): RendererState => {
  return {
    camera: {
      ...cameras.perspective.defaults,
      position: options?.viewerOptions?.initialPosition,
    },
    controls: controls.orbit.defaults,
    element: null,
    inputs: { mouse: "up", shift: "up" },
    panDelta: [0, 0],
    rotateDelta: [0, 0],
    zoomDelta: 0,
  };
};
