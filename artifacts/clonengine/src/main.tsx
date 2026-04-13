import { createRoot } from "react-dom/client";
import { Router, Route, Switch } from "wouter";
import App from "./App";
import { Dashboard } from "./pages/Dashboard";
import Engineering from "./pages/Engineering";
import Apps from "./pages/Apps";
import Docs from "./pages/Docs";
import "./landing.css";

createRoot(document.getElementById("root")!).render(
  <Router base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
    <Switch>
      <Route path="/dashboard"   component={Dashboard} />
      <Route path="/engineering" component={Engineering} />
      <Route path="/apps"        component={Apps} />
      <Route path="/docs"        component={Docs} />
      <Route component={App} />
    </Switch>
  </Router>
);
