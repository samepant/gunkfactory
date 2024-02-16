import {
  cameras,
  controls,
  drawCommands,
  entitiesFromSolids,
  prepareRender,
} from "@jscad/regl-renderer";
import { cameraState } from "@jscad/regl-renderer/types/cameras/perspectiveCamera";
import { controlsState } from "@jscad/regl-renderer/types/controls/orbitControls";
import * as renderingDefaults from "@jscad/regl-renderer/types/rendering/renderDefaults";
import { InitializationOptions } from "regl";
import { Geom2, Geom3 } from "@jscad/modeling/src/geometries/types";

import classes from "./renderer.module.css";
import { useEffect, useLayoutEffect, useRef } from "react";
import { initialState } from "./initial";

export interface RendererProps {
  animate?: boolean;
  glOptions?: InitializationOptions;
  height?: number;
  options?: {
    axisOptions?: {
      show?: boolean;
    };
    gridOptions?: {
      show?: boolean;
      color?: number[];
      subColor?: number[];
      fadeOut?: boolean;
      transparent?: boolean;
      size?: number[];
      ticks?: number[];
    };
    renderingOptions?: typeof renderingDefaults;
    viewerOptions?: {
      initialPosition?: number[];
      panSpeed?: number;
      rotateSpeed?: number;
      zoomSpeed?: number;
    };
  };
  solids: Geom2[] | Geom3[];
  width?: number;
}

export interface RendererState {
  camera?: typeof cameraState;
  controls?: typeof controlsState;
  element: HTMLDivElement | null;
  inputs: {
    shift: "up" | "down";
    mouse: "up" | "down";
  };
  panDelta: number[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (content: any) => void;
  rotateDelta: number[];
  zoomDelta: number;
}

const Renderer = (props: RendererProps) => {
  const perspectiveCamera = useRef(cameras.perspective);
  const orbitControls = useRef(controls.orbit);
  const cadElement = useRef<HTMLDivElement>(null);

  const width = useRef(0);
  const height = useRef(0);

  const lastX = useRef(0);
  const lastY = useRef(0);

  const rotateSpeed = 0.002;
  const panSpeed = 1;
  const zoomSpeed = 0.02;
  const zoomMin = 3;
  const zoomMax = 400;

  const rotateDelta = useRef([0, 0]);
  const panDelta = useRef([0, 0]);
  const zoomDelta = useRef(0);
  const pointerDown = useRef(false);

  const state = useRef<RendererState>(initialState(props.options));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderer = useRef<((content: any) => void) | null>(null);
  const entities = useRef(entitiesFromSolids({}, ...props.solids));

  useEffect(() => {
    entities.current = entitiesFromSolids({}, ...props.solids);
  }, [props.solids]);

  useEffect(() => {
    // setup to only run once
    if (cadElement.current === null) return;
    if (renderer.current !== null) return;
    width.current = cadElement.current.clientWidth;
    height.current = cadElement.current.clientHeight;

    // prepare the camera for birds eye view
    const defaultOverrides = {
      position: [0, 0, 100],
      target: [0, 0, 0],
    };

    state.current.camera = Object.assign(
      {},
      cameras.perspective.defaults,
      defaultOverrides
    );

    if (state.current.camera === undefined) return;
    perspectiveCamera.current.setProjection(
      state.current.camera,
      state.current.camera,
      {
        width: width.current,
        height: height.current,
      }
    );
    perspectiveCamera.current.update(
      state.current.camera,
      state.current.camera
    );

    // prepare the controls
    state.current.controls = orbitControls.current.defaults;

    // prepare the renderer
    const setupOptions = {
      glOptions: { container: cadElement.current },
    };
    renderer.current = prepareRender(setupOptions);
  }, []);

  const gridOptions = {
    visuals: {
      drawCmd: "drawGrid",
      show: true,
    },
    size: [500, 500],
    ticks: [10, 1],
    color: [186, 217, 55, 1],
    subColor: [186, 217, 55, 0.5],
  };

  // the heart of rendering, as themes, controls, etc change
  const updateView = useRef(true);

  const doRotatePanZoom = () => {
    if (
      state.current.camera === undefined ||
      state.current.controls === undefined
    )
      return;

    if (rotateDelta.current[0] || rotateDelta.current[1]) {
      const updated = orbitControls.current.rotate(
        {
          controls: state.current.controls,
          camera: state.current.camera,
          speed: rotateSpeed,
        },
        rotateDelta.current
      );
      state.current.controls = {
        ...state.current.controls,
        ...updated.controls,
      };
      updateView.current = true;
      rotateDelta.current = [0, 0];
    }

    if (panDelta.current[0] || panDelta.current[1]) {
      const updated = orbitControls.current.pan(
        {
          controls: state.current.controls,
          camera: state.current.camera,
          speed: panSpeed,
        },
        panDelta.current
      );
      state.current.controls = {
        ...state.current.controls,
        ...updated.controls,
      };
      panDelta.current = [0, 0];
      state.current.camera = { ...state.current.camera, ...updated.camera };
      updateView.current = true;
    }

    if (zoomDelta) {
      const updated = orbitControls.current.zoom(
        {
          controls: state.current.controls,
          camera: state.current.camera,
          speed: zoomSpeed,
        },
        zoomDelta.current
      );

      state.current.controls = {
        ...state.current.controls,
        ...updated.controls,
      };
      zoomDelta.current = 0;
      updateView.current = true;
    }
  };

  const updateAndRender = () => {
    if (cadElement.current === null || !renderer.current) return;
    doRotatePanZoom();

    if (
      updateView.current &&
      state.current.camera !== undefined &&
      state.current.controls !== undefined
    ) {
      const updates = orbitControls.current.update({
        controls: state.current.controls,
        camera: state.current.camera,
      });
      state.current.controls = {
        ...state.current.controls,
        ...updates.controls,
      };
      updateView.current = updates.controls.changed; // for elasticity in rotate / zoom

      // enforce zoom limits
      if (updates.camera.position[2] < zoomMin) {
        updates.camera.position[2] = zoomMin;
      }
      if (updates.camera.position[2] > zoomMax) {
        updates.camera.position[2] = zoomMax;
      }

      state.current.camera = { ...state.current.camera, ...updates.camera };
      perspectiveCamera.current.update(state.current.camera);

      renderer.current({
        camera: state.current.camera,
        rendering: {
          background: [0, 0, 0, 0],
          meshColor: [0, 0.6, 1, 1],
          lightColor: [1, 1, 1, 1],
          lightDirection: [0.2, 0.2, 1],
          lightPosition: [100, 200, 100],
          ambientLightAmount: 0.3,
          diffuseLightAmount: 0.89,
          specularLightAmount: 0.16,
          materialShininess: 8.0,
        },
        drawCommands: {
          drawAxis: drawCommands.drawAxis,
          drawGrid: drawCommands.drawGrid,
          drawLines: drawCommands.drawLines,
          drawMesh: drawCommands.drawMesh,
        },
        // define the visual content
        entities: [gridOptions, ...entities.current],
      });
    }
    window.requestAnimationFrame(updateAndRender);
  };

  const requestId = useRef<number>(0);

  useLayoutEffect(() => {
    requestId.current = requestAnimationFrame(updateAndRender);
    return () => {
      cancelAnimationFrame(requestId.current);
    };
  }, []);

  // convert HTML events (mouse movement) to viewer changes

  const moveHandler = (ev: PointerEvent) => {
    if (cadElement.current === null) return;
    if (!pointerDown.current) return;
    const dx = lastX.current - ev.pageX;
    const dy = ev.pageY - lastY.current;

    const shiftKey = ev.shiftKey === true;
    if (shiftKey) {
      rotateDelta.current[0] -= dx;
      // rotateDelta.current[1] -= dy;
    } else {
      panDelta.current[0] += dx;
      panDelta.current[1] += dy;
    }

    lastX.current = ev.pageX;
    lastY.current = ev.pageY;

    ev.preventDefault();
  };
  const downHandler = (ev: PointerEvent) => {
    if (cadElement.current === null) return;
    pointerDown.current = true;
    lastX.current = ev.pageX;
    lastY.current = ev.pageY;
    cadElement.current.setPointerCapture(ev.pointerId);
  };

  const upHandler = (ev: PointerEvent) => {
    if (cadElement.current === null) return;
    pointerDown.current = false;
    cadElement.current.releasePointerCapture(ev.pointerId);
  };

  const wheelHandler = (ev: WheelEvent) => {
    zoomDelta.current += ev.deltaY;
    ev.preventDefault();
  };

  useEffect(() => {
    const cadEl = cadElement.current;
    if (!cadEl) return;
    cadEl.addEventListener("pointermove", moveHandler);
    cadEl.addEventListener("pointerdown", downHandler);
    cadEl.addEventListener("pointerup", upHandler);
    cadEl.addEventListener("wheel", wheelHandler);

    return () => {
      if (!cadEl) return;
      cadEl.removeEventListener("pointermove", moveHandler);
      cadEl.removeEventListener("pointerdown", downHandler);
      cadEl.removeEventListener("pointerup", upHandler);
      cadEl.removeEventListener("wheel", wheelHandler);
    };
  }, []);

  return <div className={classes.renderer} ref={cadElement}></div>;
};

export default Renderer;
