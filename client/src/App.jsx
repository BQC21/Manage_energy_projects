import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";


function App() {
  return (
    // <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* <Route path="/login" element={<Login />} /> */}
          {/* <Route path="/register" element={<Register />} /> */}
          <Route path="/" element={
            // <ProtectedRoute>
              <Home />
            // </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    // </AuthProvider>
  );
}

export default App;