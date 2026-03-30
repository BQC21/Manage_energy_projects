import React from "react";
import ReactDOM from "react-dom/client";

import "./styles/index.css";
import "./styles/navbar.css";
import "./styles/auth.css";
import "./styles/graphs.css";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
