import { NavLink } from "react-router-dom";


function Navbar() {
    return (
        <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/85 backdrop-blur">
            <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">
                        Manage Energy
                    </p>
                    <span className="mt-1 block text-lg font-semibold text-white">
                        Project manager
                    </span>
                </div>

                <NavLink
                    className={({ isActive }) =>
                        `rounded-full px-4 py-2 text-sm font-medium transition ${
                            isActive
                                ? "bg-emerald-400 text-slate-950"
                                : "text-slate-300 hover:bg-white/5 hover:text-white"
                        }`
                    }
                    to="/"
                >
                    Home
                </NavLink>
            </nav>
        </header>
    );
}

export default Navbar;
