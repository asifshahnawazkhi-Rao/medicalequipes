"use client";

import { useEffect, useState } from "react";
import { clearSession, getStoredSession } from "../auth";

export default function Dashboard() {
  const [email, setEmail] = useState<string | undefined>();

  useEffect(() => {
    const session = getStoredSession();

    if (!session?.access_token) {
      window.location.replace("/");
      return;
    }

    setEmail(session.user?.email);
  }, []);

  function logout() {
    clearSession();
    window.location.assign("/");
  }

  return (
    <main className="dashboardPage">
      <section className="dashboardCard">
        <div className="brand">
          <span className="brandMark">+</span>
          <span>
            Medical<span>Equipes</span>
          </span>
        </div>

        <h1>Dashboard</h1>

        <p>
          Welcome{email ? `, ${email}` : ""}. You are logged in.
        </p>

        <button
          className="primary"
          type="button"
          onClick={() => window.location.assign("/profile")}
        >
          Complete / Edit Profile
        </button>

        <button
          type="button"
          onClick={logout}
        >
          Logout
        </button>
      </section>
    </main>
  );
}
