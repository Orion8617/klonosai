import { createRoot } from "react-dom/client";
import { Router, Route, Switch } from "wouter";
import App from "./App";
import { Dashboard } from "./pages/Dashboard";
import "./landing.css";

createRoot(document.getElementById("root")!).render(
  <Router base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
    <Switch>
      <Route path="/dashboard" component={Dashboard} />
      <Route component={App} />
    </Switch>
  </Router>
);
