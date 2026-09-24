import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL, SOCKET_URL } from "../../config/api.js";
import "./Signup.css";

function Signup() {
  const navigate = useNavigate();

  const [role, setRole] = useState("rider");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    vehicleName: "",
    vehicleNumber: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  }

  function handleRoleChange(newRole) {
    setRole(newRole);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!formData.name || !formData.email || !formData.password) {
      setError("Please fill all required fields");
      return;
    }

    if (
      role === "driver" &&
      (!formData.vehicleName || !formData.vehicleNumber)
    ) {
      setError("Please enter vehicle details");
      return;
    }

    setLoading(true);

    try {
      const data = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: role,
      };

      // Add vehicle details only for driver
      if (role === "driver") {
        data.vehicleName = formData.vehicleName;
        data.vehicleNumber = formData.vehicleNumber;
      }

      const response = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Signup failed");
        return;
      }

      // Signup successful
      navigate("/login");
    } catch (error) {
      console.error(error);
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signup-page">
      <div className="signup-card">
        <h1>RiderFlow</h1>

        <p className="subtitle">Create your account</p>

        {/* Role Selection */}
        <div className="role-selector">
          <button
            type="button"
            className={role === "rider" ? "role active" : "role"}
            onClick={() => handleRoleChange("rider")}
          >
            🚶 Rider
          </button>

          <button
            type="button"
            className={role === "driver" ? "role active" : "role"}
            onClick={() => handleRoleChange("driver")}
          >
            🚗 Driver
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div className="input-group">
            <label>Name</label>

            <input
              type="text"
              name="name"
              placeholder="Enter your name"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          {/* Email */}
          <div className="input-group">
            <label>Email</label>

            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          {/* Password */}
          <div className="input-group">
            <label>Password</label>

            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          {/* Driver Fields */}
          {role === "driver" && (
            <>
              <div className="input-group">
                <label>Vehicle Name</label>

                <input
                  type="text"
                  name="vehicleName"
                  placeholder="e.g. Toyota Innova"
                  value={formData.vehicleName}
                  onChange={handleChange}
                />
              </div>

              <div className="input-group">
                <label>Vehicle Number</label>

                <input
                  type="text"
                  name="vehicleNumber"
                  placeholder="e.g. GJ01AB1234"
                  value={formData.vehicleNumber}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          {/* Error */}
          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="signup-button" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        {/* Login */}
        <div className="login-section">
          <button
            type="button"
            className="login-button"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
          <p>Already have an account?</p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
