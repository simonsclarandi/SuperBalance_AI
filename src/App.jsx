import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [transacciones, setTransacciones] = useState([]);

  // Cargar transacciones desde el backend al montar el componente
  useEffect(() => {
    axios.get('http://localhost:3000/api/transacciones')
      .then(response => {
        setTransacciones(response.data);
      })
      .catch(error => {
        console.error("Error cargando transacciones:", error);
      });
  }, []);

  // Cálculos en tiempo real de las métricas financieras
  const totalIngresos = transacciones.reduce((sum, t) => 
    sum + (t.tipo === 'ingreso' ? parseFloat(t.monto) : 0), 0).toFixed(2);

  const totalEgresos = transacciones.reduce((sum, t) => 
    sum + (t.tipo === 'egreso' ? parseFloat(t.monto) : 0), 0).toFixed(2);

  const balanceNeto = (parseFloat(totalIngresos) - parseFloat(totalEgresos)).toFixed(2);

  return (
    <>
      <nav className="navbar navbar-dark bg-dark">
        <div className="container-fluid">
          <span className="navbar-brand mb-0 h1">SuperBalance AI - Panel de Control</span>
        </div>
      </nav>

      <div className="container mt-4">
        
        {/* Fila con 3 columnas para las tarjetas métricas */}
        <div className="row">
          {/* Tarjeta Ingresos Totales (Verde/Success) */}
          <div className="col-md-4 mb-4">
            <div className="card bg-success text-white">
              <div className="card-body">
                <h5 className="card-title">Ingresos Totales</h5>
                <p className="card-text fs-3">${totalIngresos}</p>
              </div>
            </div>
          </div>

          {/* Tarjeta Egresos Totales (Rojo/Danger) */}
          <div className="col-md-4 mb-4">
            <div className="card bg-danger text-white">
              <div className="card-body">
                <h5 className="card-title">Egresos Totales</h5>
                <p className="card-text fs-3">${totalEgresos}</p>
              </div>
            </div>
          </div>

          {/* Tarjeta Balance Neto (Azul/Primary) */}
          <div className="col-md-4 mb-4">
            <div className={`card ${balanceNeto >= 0 ? 'bg-primary' : 'bg-warning text-dark'} text-white`}>
              <div className="card-body">
                <h5 className="card-title">Balance Neto</h5>
                <p className="card-text fs-3">${balanceNeto}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Fila con tabla de historial */}
        <div className="row mt-5">
          <div className="col-md-12">
            <h4 className="mb-3 text-primary">Historial de Transacciones</h4>
            
            {transacciones.length === 0 ? (
              <p className="text-muted fst-italic">Aún no hay transacciones. ¡El bot está listo para recibirlas!</p>
            ) : (
              <div className="table-responsive bg-white shadow-sm rounded p-3">
                <table className="table table-striped table-hover align-middle">
                  <thead className="bg-light text-dark">
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
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{new Date(t.fecha).toLocaleDateString()}</td>
                        <td className={`badge ${t.tipo === 'ingreso' ? 'bg-success' : t.tipo === 'egreso' ? 'bg-danger' : 'bg-secondary'}`}>
                          {t.tipo}
                        </td>
                        <td>{t.categoria || '-'}</td>
                        <td>{t.descripcion || '-'}</td>
                        <td className={`text-end fw-bold ${t.tipo === 'ingreso' ? 'text-success' : t.tipo === 'egreso' ? 'text-danger' : ''}`}>
                          {parseFloat(t.monto).toFixed(2)}
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
