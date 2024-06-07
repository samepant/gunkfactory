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
import { useSloperStorage } from "../../hooks/useSloperStorage";

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
  const { storedSlopers, updateOrAddSloper } = useSloperStorage();
  const [currentStep, setCurrentStep] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateSloperMeasurement = (value: number) => {
    if (!sloper) return;
    const name = steps[currentStep].name;
    const measurement = steps[currentStep].measurement;
    const updatedSloper = {
      ...sloper,
      measurements: {
        ...sloper.measurements,
        [name]: { ...measurement, value },
      },
    };
    setSloper(updatedSloper);

    updateOrAddSloper(updatedSloper);
  };

  const updateSloperName = (name: string) => {
    if (!sloper) return;
    const updatedSloper = {
      ...sloper,
      name,
    };
    setSloper(updatedSloper);
    updateOrAddSloper(updatedSloper);
  };

  const handleDownload = () => {
    if (!sloper) return;
    const blob = new Blob([JSON.stringify(sloper)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sloper.name}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target?.result) return;
      const sloper = JSON.parse(e.target.result as string) as SavedSloper;
      // validate sloper
      if (!sloper.slug || !sloper.name || !sloper.measurements) {
        alert("Invalid sloper file");
        return;
      }
      updateOrAddSloper(sloper);
      setSloper(sloper);
    };
    reader.readAsText(file);
  };

  return (
    <div className={clsx(classes.container, sloper && classes.sloperForm)}>
      <div className={classes.modal}>
        <div className={classes.header}>
          <h3>Sloper</h3>
        </div>
        {!sloper && (
          <div className={classes.content}>
            <SloperIntro
              setSloper={setSloper}
              storedSlopers={storedSlopers}
              handleImport={handleImport}
            />
          </div>
        )}
        {sloper && (
          <div className={classes.activeLayout}>
            <div className={classes.content}>
              <img
                src={`/references/${steps[currentStep].measurement.referenceImage}`}
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
                      value={
                        sloper.measurements[steps[currentStep].name].value || 0
                      }
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
            </div>

            <div className={classes.measurementTable}>
              <h4>Upper Body</h4>
              <ul>
                {Object.keys(sloper.measurements)
                  .filter((name) => {
                    const measurement =
                      sloper.measurements[name as keyof Measurements];
                    return (
                      measurement.category === MeasurementCategory.UpperBody
                    );
                  })
                  .map((name) => (
                    <li
                      key={name}
                      className={clsx(
                        classes.tableItem,
                        steps[currentStep].name === name &&
                          classes.activeTableItem,
                        sloper.measurements[name as keyof Measurements].value &&
                          classes.complete
                      )}
                      onClick={() => {
                        setCurrentStep(
                          steps.findIndex((step) => step.name === name)
                        );
                        inputRef.current?.focus();
                      }}
                    >
                      <span>{formatCamelCaseWithSpaces(name)}</span>
                    </li>
                  ))}
              </ul>
              <h4>Arm</h4>
              <ul>
                {Object.keys(sloper.measurements)
                  .filter((name) => {
                    const measurement =
                      sloper.measurements[name as keyof Measurements];
                    return measurement.category === MeasurementCategory.Arm;
                  })
                  .map((name) => (
                    <li
                      key={name}
                      className={clsx(
                        classes.tableItem,
                        steps[currentStep].name === name &&
                          classes.activeTableItem,
                        sloper.measurements[name as keyof Measurements].value &&
                          classes.complete
                      )}
                      onClick={() => {
                        setCurrentStep(
                          steps.findIndex((step) => step.name === name)
                        );
                        inputRef.current?.focus();
                      }}
                    >
                      <span>{formatCamelCaseWithSpaces(name)}</span>
                    </li>
                  ))}
              </ul>
              <h4>Lower Body</h4>
              <ul>
                {Object.keys(sloper.measurements)
                  .filter((name) => {
                    const measurement =
                      sloper.measurements[name as keyof Measurements];
                    return (
                      measurement.category === MeasurementCategory.LowerBody
                    );
                  })
                  .map((name) => (
                    <li
                      key={name}
                      className={clsx(
                        classes.tableItem,
                        steps[currentStep].name === name &&
                          classes.activeTableItem,
                        sloper.measurements[name as keyof Measurements].value &&
                          classes.complete
                      )}
                      onClick={() => {
                        setCurrentStep(
                          steps.findIndex((step) => step.name === name)
                        );
                        inputRef.current?.focus();
                      }}
                    >
                      <span>{formatCamelCaseWithSpaces(name)}</span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        )}
        {sloper && (
          <div className={classes.footer}>
            <div className={classes.labeledInput}>
              <label>Name</label>
              <input
                type="text"
                value={sloper.name}
                onChange={(e) => {
                  updateSloperName(e.target.value);
                }}
              />
            </div>
            <button onClick={handleDownload}>Download Sloper</button>
            <div className={classes.labeledInput}>
              <label>Unit</label>
              <select
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
  storedSlopers,
  handleImport,
}: {
  setSloper: (sloper: SavedSloper) => void;
  storedSlopers: SavedSloper[];
  handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <>
    <img alt="A robo croqui" src="/croqui.png" />
    <div className={classes.info}>
      <h4>Create a new sloper</h4>
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
      <label className="button">
        <input type="file" onChange={handleImport} accept="application/json" />
        Import a sloper
      </label>
      {storedSlopers.length > 0 && (
        <>
          <h4 className={classes.updateHeader}>Update an existing sloper</h4>
          <ul className={classes.storedSlopers}>
            {storedSlopers.map((sloper) => (
              <li key={sloper.slug}>
                <button onClick={() => setSloper(sloper)}>{sloper.name}</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  </>
);

export default Sloper;
