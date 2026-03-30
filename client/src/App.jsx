import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import Home from "./pages/Home";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Validation from "./pages/validation.jsx";
import UpdatePassword from "./pages/update_password.jsx";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={(
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            )}
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/validation" element={<Validation />} />
          <Route path="/update_password" element={<UpdatePassword />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
