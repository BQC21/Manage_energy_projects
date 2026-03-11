import { NavLink } from "react-router-dom";


function Navbar() {
    return (
    <nav className="navbar navbar-expand-lg navbar-dark custom-navbar">
        <div className="container-fluid">
            <span className="navbar-brand fw-bold">Project manager</span>
            <button
                className="navbar-toggler"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#navbarNav"
            >
                <span className="navbar-toggler-icon"></span>
            </button>

            <div className="collapse navbar-collapse" id="navbarNav">
                <ul className="navbar-nav ms-auto">

                    <li className="nav-item">
                        <NavLink className="nav-link" to="/">HOME</NavLink>
                    </li>

                </ul>
            </div>
        </div>
    </nav>
    );
}

export default Navbar;