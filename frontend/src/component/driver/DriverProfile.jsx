function DriverProfile({ driver }) {
  return (
    <section className="driver-profile">
      <h2>Driver Profile</h2>

      <p>
        <strong>Name:</strong> {driver?.name || "N/A"}
      </p>

      <p>
        <strong>Email:</strong> {driver?.email || "N/A"}
      </p>

      <p>
        <strong>Vehicle:</strong> {driver?.vehicleName || "N/A"}
      </p>

      <p>
        <strong>Vehicle Number:</strong>{" "}
        {driver?.vehicleNumber || driver?.vehiclePlateNumber || "N/A"}
      </p>

      <p>
        <strong>Rating:</strong> {driver?.rating ?? 0}
      </p>
    </section>
  );
}

export default DriverProfile;
