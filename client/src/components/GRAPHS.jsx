import { useEffect, useMemo, useRef } from "react";
import Chart from "chart.js/auto";

function GRAPHS({ projects = [] }) {
    const panelGoals = 300;
    const panelCurrent = useMemo(
        () => projects.reduce((sum, p) => sum + Number(p.nro_panels ?? p.Nro_panels ?? 0), 0),
        [projects]
    );
    const totalPrice = useMemo(
        () => projects.reduce((sum, p) => sum + Number(p.price ?? p.Price ?? 0), 0),
        [projects]
    );

    const barCanvasRef = useRef(null);
    const pieCanvasRef = useRef(null);
    const barChartRef = useRef(null);
    const pieChartRef = useRef(null);

    useEffect(() => {
        if (!barCanvasRef.current || !pieCanvasRef.current || projects.length === 0) {
            return;
        }

        const labels = projects.map((p) => p.project || "Proyecto");
        const lcoeData = projects.map((p) => Number(p.LCOE ?? p.lcoe ?? 0));
        const pieData = projects.map((p) => {
            const value = Number(p.price ?? p.Price ?? 0);
            if (totalPrice <= 0) return 0;
            return Number(((value / totalPrice) * 100).toFixed(2));
        });

        if (barChartRef.current) barChartRef.current.destroy();
        if (pieChartRef.current) pieChartRef.current.destroy();

        barChartRef.current = new Chart(barCanvasRef.current, {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        label: "LCOE por proyecto",
                        data: lcoeData,
                        borderWidth: 1,
                        backgroundColor: "rgba(97, 153, 239, 0.45)",
                        borderColor: "rgba(97, 153, 239, 1)",
                    },
                ],
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true },
                },
            },
        });

        pieChartRef.current = new Chart(pieCanvasRef.current, {
            type: "pie",
            data: {
                labels,
                datasets: [
                    {
                        label: "Distribucion de precio (%)",
                        data: pieData,
                        backgroundColor: [
                            "rgba(255, 99, 132, 0.35)",
                            "rgba(54, 162, 235, 0.35)",
                            "rgba(255, 205, 86, 0.35)",
                            "rgba(75, 192, 192, 0.35)",
                            "rgba(153, 102, 255, 0.35)",
                            "rgba(255, 159, 64, 0.35)",
                        ],
                        borderWidth: 1,
                    },
                ],
            },
            options: { responsive: true },
        });

        return () => {
            if (barChartRef.current) {
                barChartRef.current.destroy();
                barChartRef.current = null;
            }
            if (pieChartRef.current) {
                pieChartRef.current.destroy();
                pieChartRef.current = null;
            }
        };
    }, [projects, totalPrice]);

    return (
        <>
            <div className="tracking-bar">
                <label>Paneles instalados vs meta anual</label>
                <meter
                    value={panelCurrent}
                    min="0"
                    max={panelGoals}
                    low={panelGoals * 0.5}
                    high={panelGoals * 0.8}
                    optimum={panelGoals}
                />
                <label>
                    {panelCurrent} / {panelGoals}
                </label>
            </div>
            <div className="charts-grid">
                <div className="lcoe-bar-chart">
                    <canvas ref={barCanvasRef} />
                </div>
                <div className="price-pie-chart">
                    <canvas ref={pieCanvasRef} />
                </div>
            </div>
        </>
    );
}

export default GRAPHS;
