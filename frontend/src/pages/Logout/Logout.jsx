import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL, SOCKET_URL } from "../../config/api.js";

function Logout() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    async function logout() {
      try {
        const response = await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          credentials: "include",
        });

        if (!response.ok && response.status !== 204) {
          const result = await response.json();
          setError(result.message || "Logout failed");
          return;
        }

        // Logout successful
        navigate("/login");
      } catch (error) {
        console.error(error);
        setError("Unable to connect to server");
      }
    }

    logout();
  }, [navigate]);

  if (error) {
    return (
      <div style={styles.container}>
        <p>{error}</p>

        <button onClick={() => navigate("/home")} style={styles.button}>
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <p>Logging out...</p>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    fontFamily: "Arial, sans-serif",
  },

  button: {
    padding: "10px 20px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
  },
};

export default Logout;
