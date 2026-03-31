import { useEffect, useMemo, useRef } from "react";
import Chart from "chart.js/auto";

function GRAPHS({ projects = [] }) {
    const panelGoals = 300;
    const panelCurrent = useMemo(
        () => projects.reduce((sum, p) => sum + Number(p.nro_panels ?? p.Nro_panels ?? 0), 0),
        [projects]
    );

    const barCanvasRef = useRef(null);
    const priceCanvasRef = useRef(null);
    const barChartRef = useRef(null);
    const priceChartRef = useRef(null);

    useEffect(() => {
        if (!barCanvasRef.current || !priceCanvasRef.current || projects.length === 0) {
            return;
        }

        const labels = projects.map((p) => p.project || "Proyecto");
        const time_returnData = projects.map((p) => Number(p.time_retorn ?? p.Time_retorn ?? 0));
        const priceData = projects.map((p) => Number(p.price ?? p.Price ?? 0));

        if (barChartRef.current) barChartRef.current.destroy();
        if (priceChartRef.current) priceChartRef.current.destroy();

        barChartRef.current = new Chart(barCanvasRef.current, {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        label: "Tiempo de retorno por proyecto",
                        data: time_returnData,
                        borderWidth: 1,
                        backgroundColor: "rgba(97, 153, 239, 0.45)",
                        borderColor: "rgba(97, 153, 239, 1)",
                    },
                ],
            },
            options: {
                responsive: true,
                indexAxis: "y",
                scales: {
                    x: { beginAtZero: true },
                },
            },
        });

        priceChartRef.current = new Chart(priceCanvasRef.current, {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        label: "Precio por proyecto",
                        data: priceData,
                        backgroundColor: "rgba(93, 168, 134, 0.45)",
                        borderColor: "rgba(93, 168, 134, 1)",
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                responsive: true,
                indexAxis: "y",
                scales: {
                    x: { beginAtZero: true },
                },
            },
        });

        return () => {
            if (barChartRef.current) {
                barChartRef.current.destroy();
                barChartRef.current = null;
            }
            if (priceChartRef.current) {
                priceChartRef.current.destroy();
                priceChartRef.current = null;
            }
        };
    }, [projects]);

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
                <div className="lcoe-bar-chart"> {/* Time return Bar Chart */}
                    <canvas ref={barCanvasRef} />
                </div>
                <div className="price-bar-chart">
                    <canvas ref={priceCanvasRef} />
                </div>
            </div>
        </>
    );
}

export default GRAPHS;
