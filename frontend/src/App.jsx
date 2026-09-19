import React, { useState, useEffect } from "react";
import Banner from "./components/Banner";
import Navbar from "./components/Navbar";
import IntakePage from "./pages/IntakePage";
import DashboardPage from "./pages/DashboardPage";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export default function App() {
  const [activeTab, setActiveTab] = useState("intake");
  const [pendingCount, setPendingCount] = useState(0);

  const fetchPendingCount = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/triage-notes?status=PENDING`);
      if (res.ok) {
        const data = await res.json();
        setPendingCount(data.length);
      }
    } catch {
      // quiet catch on count polling
    }
  }, []);

  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 8000);
    return () => clearInterval(interval);
  }, [fetchPendingCount]);

  const handleTriageCreated = () => {
    fetchPendingCount();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F5F1] text-[#16302B]">
      {/* 1. Persistent Top Banner (visible on every page at all times) */}
      <Banner />

      {/* 2. Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
      />

      {/* 3. Main Body */}
      <main className="flex-1 w-full pb-12">
        {activeTab === "intake" ? (
          <IntakePage onTriageCreated={handleTriageCreated} />
        ) : (
          <DashboardPage onQueueUpdated={(count) => setPendingCount(count)} />
        )}
      </main>

      {/* 4. Footer */}
      <footer className="border-t py-6 bg-white text-center text-[12px] text-[#54655F]" style={{ borderColor: "#DAD6CC" }}>
        <div className="max-w-[1200px] mx-auto px-6 space-y-1">
          <p className="font-semibold text-[#16302B]">
            TriaQ • Human-in-the-Loop Clinical Triage System
          </p>
          <p>
            Designed for Primary Health Centers (PHCs), Government Clinics & Health Camps across India.
          </p>
          <p className="text-[11px] text-[#54655F]">
            Strictly non-diagnostic prototype. Deliberately auditable and explainable.
          </p>
        </div>
      </footer>
    </div>
  );
}
