import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function SignUp() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        username: "",
        email: "",
        password: "",
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setLoading(true);

        try {
            await api.post("/auth/register", form);

            navigate("/login");
        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Registration failed"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <form className="auth-card" onSubmit={handleSubmit}>
                <h1>Create Account</h1>

                <input
                    name="username"
                    type="text"
                    placeholder="Username"
                    value={form.username}
                    onChange={handleChange}
                />

                <input
                    name="email"
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={handleChange}
                />

                <input
                    name="password"
                    type="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={handleChange}
                />

                {error && (
                    <p className="auth-error">
                        {error}
                    </p>
                )}

                <button type="submit" disabled={loading}>
                    {loading ? "Creating..." : "Sign Up"}
                </button>

                <p>
                    Already have an account?{" "}
                    <span
                        className="auth-link"
                        onClick={() => navigate("/login")}
                    >
                        Login
                    </span>
                </p>
            </form>
        </div>
    );
}

export default SignUp;