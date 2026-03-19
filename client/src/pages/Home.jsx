import Navbar from "../components/navbar";
import CRUD from "../components/CRUD";
import PDF_generator from "../components/PDF_generator";

function Home() {

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <Navbar />
            <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
                <section className="overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-emerald-500/20 via-cyan-500/10 to-slate-900 p-8 shadow-2xl shadow-cyan-950/40">
                    <h1 className="mt-4 max-w-6xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                        Bienvenido al gestor de proyectos solares
                    </h1>
                </section>

                <PDF_generator/>
                <CRUD/>

            </main>
        </div>
    );
}

export default Home;
