import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import RiderHome from "../RiderHome/RiderHome.jsx";
import DriverHome from "../DriverHome/DriverHome.jsx";

function Home() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function getCurrentUser() {
            try {
                const response = await fetch(
                    "http://localhost:8000/api/auth/me",
                    {
                        method: "GET",
                        credentials: "include"
                    }
                );

                console.log("ME status:", response.status);

                const data = await response.json();

                console.log("ME response:", data);

                if (!response.ok) {
                    console.log("Not authenticated");
                    navigate("/login");
                    return;
                }

                console.log("User received:", data.user);

                setUser(data.user);

            } catch (error) {
                console.error("ME error:", error);
                navigate("/login");
            } finally {
                setLoading(false);
            }
        }

        getCurrentUser();
    }, [navigate]);

    if (loading) {
        return (
            <div>
                Loading...
            </div>
        );
    }

    if (!user) {
        return (
            <div>
                No user found
            </div>
        );
    }

    console.log("Current role:", user.role);

    if (user.role === "driver") {
        return <DriverHome />;
    }

    if (user.role === "rider") {
        return <RiderHome />;
    }

    return (
        <div>
            Unknown role: {user.role}
        </div>
    );
}

export default Home;