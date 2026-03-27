import Navbar from "../components/navbar";
import CRUD from "../components/CRUD";
import TEC_logo from "../assets/TEC_logo.png";

function Home() {
    return (
        <div>
            <Navbar />
            <main>
                <section className="hero-card">
                    <div className="hero-content">
                        <div className="col-md-10 align-self-end justify-content">
                            <h1>Gestor de proyecto elaborados con sistemas solares fotovoltaicos</h1>
                        </div>
                        <div className="col-md-12 align-self-end justify-content" >
                            <span><img src={TEC_logo} alt="Logo TEC" className="hero-logo" /></span>
                        </div>
                    </div>
                </section>
                <CRUD />
            </main>
        </div>
    );
}

export default Home; 
