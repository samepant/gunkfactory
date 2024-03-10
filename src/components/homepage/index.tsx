import Nav from "../nav";
import { Link, Outlet, useLocation } from "react-router-dom";

import classes from "./homepage.module.css";
import Logo from "../logo";
import garments from "../../garments";
import bracketUrl from "../../assets/bracket.svg";
import Renderer from "../renderer";

const Homepage = () => {
  const location = useLocation();
  const showIntro = location.pathname === "/";
  const showDummyGrid =
    location.pathname === "/" || location.pathname === "/sloper";
  return (
    <>
      <Nav />
      <Outlet />
      {showIntro && (
        <div className={classes.container}>
          <div className={classes.modal}>
            <div className={classes.header}>
              <Logo className={classes.logo} />
            </div>
            <div className={classes.content}>
              <p>Turn body measurements into clothing patterns.</p>
              <div className={classes.manifesto}>
                <img src={bracketUrl} />
                <p>
                  Dissolve labor into process, scale the make to the specific
                  need.
                </p>{" "}
                <p>Escape excess. 😘</p>
              </div>
              <p>Patterns by Sam Panter</p>
            </div>
            <div className={classes.links}>
              <div>
                <p className={classes.linkHeader}>Sloper</p>
                <div className={classes.linkContent}>
                  <p>Set measurements for use with Gunk patterns.</p>
                  <Link to="/sloper" className={classes.garmentLink}>
                    View Slopers
                  </Link>
                </div>
              </div>
              <div>
                <p className={classes.linkHeader}>Available Patterns</p>
                <div>
                  <ul>
                    {garments.map((g) => (
                      <li key={g.slug}>
                        <Link
                          to={`/garments/${g.slug}`}
                          className={classes.garmentLink}
                        >
                          <div>{g.name}</div>
                          <div className={classes.garmentVersion}>
                            {g.version}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className={classes.footer}>
              <a href="https://github.com/samepant/gunkfactory" target="_blank">
                Contribute ↗
              </a>
              <p className={classes.hyperTalic}>Protect Your Family™</p>
            </div>
          </div>
        </div>
      )}
      {showDummyGrid && <Renderer solids={[]} />}
    </>
  );
};

export default Homepage;
