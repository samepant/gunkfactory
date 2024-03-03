import { useOnClickOutside } from "usehooks-ts";

import Logo from "../logo";
import classes from "./nav.module.css";
import { Garment } from "../../garments/garment";
import garments from "../../garments";
import { useContext, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { GarmentContext } from "../../main";
import { useLocation, useNavigate, useParams } from "react-router-dom";

const Nav = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);

  const { garment, setGarment } = useContext(GarmentContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams();

  const isRoot = location.pathname === "/";

  useOnClickOutside([menuRef, menuButtonRef], () => {
    if (menuOpen) {
      setMenuOpen(false);
    }
  });

  useEffect(() => {
    if (slug && !garment) {
      // set garment from url
      const urlGarment = garments.find((g) => g.slug === slug);
      if (urlGarment) {
        setGarment(urlGarment);
        return;
      }
      navigate("/");
    }
  });

  const handleGarmentClick = (garment: Garment) => {
    setGarment(garment);
    setMenuOpen(false);
    navigate(`/garments/${garment.slug}`);
  };

  const handleLogoClick = () => {
    if (isRoot) return;
    setGarment(null);
    setMenuOpen(false);
    navigate("/");
  };

  const handleSloperClick = () => {
    setMenuOpen(false);
    navigate("/sloper");
  };

  return (
    <>
      <header className={classes.nav}>
        <div className={classes.breadcrumb}>
          <button
            className={clsx(classes.logoButton, isRoot && classes.root)}
            onClick={handleLogoClick}
          >
            <Logo className={classes.logo} />
          </button>
          {!isRoot && (
            <>
              <div className={classes.divider} />
              <div className={classes.garmentName}>
                {slug ? garment?.name : "Sloper"}
              </div>
            </>
          )}
        </div>
        <button
          className={classes.menuButton}
          onClick={() => setMenuOpen(!menuOpen)}
          ref={menuButtonRef}
        >
          menu
        </button>
      </header>
      {menuOpen && (
        <div className={clsx(classes.garmentMenu)} ref={menuRef}>
          <div className={classes.menuSection}>
            <div className={classes.menuHeader}>Garments</div>
            <ul>
              {garments.map((garment) => (
                <li key={garment.slug}>
                  <button
                    onClick={() => handleGarmentClick(garment)}
                    className={clsx(slug === garment.slug && classes.active)}
                  >
                    <div>{garment.name}</div>
                    <div className={classes.version}>{garment.version}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className={classes.menuSection}>
            <div className={classes.menuHeader}>Meta</div>
            <button
              onClick={handleSloperClick}
              className={clsx(
                location.pathname.includes("sloper") && classes.active
              )}
            >
              Sloper
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Nav;
