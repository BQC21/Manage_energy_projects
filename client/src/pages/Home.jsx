import { useEffect, useState } from "react";

import Navbar from "../components/navbar";
import { getProjectsRequest } from "../api/projects.api";

function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
    }).format(value);
}

function formatEnergy(value) {
    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);
}

function Home() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const loadProjects = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await getProjectsRequest();
                const payload = await response.json();

                if (!response.ok || !payload.success) {
                    throw new Error(payload.message || "Unable to load projects");
                }

                setProjects(Array.isArray(payload.data) ? payload.data : []);
            } catch (err) {
                setError(err.message || "Unable to load projects");
            } finally {
                setLoading(false);
            }
        };

        loadProjects();
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <Navbar />
            <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
                <section className="overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-emerald-500/20 via-cyan-500/10 to-slate-900 p-8 shadow-2xl shadow-cyan-950/40">
                    <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                        Bienvenido al gestor de proyectos solares
                    </h1>
                </section>

                <section className="grid gap-4 sm:grid-cols-3">
                    <article className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-lg shadow-slate-950/30">
                        <p className="text-sm text-slate-400">Proyectos registrados</p>
                        <p className="mt-2 text-3xl font-semibold text-white">{projects.length}</p>
                    </article>
                    <article className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-lg shadow-slate-950/30">
                        <p className="text-sm text-slate-400">Paneles instalados</p>
                        <p className="mt-2 text-3xl font-semibold text-white">
                            {projects.reduce((sum, project) => sum + project.nro_panels, 0)}
                        </p>
                    </article>
                </section>

                <section className="rounded-3xl border border-white/10 bg-slate-900/85 p-6 shadow-2xl shadow-slate-950/40">
                    <div className="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-2xl font-semibold text-white">Proyectos cargados</h2>
                            {/* <p className="text-sm text-slate-400">
                                Registros en vivo servidos por `GET /api/projects`
                            </p> */}
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-12 text-center text-slate-300">Loading projects...</div>
                    ) : null}

                    {!loading && error ? (
                        <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                            {error}
                        </div>
                    ) : null}

                    {!loading && !error && projects.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                            No projects uploaded yet.
                        </div>
                    ) : null}

                    {!loading && !error && projects.length > 0 ? (
                        <div className="mt-6 grid gap-4 lg:grid-cols-2">
                            {projects.map((project) => (
                                <article
                                    key={project.id}
                                    className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 transition hover:border-emerald-400/40 hover:bg-slate-950"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-[0.25em] text-cyan-300">
                                                Project #{project.id}
                                            </p>
                                            <h3 className="mt-2 text-xl font-semibold text-white">
                                                {project.project}
                                            </h3>
                                        </div>
                                        <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-emerald-200">
                                            {project.status}
                                        </span>
                                    </div>

                                    <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
                                        <div className="rounded-xl bg-white/5 p-3">
                                            <dt className="text-slate-400">Energy</dt>
                                            <dd className="mt-1 text-lg font-semibold text-white">
                                                {formatEnergy(project.energy_kwh)} kWh
                                            </dd>
                                        </div>
                                        <div className="rounded-xl bg-white/5 p-3">
                                            <dt className="text-slate-400">Budget</dt>
                                            <dd className="mt-1 text-lg font-semibold text-white">
                                                {formatCurrency(project.price)}
                                            </dd>
                                        </div>
                                        <div className="rounded-xl bg-white/5 p-3">
                                            <dt className="text-slate-400">Panels</dt>
                                            <dd className="mt-1 text-lg font-semibold text-white">
                                                {project.nro_panels}
                                            </dd>
                                        </div>
                                        <div className="rounded-xl bg-white/5 p-3">
                                            <dt className="text-slate-400">Updated</dt>
                                            <dd className="mt-1 text-lg font-semibold text-white">
                                                {new Date(project.updated_at).toLocaleDateString("en-US")}
                                            </dd>
                                        </div>
                                    </dl>
                                </article>
                            ))}
                        </div>
                    ) : null}
                </section>
            </main>
        </div>
    );
}

export default Home;
