import { NavLink } from "react-router-dom";

import { useEffect, useRef } from 'react';
import Typed from 'typed.js';

function useTypewriterEffect() {
    const el = useRef(null);

    useEffect(() => {
    const typed = new Typed(el.current, {
        strings: ['TEC Energy Solutions S.A.C', 
            'Energía para un futuro sostenible'],
        typeSpeed: 50,
        backSpeed: 50,
        loop: true,
    });

    return () => {
        // Destroy Typed instance during cleanup to stop animation
        typed.destroy();
    };
    }, []);

    return el;
}

function Navbar() {
    const typewriterRef = useTypewriterEffect();
    return (
        <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/85 backdrop-blur">
            <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                <div className="typewriter-container">
                    <h2 ref={typewriterRef}></h2>
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
