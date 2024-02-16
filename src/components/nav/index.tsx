import { useOnClickOutside } from "usehooks-ts";

import Logo from "../logo";
import classes from "./nav.module.css";
import { Garment } from "../../garments/garment";
import garments from "../../garments";
import { useRef, useState } from "react";
import clsx from "clsx";

interface NavProps {
  setGarment: (garment: Garment | null) => void;
  currentGarment?: Garment | null;
}

const Nav = ({ setGarment, currentGarment }: NavProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);

  useOnClickOutside([menuRef, menuButtonRef], () => {
    if (menuOpen) {
      setMenuOpen(false);
    }
  });

  const handleGarmentClick = (garment: Garment) => {
    setGarment(garment);
    setMenuOpen(false);
  };

  return (
    <>
      <header className={classes.nav}>
        <div className={classes.breadcrumb}>
          <button
            className={clsx(
              classes.logoButton,
              !currentGarment && classes.root
            )}
            onClick={currentGarment ? () => setGarment(null) : () => {}}
          >
            <Logo className={classes.logo} />
          </button>
          {currentGarment && (
            <>
              <div className={classes.divider} />
              <div className={classes.garmentName}>{currentGarment.name}</div>
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
          <div className={classes.menuHeader}>Garments</div>
          <ul>
            {garments.map((garment) => (
              <li key={garment.slug}>
                <button onClick={() => handleGarmentClick(garment)}>
                  <div>{garment.name}</div>
                  <div className={classes.version}>{garment.version}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};

export default Nav;
