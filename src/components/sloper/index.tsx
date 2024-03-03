import { FullSloper } from "../../measurements/measurement";
import { emptySloper } from "../../measurements";
import croquiUrl from "../../assets/croqui.png";
import classes from "./sloper.module.css";
import { useContext } from "react";
import { SloperContext } from "../../main";

const Sloper: React.FC = () => {
  const { sloper, setSloper } = useContext(SloperContext);
  return (
    <div className={classes.container}>
      <div className={classes.modal}>
        <div className={classes.header}>
          <h3>Sloper</h3>
        </div>
        <div className={classes.content}>
          {!sloper && <SloperIntro setSloper={setSloper} />}
        </div>
      </div>
    </div>
  );
};

const SloperIntro = ({
  setSloper,
}: {
  setSloper: (sloper: FullSloper) => void;
}) => (
  <>
    <img alt="A robo croqui" src={croquiUrl} />
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
      <button onClick={() => setSloper(emptySloper)}>Create a sloper</button>
    </div>
  </>
);

export default Sloper;
