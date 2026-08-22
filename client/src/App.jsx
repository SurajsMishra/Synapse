import { BrowserRouter, Routes, Route } from "react-router-dom";

import IDE from "./pages/IDE";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import NewProject from "./pages/NewProject";
import Protected from "./utils/Protected";

function App() {
    return (
        <BrowserRouter>
            <Routes>

                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                {/* Protected Dashboard */}
                <Route
                    path="/"
                    element={
                        <Protected>
                            <Dashboard />
                        </Protected>
                    }
                />

                {/* Create Project */}
                <Route
                    path="/projects/new"
                    element={
                        <Protected>
                            <NewProject />
                        </Protected>
                    }
                />

                {/* IDE */}
                <Route
                    path="/ide/:projectId"
                    element={
                        <Protected>
                            <IDE />
                        </Protected>
                    }
                />

            </Routes>
        </BrowserRouter>
    );
}

export default App;