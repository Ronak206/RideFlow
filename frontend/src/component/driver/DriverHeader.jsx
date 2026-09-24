function DriverHeader({ driver, updating, onStatus, onLogout }) {
  return (
    <header className="driver-header">
      <div>
        <h1>RiderFlow 🚗</h1>

        <p>Driver Dashboard</p>
      </div>

      <div className="driver-status">
        <span>Status:</span>

        <strong>{driver?.status || "offline"}</strong>

        <button type="button" onClick={onStatus} disabled={updating}>
          {updating
            ? "Updating..."
            : driver?.status === "online"
              ? "Go Offline"
              : "Go Online"}
        </button>

        <button type="button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

export default DriverHeader;
