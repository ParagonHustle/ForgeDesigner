import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import MainLayout from "@/components/layout/MainLayout";
import Dashboard from "@/pages/dashboard";
import Characters from "@/pages/characters";
import Dungeons from "@/pages/dungeons";
import Farming from "@/pages/farming";
import Forge from "@/pages/forge";
import BlackMarket from "@/pages/blackmarket";
import Buildings from "@/pages/buildings";
import Bounty from "@/pages/bounty";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/characters" component={Characters} />
      <Route path="/dungeons" component={Dungeons} />
      <Route path="/farming" component={Farming} />
      <Route path="/forge" component={Forge} />
      <Route path="/blackmarket" component={BlackMarket} />
      <Route path="/buildings" component={Buildings} />
      <Route path="/bounty" component={Bounty} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainLayout>
        <Router />
      </MainLayout>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
