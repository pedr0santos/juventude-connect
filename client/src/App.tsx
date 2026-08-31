import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/admin" component={Home} />
    <Route path="/painel" component={Home} />
    <Route path="/jovens" component={Home} />
    <Route path="/discipuladores" component={Home} />
    <Route path="/presenca" component={Home} />
    <Route path="/faltas" component={Home} />
    <Route path="/notificacoes" component={Home} />
    <Route path="/relatorios" component={Home} />
    <Route path="/aniversarios" component={Home} />
    <Route path="/mensagens" component={Home} />
    <Route path="/configuracoes" component={Home} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
