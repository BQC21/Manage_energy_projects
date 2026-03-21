import { NavLink } from "react-router-dom";

import { useEffect, useRef } from 'react';
import Typed from 'typed.js';

function useTypewriterEffect() {
    const el = useRef(null);

    useEffect(() => {
    const typed = new Typed(el.current, {
        strings: ['TEC Energías Renovables', 
            'Transformando el futuro con energía solar',
            'Energía limpia, gestión eficiente'],
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
        <header>
            <nav>
                <div className="typewriter-container">
                    <h2 ref={typewriterRef}></h2>
                </div>

                <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>
                    PRINCIPAL
                </NavLink>
            </nav>
        </header>
    );
}

export default Navbar;
