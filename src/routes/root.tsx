import Nav from "../components/nav";
import { Outlet } from "react-router-dom";

function Root() {
  return (
    <>
      <Nav />
      <Outlet />
    </>
  );
}

export default Root;
