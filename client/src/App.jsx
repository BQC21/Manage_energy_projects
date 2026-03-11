import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";


function App() {
  return (
    // <AuthProvider>
        <Routes>
          {/* <Route path="/login" element={<Login />} /> */}
          {/* <Route path="/register" element={<Register />} /> */}
          <Route path="/" element={
            // <ProtectedRoute>
              <Home />
            // </ProtectedRoute>
          } />
        </Routes>
    // </AuthProvider>
  );
}

export default App;
