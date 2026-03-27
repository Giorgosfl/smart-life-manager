import { createHashRouter, Navigate } from "react-router-dom";
import App from "./App";
import DevicesPage from "./pages/DevicesPage";
import ScenesPage from "./pages/ScenesPage";
import AutomationsPage from "./pages/AutomationsPage";
import TimersPage from "./pages/TimersPage";
import MirrorsPage from "./pages/MirrorsPage";
import SettingsPage from "./pages/SettingsPage";
import SetupWizardPage from "./pages/SetupWizardPage";

export const router = createHashRouter([
  {
    path: "/setup",
    element: <SetupWizardPage />,
  },
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/devices" replace /> },
      { path: "devices", element: <DevicesPage /> },
      { path: "scenes", element: <ScenesPage /> },
      { path: "automations", element: <AutomationsPage /> },
      { path: "timers", element: <TimersPage /> },
      { path: "mirrors", element: <MirrorsPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
