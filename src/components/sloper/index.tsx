import {
  emptySloper,
  MeasurementCategory,
  SavedSloper,
} from "../../measurements";
import { createId } from "@paralleldrive/cuid2";
import { useContext, useRef, useState } from "react";
import { SloperContext } from "../../main";
import { Measurement, Measurements } from "../../measurements/measurement";
import { formatCamelCaseWithSpaces } from "../../util/formatting";
import { GunkUnits } from "../../garments/garment";
import classes from "./sloper.module.css";
import generateTwoWords from "../../util/nameGenerator";
import clsx from "clsx";

interface SloperStep {
  name: keyof Measurements;
  measurement: Measurement;
}

const steps: SloperStep[] = Object.keys(emptySloper.measurements).map(
  (name) => ({
    name: name as keyof Measurements,
    measurement: emptySloper.measurements[name as keyof Measurements],
  })
);

const createNewSloper = () => {
  return { ...emptySloper, slug: createId(), name: generateTwoWords() };
};

const Sloper: React.FC = () => {
  const { sloper, setSloper } = useContext(SloperContext);
  const [currentStep, setCurrentStep] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateSloperMeasurement = (value: number) => {
    if (!sloper) return;
    const name = steps[currentStep].name;
    const measurement = steps[currentStep].measurement;
    setSloper({
      ...sloper,
      measurements: {
        ...sloper.measurements,
        [name]: { ...measurement, value },
      },
    });
  };

  return (
    <div className={clsx(classes.container, sloper && classes.sloperForm)}>
      <div className={classes.modal}>
        <div className={classes.header}>
          <h3>Sloper</h3>
        </div>
        <div className={classes.content}>
          {!sloper && <SloperIntro setSloper={setSloper} />}
          {sloper && (
            <>
              <img
                src={`public/references/${steps[currentStep].measurement.referenceImage}`}
              />
              <div className={classes.info}>
                <div className={classes.info}>
                  <h4>{formatCamelCaseWithSpaces(steps[currentStep].name)}</h4>
                  <p>{steps[currentStep].measurement.description}</p>
                  {steps[currentStep].measurement.category !==
                    MeasurementCategory.Arm && (
                    <p className={classes.referenceHelper}>
                      Refer to line #{steps[currentStep].measurement.bookId} in
                      the image.
                    </p>
                  )}
                </div>
                <div className={classes.interactive}>
                  <div className={classes.labeledInput}>
                    <input
                      ref={inputRef}
                      type="number"
                      value={sloper.measurements[steps[currentStep].name].value}
                      onChange={(e) => {
                        updateSloperMeasurement(Number(e.target.value));
                      }}
                    />
                    <p>{sloper.unit}</p>
                  </div>
                  <div className={classes.buttonGroup}>
                    <button
                      onClick={() => {
                        if (currentStep === 0) {
                          setCurrentStep(steps.length - 1);
                          return;
                        }
                        setCurrentStep(currentStep - 1);
                      }}
                    >
                      Previous
                    </button>

                    <button
                      onClick={() => {
                        if (currentStep === steps.length - 1) {
                          setCurrentStep(0);
                          return;
                        }
                        setCurrentStep(currentStep + 1);
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        {sloper && (
          <div className={classes.footer}>
            <div className={classes.labeledInput}>
              <label>Name</label>
              <input
                type="text"
                value={sloper.name}
                onChange={(e) => {
                  setSloper({ ...sloper, name: e.target.value });
                }}
              />
            </div>
            <div className={classes.labeledInput}>
              <label>Unit</label>
              <select
                defaultValue="in"
                onChange={(e) => {
                  setSloper({ ...sloper, unit: e.target.value as GunkUnits });
                }}
                value={sloper.unit}
              >
                <option value="in">inches</option>
                <option value="cm">cm</option>
                <option value="mm">mm</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SloperIntro = ({
  setSloper,
}: {
  setSloper: (sloper: SavedSloper) => void;
}) => (
  <>
    <img alt="A robo croqui" src="/public/croqui.png" />
    <div className={classes.info}>
      <h4>Create a new Sloper</h4>
      <p>
        A sloper is the basic building block of a pattern. Based off the
        measurements of a specific person, it is used to make a custom garment.
      </p>
      <p>
        This tool will walk you through taking measurements, storing your data
        locally. it will never leave your computer.
      </p>
      <button onClick={() => setSloper(createNewSloper())}>
        Create a sloper
      </button>
    </div>
  </>
);

export default Sloper;
