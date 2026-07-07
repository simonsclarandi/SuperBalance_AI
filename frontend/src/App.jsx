import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function App() {
  const [transacciones, setTransacciones] = useState([]);

  // Cargar transacciones desde el backend
  useEffect(() => {
    axios.get('https://superbalance-ai.onrender.com/api/transacciones')
      .then(response => {
        setTransacciones(response.data);
      })
      .catch(error => {
        console.error("Error cargando transacciones:", error);
      });
  }, []);

  // Función de formateo de moneda (Estilo Argentina: $ XX.XXX,XX)
  const formatMoneda = (valor) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(valor);
  };

  // Cálculos numéricos directos para evitar inconsistencias de strings
  const ingresosNumerico = transacciones
    .filter(t => t.tipo === 'ingreso')
    .reduce((sum, t) => sum + parseFloat(t.monto), 0);

  const egresosNumerico = transacciones
    .filter(t => t.tipo === 'egreso')
    .reduce((sum, t) => sum + parseFloat(t.monto), 0);

  const balanceNumerico = ingresosNumerico - egresosNumerico;

  // --- CONFIGURACIÓN DE GRÁFICOS ---
  
  // 1. Gráfico de Barras: Comparativa General
  const barData = {
    labels: ['Ingresos', 'Egresos'],
    datasets: [
      {
        label: 'Balance General',
        data: [ingresosNumerico, egresosNumerico],
        backgroundColor: ['rgba(40, 167, 69, 0.7)', 'rgba(220, 53, 69, 0.7)'],
        borderColor: ['#28a745', '#dc3545'],
        borderWidth: 1,
      },
    ],
  };

  // 2. Gráfico de Torta (Doughnut): Distribución de Gastos por Categoría
  const gastosPorCategoria = transacciones
    .filter(t => t.tipo === 'egreso')
    .reduce((acc, t) => {
      const cat = t.categoria || 'Otros';
      acc[cat] = (acc[cat] || 0) + parseFloat(t.monto);
      return acc;
    }, {});

  const doughnutData = {
    labels: Object.keys(gastosPorCategoria),
    datasets: [
      {
        data: Object.values(gastosPorCategoria),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <>
      <nav className="navbar navbar-dark bg-dark shadow-sm">
        <div className="container-fluid">
          <span className="navbar-brand mb-0 h1 fw-bold">🚀 SuperBalance AI - Panel Ejecutivo</span>
        </div>
      </nav>

      <div className="container mt-4">
        {/* FILA DE METRICAS PRINCIPALES */}
        <div className="row">
          <div className="col-md-4 mb-4">
            <div className="card bg-success text-white shadow-sm border-0">
              <div className="card-body p-4">
                <h6 className="text-uppercase opacity-75 fw-bold">Ingresos Totales</h6>
                <p className="fs-2 fw-bold mb-0">{formatMoneda(ingresosNumerico)}</p>
              </div>
            </div>
          </div>

          <div className="col-md-4 mb-4">
            <div className="card bg-danger text-white shadow-sm border-0">
              <div className="card-body p-4">
                <h6 className="text-uppercase opacity-75 fw-bold">Egresos Totales</h6>
                <p className="fs-2 fw-bold mb-0">{formatMoneda(egresosNumerico)}</p>
              </div>
            </div>
          </div>

          <div className="col-md-4 mb-4">
            <div className={`card ${balanceNumerico >= 0 ? 'bg-primary' : 'bg-warning text-dark'} text-white shadow-sm border-0`}>
              <div className="card-body p-4">
                <h6 className="text-uppercase opacity-75 fw-bold">Balance Neto</h6>
                <p className="fs-2 fw-bold mb-0">{formatMoneda(balanceNumerico)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN DE GRÁFICOS (Solo se muestran si hay datos) */}
        {transacciones.length > 0 && (
          <div className="row mt-2 mb-5">
            <div className="col-md-6 mb-4">
              <div className="card shadow-sm p-4 h-100 bg-white rounded border-0">
                <h5 className="text-secondary fw-bold mb-3">Comparativa de Flujos de Caja</h5>
                <div style={{ maxHeight: '280px', position: 'relative' }}>
                  <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
              </div>
            </div>

            <div className="col-md-6 mb-4">
              <div className="card shadow-sm p-4 h-100 bg-white rounded border-0">
                <h5 className="text-secondary fw-bold mb-3">Distribución de Egresos por Categoría</h5>
                <div style={{ maxHeight: '280px', position: 'relative' }}>
                  {Object.keys(gastosPorCategoria).length > 0 ? (
                    <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false }} />
                  ) : (
                    <p className="text-muted fst-italic text-center pt-5">No hay egresos registrados para graficar.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HISTORIAL DE TRANSACCIONES */}
        <div className="row">
          <div className="col-md-12 mb-5">
            <h4 className="mb-3 text-primary fw-bold">Historial de Transacciones</h4>

            {transacciones.length === 0 ? (
              <p className="text-muted fst-italic">Aún no hay transacciones. ¡El bot de Telegram está listo para recibirlas!</p>
            ) : (
              <div className="table-responsive bg-white shadow-sm rounded-3 p-3 border">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light text-secondary">
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Fecha</th>
                      <th scope="col">Tipo</th>
                      <th scope="col">Categoría</th>
                      <th scope="col">Descripción</th>
                      <th scope="col" className="text-end">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transacciones.map((t, index) => (
                      <tr key={t.id || index}>
                        <td>{index + 1}</td>
                        <td>{new Date(t.fecha_registro).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge rounded-pill ${t.tipo === 'ingreso' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                            {t.tipo.toUpperCase()}
                          </span>
                        </td>
                        <td className="text-capitalize">{t.categoria || '-'}</td>
                        <td>{t.descripcion || '-'}</td>
                        <td className={`text-end fw-bold ${t.tipo === 'ingreso' ? 'text-success' : 'text-danger'}`}>
                          {formatMoneda(t.monto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  );
}

export default App;